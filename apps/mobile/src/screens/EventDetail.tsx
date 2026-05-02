import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  ImageSourcePropType,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  Tag,
  Users,
} from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";

import { PageLoader } from "../components/ui/page-loader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { ErrorState } from "../components/ui/error-state";
import { EmptyState } from "../components/ui/empty-state";
import {
  TicketSelector,
  tierKey,
  type TierKey,
} from "../components/ui/ticket-selector";

import { useAuth } from "../hooks/useAuth";
import {
  useCreateEventPaymentIntent,
  useEvent,
  useJoinWaitlist,
  useMyRegistrations,
  useRegisterForEvent,
} from "../hooks/useEvents";
import { toast } from "../lib/toast";
import { useColors } from "../theme/colors";
import {
  isNativeRazorpayAvailable,
  openRazorpayCheckout,
} from "../lib/payments/razorpayCheckout";
import type { RazorpayCheckoutOptions } from "../lib/payments/razorpayCheckout";
import { RazorpayWebView } from "../lib/payments/RazorpayWebView";
import type { AppEvent, AppTicketTier } from "../store/api/eventsApi";
import { promptAddToCalendar } from "../utils/calendar";

/**
 * EventDetail — Phase 2 frontend.
 *
 * Routing rules (mirrors backend's eventDecorator):
 *   • event.is_legacy === true → render legacy single-price UI.
 *   • No real (non-virtual) tiers → render legacy single-price UI.
 *   • Otherwise → render TicketSelector with tiered UI.
 *
 * The bottom CTA (Buy Now / Register / Register Free / Join Waitlist) is
 * computed from the currently-selected tier so we never show conflicting
 * actions, satisfying the "do NOT show ticket_price + tiers together" rule.
 */

// ─── Helpers ──────────────────────────────────────────────────────────

function pickRealTiers(event: AppEvent | undefined): AppTicketTier[] {
  if (!event) return [];
  const tiers = Array.isArray(event.ticket_tiers) ? event.ticket_tiers : [];
  return tiers.filter((t) => !t.is_virtual);
}

function isLegacyMode(event: AppEvent | undefined): boolean {
  if (!event) return true;
  if (event.is_legacy === true) return true;
  return pickRealTiers(event).length === 0;
}

function legacyIsFree(event: AppEvent | undefined): boolean {
  return !event?.ticket_price || event.ticket_price === 0;
}

// ─── Component ────────────────────────────────────────────────────────

const EventDetail = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id = route?.params?.id;
  const colors = useColors();

  const {
    data: event,
    isLoading,
    isError,
    refetch: refetchEvent,
  } = useEvent(id || "");
  const registerMutation = useRegisterForEvent();
  const paymentIntentMutation = useCreateEventPaymentIntent();
  const waitlistMutation = useJoinWaitlist();
  const { user } = useAuth();
  const { registrations, refetch: refetchRegistrations } = useMyRegistrations();

  const existingPass = useMemo(
    () =>
      registrations.find((r: any) => String(r.event_id) === String(id)),
    [registrations, id],
  );

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchEvent(), refetchRegistrations()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchEvent, refetchRegistrations]);

  // Tier selection state — only meaningful when there are real tiers.
  const realTiers = useMemo(() => pickRealTiers(event), [event]);
  const legacy = isLegacyMode(event);

  // Default tier MUST satisfy: not sold out AND is_on_sale AND is_active.
  // Falls back to first sellable, then to the first row so the UI still
  // renders something meaningful when everything is unavailable.
  const initialTierKey: TierKey | null = useMemo(() => {
    if (legacy) return null;
    const firstSelectable = realTiers.find(
      (t) => t.is_on_sale && !t.is_sold_out && t.is_active,
    );
    const fallback = firstSelectable ?? realTiers[0];
    return fallback ? tierKey(fallback) : null;
  }, [legacy, realTiers]);

  const [selectedTierKey, setSelectedTierKey] = useState<TierKey | null>(
    initialTierKey,
  );
  // Re-sync selection if the event payload changes (refresh, refetch).
  React.useEffect(() => {
    setSelectedTierKey(initialTierKey);
  }, [initialTierKey]);

  const selectedTier = useMemo(
    () =>
      legacy
        ? null
        : realTiers.find((t) => tierKey(t) === selectedTierKey) ?? null,
    [legacy, realTiers, selectedTierKey],
  );

  // Quantity is clamped on every tier change so we never exceed the new
  // tier's max/available; if the previous quantity is still valid we keep it
  // (avoids forcing the user back to 1 when switching tiers).
  const [quantity, setQuantity] = useState(1);
  React.useEffect(() => {
    if (!selectedTier) {
      setQuantity(1);
      return;
    }
    const min = selectedTier.min_per_order ?? 1;
    const cap = Math.max(
      min,
      Math.min(
        selectedTier.max_per_order ?? 10,
        selectedTier.quantity_available ?? selectedTier.max_per_order ?? 10,
      ),
    );
    setQuantity((q) => Math.min(Math.max(q, min), cap));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTier?.id]);

  // Local UX state — protects against double-tap and exposes payment retry.
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [waitlistAlreadyJoined, setWaitlistAlreadyJoined] = useState(false);

  // Razorpay WebView fallback state
  const [registration, setRegistration] = useState<any>(null);
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [webViewOptions, setWebViewOptions] =
    useState<RazorpayCheckoutOptions | null>(null);

  // ─── Action handlers ────────────────────────────────────────────────

  const completeRegistration = useCallback(
    async (paymentPayload?: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => {
      if (!event) return;
      const tierIdForCall =
        !legacy && selectedTier?.id ? selectedTier.id : null;
      const ticketCount = legacy ? 1 : quantity;
      const result = await registerMutation.mutateAsync({
        event_id: id!,
        ticket_count: ticketCount,
        tier_id: tierIdForCall,
        payment: paymentPayload,
      });
      console.log(
        "[EventDetail.completeRegistration] SUCCESS — regId:",
        result.id,
        "qr:",
        result.qr_code,
      );
      setRegistration(result);
      toast.success("Registration successful! Your QR pass is ready");
      if (event) {
        promptAddToCalendar({
          title: event.title,
          date: event.date,
          time: event.time,
          end_date: event.end_date,
          location: event.location,
          description: event.description,
        });
      }
    },
    [event, legacy, selectedTier, quantity, id, registerMutation],
  );

  const startPaidCheckout = useCallback(
    async (
      amountInPaisa: number,
      orderInfo: {
        key_id: string;
        order_id: string;
        currency: string;
        event_title: string;
      },
    ) => {
      if (!event) return false;
      const checkoutOptions: RazorpayCheckoutOptions = {
        key: orderInfo.key_id,
        amount: amountInPaisa,
        currency: orderInfo.currency,
        order_id: orderInfo.order_id,
        name: event.title || "Event Ticket",
        description: `Ticket for ${orderInfo.event_title}`,
        prefill: {
          name: user?.name || undefined,
          contact: user?.phone || undefined,
        },
        theme: { color: colors.primary },
      };

      if (isNativeRazorpayAvailable()) {
        try {
          const res = await openRazorpayCheckout(checkoutOptions);
          await completeRegistration(res);
          return true;
        } catch (nativeErr: any) {
          if (/null|undefined|not a function/i.test(nativeErr?.message || "")) {
            setWebViewOptions(checkoutOptions);
            setWebViewVisible(true);
            return true;
          }
          throw nativeErr;
        }
      }
      setWebViewOptions(checkoutOptions);
      setWebViewVisible(true);
      return true;
    },
    [event, user, colors.primary, completeRegistration],
  );

  const handleRegisterPress = useCallback(async () => {
    if (!user) {
      toast.error("Please sign in to register");
      navigation.navigate("Auth");
      return;
    }
    if (!event) return;
    // Guard against double-taps / re-entry from rapid presses.
    if (isProcessing) {
      console.log("[EventDetail.handleRegisterPress] ignored — already processing");
      return;
    }
    setIsProcessing(true);
    setPaymentError(null);

    try {
      if (legacy) {
        const free = legacyIsFree(event);
        if (free) {
          await completeRegistration();
          return;
        }
        const intent = await paymentIntentMutation.mutateAsync({
          event_id: id!,
          ticket_count: 1,
        });
        await startPaidCheckout(intent.amount, {
          key_id: intent.key_id,
          order_id: intent.order_id,
          currency: intent.currency,
          event_title: intent.event_title,
        });
        return;
      }

      if (!selectedTier) {
        toast.error("Please pick a ticket");
        return;
      }
      if (selectedTier.is_free) {
        await completeRegistration();
        return;
      }
      const intent = await paymentIntentMutation.mutateAsync({
        event_id: id!,
        ticket_count: quantity,
        tier_id: selectedTier.id ?? undefined,
      });
      await startPaidCheckout(intent.amount, {
        key_id: intent.key_id,
        order_id: intent.order_id,
        currency: intent.currency,
        event_title: intent.event_title,
      });
    } catch (err: any) {
      console.log(
        "[EventDetail.handleRegisterPress] ERROR:",
        err?.status,
        err?.data?.error || err?.message,
      );
      if (
        err?.code === 0 ||
        /cancel/i.test(err?.description || err?.message || "")
      ) {
        setPaymentError("Payment cancelled. You can try again.");
        toast.error("Payment cancelled");
        return;
      }
      if (err?.status === 409) {
        toast.error(err?.data?.error || "Already registered");
        return;
      }
      const msg = err?.data?.error || err?.message || "Registration failed";
      setPaymentError(msg);
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  }, [
    user,
    event,
    legacy,
    selectedTier,
    quantity,
    id,
    isProcessing,
    paymentIntentMutation,
    startPaidCheckout,
    completeRegistration,
    navigation,
  ]);

  const handleJoinWaitlist = useCallback(async () => {
    if (!user) {
      toast.error("Please sign in to join the waitlist");
      navigation.navigate("Auth");
      return;
    }
    // Spam protection — single in-flight join only.
    if (waitlistMutation.isPending || isProcessing) {
      console.log("[EventDetail.handleJoinWaitlist] ignored — busy");
      return;
    }
    setIsProcessing(true);
    try {
      const res = await waitlistMutation.mutateAsync({
        event_id: id!,
        ticket_count: legacy ? 1 : quantity,
      });
      console.log(
        "[EventDetail.handleJoinWaitlist] SUCCESS — pos:",
        res.position,
      );
      setWaitlistPosition(res.position);
      setWaitlistAlreadyJoined(false);
      toast.success(
        `Joined waitlist — position #${res.position}. We'll notify you if a seat opens.`,
      );
      await refetchEvent();
    } catch (err: any) {
      console.log(
        "[EventDetail.handleJoinWaitlist] ERROR:",
        err?.data?.error || err?.message,
      );
      // Backend returns 409 with code ALREADY_ON_WAITLIST when re-joining.
      if (
        err?.status === 409 ||
        /already/i.test(err?.data?.error || err?.message || "")
      ) {
        setWaitlistAlreadyJoined(true);
        toast.error("You're already on the waitlist");
        return;
      }
      toast.error(
        err?.data?.error || err?.message || "Could not join waitlist",
      );
    } finally {
      setIsProcessing(false);
    }
  }, [
    user,
    id,
    legacy,
    quantity,
    isProcessing,
    waitlistMutation,
    refetchEvent,
    navigation,
  ]);

  // ─── Render: loading / error / not-found ────────────────────────────

  if (isLoading) {
    return <PageLoader />;
  }
  if (isError) {
    return (
      <View className="flex-1 bg-background">
        <ErrorState
          title="Couldn't load event"
          message="Check your connection and try again."
          onRetry={() => refetchEvent()}
        />
      </View>
    );
  }
  if (!event) {
    return (
      <View className="flex-1 bg-background">
        <EmptyState
          icon={<Text className="text-5xl">😕</Text>}
          title="Event not found"
          message="This event may have been removed or moved."
          actionLabel="Back to Events"
          onAction={() => navigation.navigate("Events")}
        />
      </View>
    );
  }

  // ─── Render: success QR view after fresh registration ───────────────

  if (registration) {
    return (
      <SuccessQrView
        event={event}
        registration={registration}
        onBack={() => navigation.navigate("Events")}
      />
    );
  }

  // ─── Render: main detail view ──────────────────────────────────────

  const eventCancelled =
    (event as any).status === "cancelled" || !!event.cancelled_at;
  const venueImages = Array.isArray((event as any).venue_images)
    ? ((event as any).venue_images as string[])
    : [];
  const companyLogo =
    typeof (event as any).company_logo === "string" && (event as any).company_logo.trim()
      ? (event as any).company_logo
      : null;
  const hasHeroMedia = venueImages.length > 0 || !!companyLogo;
  const heroImageSources: ImageSourcePropType[] = venueImages.length > 0
    ? venueImages.map((uri) => ({ uri }))
    : companyLogo
      ? [{ uri: companyLogo }]
      : [];

  return (
    <View className="flex-1 bg-background">
      <View className="bg-primary px-4 py-4 flex-row items-center gap-2">
        <Pressable
          onPress={() => navigation.goBack()}
          className="flex-row items-center gap-2"
        >
          <ArrowLeft size={20} color={colors.primaryForeground} />
          <Text className="font-medium text-primary-foreground">Back</Text>
        </Pressable>
      </View>

      <View className="h-48 bg-primary/10 overflow-hidden">
        {hasHeroMedia ? (
          <VenueImageSlider images={heroImageSources} />
        ) : (
          <View className="flex-1 items-center justify-center px-4">
            <Image
              source={require("../../assets/Instantlly_Logo-removebg.png")}
              style={{ width: 118, height: 118 }}
              resizeMode="contain"
            />
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        className="px-4 -mt-6"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <Card>
          <CardContent className="p-5 gap-4">
            <View>
              <View className="flex-row items-center gap-2 mb-2 flex-wrap">
                {legacy ? (
                  legacyIsFree(event) ? (
                    <Badge className="bg-success/10 text-success border-none text-xs">
                      FREE
                    </Badge>
                  ) : (
                    <Badge className="bg-accent/10 text-accent border-none text-xs font-bold">
                      ₹{event.ticket_price}
                    </Badge>
                  )
                ) : (
                  <Badge className="bg-accent/10 text-accent border-none text-xs font-bold">
                    Multiple ticket types
                  </Badge>
                )}
                {eventCancelled ? (
                  <Badge className="bg-destructive/10 text-destructive border-none text-xs">
                    Cancelled
                  </Badge>
                ) : null}
              </View>
              <Text className="text-xl font-bold text-foreground">
                {event.title}
              </Text>
            </View>

            <View className="rounded-xl bg-muted p-4 gap-3">
              <View className="flex-row gap-3">
                <View className="flex-1 flex-row items-start gap-2">
                  <Calendar size={15} color={colors.primary} />
                  <View className="flex-1">
                    <Text className="text-[10px] text-muted-foreground uppercase tracking-wide">Date</Text>
                    <Text className="text-sm text-foreground font-medium">
                      {new Date(event.date).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View className="flex-1 flex-row items-start gap-2">
                  <Clock size={15} color={colors.primary} />
                  <View className="flex-1">
                    <Text className="text-[10px] text-muted-foreground uppercase tracking-wide">Time</Text>
                    <Text className="text-sm text-foreground font-medium">{event.time}</Text>
                  </View>
                </View>
              </View>
              {(event.venue || event.location || event.max_attendees) ? (
                <View className="flex-row gap-3">
                  {event.venue || event.location ? (
                    <View className="flex-1 flex-row items-start gap-2">
                      <MapPin size={15} color={colors.primary} />
                      <View className="flex-1">
                        <Text className="text-[10px] text-muted-foreground uppercase tracking-wide">Location</Text>
                        <Text className="text-sm text-foreground font-medium" numberOfLines={2}>
                          {event.venue || event.location}
                        </Text>
                      </View>
                    </View>
                  ) : <View className="flex-1" />}
                  {event.max_attendees ? (
                    <View className="flex-1 flex-row items-start gap-2">
                      <Users size={15} color={colors.primary} />
                      <View className="flex-1">
                        <Text className="text-[10px] text-muted-foreground uppercase tracking-wide">Capacity</Text>
                        <Text className="text-sm text-foreground font-medium">
                          {event.attendee_count || 0}/{event.max_attendees}
                        </Text>
                      </View>
                    </View>
                  ) : <View className="flex-1" />}
                </View>
              ) : null}
              {event.business ? (
                <View className="flex-row items-start gap-2">
                  <Tag size={15} color={colors.primary} />
                  <View>
                    <Text className="text-[10px] text-muted-foreground uppercase tracking-wide">Organiser</Text>
                    <Text className="text-sm text-foreground font-medium">
                      {event.business.company_name || event.business.full_name}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            {event.description ? (
              <View>
                <Text className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                  About
                </Text>
                <Text className="text-sm text-foreground leading-5">
                  {event.description}
                </Text>
              </View>
            ) : null}
          </CardContent>
        </Card>

        {/* Payment retry banner — surfaced after a failed/cancelled checkout
             so users can retry without scrolling around the card. */}
        {paymentError ? (
          <Card className="mt-4 border-destructive/40">
            <CardContent className="p-4 gap-3">
              <View className="flex-row items-start gap-2">
                <Text className="text-base">{"\u274C"}</Text>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-destructive">
                    Payment failed
                  </Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">
                    {paymentError}
                  </Text>
                </View>
              </View>
              <Button
                size="sm"
                onPress={() => {
                  setPaymentError(null);
                  void handleRegisterPress();
                }}
                disabled={isProcessing}
              >
                {isProcessing ? "Retrying…" : "Try Again"}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {/* Waitlist confirmation / already-joined banner. */}
        {waitlistPosition !== null ? (
          <Card className="mt-4 border-success/40">
            <CardContent className="p-4 gap-1">
              <Text className="text-sm font-semibold text-success">
                ✅ Joined waitlist
              </Text>
              <Text className="text-xs text-muted-foreground">
                Position: #{waitlistPosition}. We'll notify you if a seat opens.
              </Text>
            </CardContent>
          </Card>
        ) : waitlistAlreadyJoined ? (
          <Card className="mt-4 border-warning/40">
            <CardContent className="p-4 gap-1">
              <Text className="text-sm font-semibold text-warning">
                You're already on the waitlist
              </Text>
              <Text className="text-xs text-muted-foreground">
                We'll notify you as soon as a seat opens up.
              </Text>
            </CardContent>
          </Card>
        ) : null}

        {existingPass ? (
          <Card className="mt-4">
            <CardContent className="p-5 gap-3">
              <View className="flex-row items-center gap-2 bg-success/10 rounded-xl p-4">
                <CheckCircle size={20} color={colors.success} />
                <View className="flex-1">
                  <Text className="text-sm font-bold text-success">
                    Already Registered
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    You have a pass for this event
                  </Text>
                </View>
              </View>
              {existingPass.qr_code ? (
                <View className="items-center bg-muted/30 rounded-xl p-4 gap-2 border border-dashed border-border">
                  <View className="bg-white p-3 rounded-xl">
                    <QRCode value={existingPass.qr_code} size={160} />
                  </View>
                  <Text className="text-[10px] text-muted-foreground font-mono">
                    {existingPass.qr_code}
                  </Text>
                </View>
              ) : null}
              <Button
                variant="outline"
                className="w-full"
                onPress={() => navigation.navigate("MyPasses")}
              >
                View All Passes
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-4">
            <CardContent className="p-5 gap-4">
              {legacy ? (
                <LegacyTicketBlock
                  event={event}
                  onRegister={handleRegisterPress}
                  busy={
                    isProcessing ||
                    registerMutation.isPending ||
                    paymentIntentMutation.isPending
                  }
                  cancelled={eventCancelled}
                  onJoinWaitlist={handleJoinWaitlist}
                  waitlistBusy={isProcessing || waitlistMutation.isPending}
                />
              ) : (
                <TieredTicketBlock
                  tiers={realTiers}
                  selectedTierKey={selectedTierKey}
                  onSelectTier={setSelectedTierKey}
                  quantity={quantity}
                  onQuantityChange={setQuantity}
                  onRegister={handleRegisterPress}
                  onJoinWaitlist={handleJoinWaitlist}
                  busy={
                    isProcessing ||
                    registerMutation.isPending ||
                    paymentIntentMutation.isPending
                  }
                  waitlistBusy={isProcessing || waitlistMutation.isPending}
                  cancelled={eventCancelled}
                  selectedTier={selectedTier}
                />
              )}
            </CardContent>
          </Card>
        )}
      </ScrollView>

      {webViewVisible && webViewOptions ? (
        <RazorpayWebView
          visible={webViewVisible}
          options={webViewOptions}
          onSuccess={async (data) => {
            setWebViewVisible(false);
            setWebViewOptions(null);
            try {
              await completeRegistration(data);
            } catch (err: any) {
              toast.error(
                err?.data?.error ||
                  err?.message ||
                  "Registration failed after payment",
              );
            }
          }}
          onCancel={() => {
            setWebViewVisible(false);
            setWebViewOptions(null);
            toast.error("Payment cancelled");
          }}
          onError={(msg) => {
            setWebViewVisible(false);
            setWebViewOptions(null);
            toast.error(msg || "Payment failed");
          }}
        />
      ) : null}
    </View>
  );
};

// ─── Sub-views ────────────────────────────────────────────────────────

interface LegacyBlockProps {
  event: AppEvent;
  onRegister: () => void;
  onJoinWaitlist: () => void;
  busy: boolean;
  cancelled: boolean;
  waitlistBusy: boolean;
}

function VenueImageSlider({ images }: { images: ImageSourcePropType[] }) {
  const { width, height } = Dimensions.get("window");
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const viewerScrollRef = useRef<ScrollView>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(idx);
  };

  const onViewerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setViewerIndex(idx);
  };

  const openViewer = (idx: number) => {
    setViewerIndex(idx);
    setViewerOpen(true);
    setTimeout(() => {
      viewerScrollRef.current?.scrollTo({ x: idx * width, animated: false });
    }, 50);
  };

  return (
    <View className="w-full h-48">
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={{ width, height: 192 }}
      >
        {images.map((source, i) => (
          <Pressable key={i} onPress={() => openViewer(i)}>
            <Image source={source} style={{ width, height: 192 }} resizeMode="cover" />
          </Pressable>
        ))}
      </ScrollView>
      {images.length > 1 ? (
        <View className="absolute bottom-2 left-0 right-0 flex-row justify-center gap-1">
          {images.map((_, i) => (
            <View
              key={i}
              className={`h-1.5 rounded-full ${i === activeIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"}`}
            />
          ))}
        </View>
      ) : null}

      <Modal visible={viewerOpen} transparent animationType="fade" onRequestClose={() => setViewerOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)" }}>
          <ScrollView
            ref={viewerScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onViewerScroll}
            style={{ flex: 1 }}
          >
            {images.map((source, i) => (
              <Pressable key={i} onPress={() => setViewerOpen(false)} style={{ width, height, justifyContent: "center", alignItems: "center" }}>
                <Image source={source} style={{ width, height: height * 0.85 }} resizeMode="contain" />
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            onPress={() => setViewerOpen(false)}
            style={{ position: "absolute", top: 40, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }}
          >
            <Text style={{ color: "white", fontSize: 22, fontWeight: "600" }}>{"\u00D7"}</Text>
          </Pressable>
          {images.length > 1 ? (
            <View style={{ position: "absolute", bottom: 40, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 }}>
              {images.map((_, i) => (
                <View
                  key={i}
                  style={{ height: 8, borderRadius: 4, width: i === viewerIndex ? 20 : 8, backgroundColor: i === viewerIndex ? "#fff" : "rgba(255,255,255,0.4)" }}
                />
              ))}
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function LegacyTicketBlock({
  event,
  onRegister,
  onJoinWaitlist,
  busy,
  cancelled,
  waitlistBusy,
}: LegacyBlockProps) {
  const free = legacyIsFree(event);
  const isFull =
    !!event.max_attendees && (event.attendee_count ?? 0) >= event.max_attendees;

  if (cancelled) {
    return (
      <View>
        <Text className="text-base font-bold text-foreground">Tickets</Text>
        <View className="mt-3 rounded-xl bg-destructive/10 p-4">
          <Text className="text-sm font-semibold text-destructive">
            This event has been cancelled.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      {!free ? (
        <View className="flex-row items-baseline gap-2 mb-2">
          <Text className="text-3xl font-bold text-primary">
            {`\u20B9${event.ticket_price}`}
          </Text>
          <Text className="text-xs text-muted-foreground">per ticket</Text>
        </View>
      ) : null}

      {isFull ? (
        <View className="mt-4 gap-2">
          <View className="rounded-xl bg-warning/10 p-3">
            <Text className="text-sm font-semibold text-warning">
              This event is sold out.
            </Text>
            <Text className="text-xs text-muted-foreground mt-0.5">
              Join the waitlist and we'll notify you when a seat opens.
            </Text>
          </View>
          <Button
            className="w-full"
            size="lg"
            onPress={onJoinWaitlist}
            disabled={waitlistBusy}
          >
            {waitlistBusy ? "Joining…" : "Join Waitlist"}
          </Button>
        </View>
      ) : (
        <Button
          className="w-full mt-4"
          size="lg"
          onPress={onRegister}
          disabled={busy}
        >
          {busy
            ? "Processing…"
            : free
              ? "Register Free"
              : `Register — \u20B9${event.ticket_price}`}
        </Button>
      )}
    </View>
  );
}

interface TieredBlockProps {
  tiers: AppTicketTier[];
  selectedTierKey: TierKey | null;
  onSelectTier: (k: TierKey) => void;
  quantity: number;
  onQuantityChange: (n: number) => void;
  onRegister: () => void;
  onJoinWaitlist: () => void;
  busy: boolean;
  waitlistBusy: boolean;
  cancelled: boolean;
  selectedTier: AppTicketTier | null;
}

function TieredTicketBlock({
  tiers,
  selectedTierKey,
  onSelectTier,
  quantity,
  onQuantityChange,
  onRegister,
  onJoinWaitlist,
  busy,
  waitlistBusy,
  cancelled,
  selectedTier,
}: TieredBlockProps) {
  if (cancelled) {
    return (
      <View>
        <Text className="text-base font-bold text-foreground">Tickets</Text>
        <View className="mt-3 rounded-xl bg-destructive/10 p-4">
          <Text className="text-sm font-semibold text-destructive">
            This event has been cancelled.
          </Text>
        </View>
      </View>
    );
  }

  const allSoldOut =
    tiers.length > 0 && tiers.every((t) => t.is_sold_out || !t.is_active);

  return (
    <View>
      <TicketSelector
        tiers={tiers}
        selectedTier={selectedTierKey}
        onSelectTier={onSelectTier}
        quantity={quantity}
        onQuantityChange={onQuantityChange}
      />

      <View className="mt-4">
        {allSoldOut ? (
          <View className="gap-2">
            <View className="rounded-xl bg-warning/10 p-3">
              <Text className="text-sm font-semibold text-warning">
                All tickets are sold out.
              </Text>
              <Text className="text-xs text-muted-foreground mt-0.5">
                Join the waitlist and we'll notify you when a seat opens.
              </Text>
            </View>
            <Button
              className="w-full"
              size="lg"
              onPress={onJoinWaitlist}
              disabled={waitlistBusy}
            >
              {waitlistBusy ? "Joining…" : "Join Waitlist"}
            </Button>
          </View>
        ) : selectedTier && selectedTier.is_sold_out ? (
          <Button
            className="w-full"
            size="lg"
            onPress={onJoinWaitlist}
            disabled={waitlistBusy}
          >
            {waitlistBusy ? "Joining…" : "Join Waitlist"}
          </Button>
        ) : selectedTier && !selectedTier.is_active ? (
          <Button className="w-full" size="lg" disabled>
            Not available
          </Button>
        ) : selectedTier && selectedTier.is_free ? (
          <Button
            className="w-full"
            size="lg"
            onPress={onRegister}
            disabled={busy}
          >
            {busy ? "Processing…" : "Register Free"}
          </Button>
        ) : selectedTier ? (
          <Button
            className="w-full"
            size="lg"
            onPress={onRegister}
            disabled={busy}
          >
            {busy
              ? "Processing…"
              : `Buy Now — \u20B9${selectedTier.price * quantity}`}
          </Button>
        ) : (
          <Button className="w-full" size="lg" disabled>
            Select a ticket
          </Button>
        )}
      </View>
    </View>
  );
}

interface SuccessQrProps {
  event: AppEvent;
  registration: any;
  onBack: () => void;
}

function SuccessQrView({ event, registration, onBack }: SuccessQrProps) {
  const colors = useColors();
  return (
    <View className="flex-1 bg-background">
      <View className="bg-primary px-4 py-4">
        <Pressable onPress={onBack} className="flex-row items-center gap-2">
          <ArrowLeft size={20} color={colors.primaryForeground} />
          <Text className="font-medium text-primary-foreground">
            Back to Events
          </Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 16 }}
        className="px-4 py-8"
      >
        <Card className="overflow-hidden">
          <View className="bg-success/10 p-6 items-center">
            <Text className="text-5xl">🎉</Text>
            <Text className="text-xl font-bold text-foreground mt-3">
              You're Registered!
            </Text>
            <Text className="text-sm text-muted-foreground mt-1">
              {event.title}
            </Text>
          </View>
          <CardContent className="p-6 gap-6">
            <View className="items-center">
              <View className="bg-white p-4 rounded-2xl shadow-md">
                <QRCode value={registration.qr_code} size={200} />
              </View>
            </View>
            <View className="items-center">
              <Text className="text-xs text-muted-foreground">
                Your QR Code
              </Text>
              <Text className="text-sm font-mono font-medium text-foreground mt-1">
                {registration.qr_code}
              </Text>
            </View>
            {registration.payment_status === "paid" ? (
              <View className="flex-row items-center justify-center gap-2 bg-success/10 rounded-lg px-3 py-2">
                <CheckCircle size={14} color={colors.success} />
                <Text className="text-sm font-semibold text-success">
                  Payment Confirmed
                </Text>
                {registration.amount_paid != null ? (
                  <Text className="text-sm text-success">
                    — ₹{registration.amount_paid}
                  </Text>
                ) : null}
              </View>
            ) : null}
            <View className="gap-2 rounded-xl bg-muted p-4">
              <View className="flex-row items-center gap-2">
                <Calendar size={14} color={colors.mutedForeground} />
                <Text className="text-sm text-muted-foreground">
                  {new Date(event.date).toLocaleDateString()} • {event.time}
                </Text>
              </View>
              {event.location || event.venue ? (
                <View className="flex-row items-center gap-2">
                  <MapPin size={14} color={colors.mutedForeground} />
                  <Text className="text-sm text-muted-foreground">
                    {event.venue || event.location}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text className="text-center text-xs text-muted-foreground">
              Show this QR code at the event entrance for verification
            </Text>
          </CardContent>
        </Card>
      </ScrollView>
    </View>
  );
}

export default EventDetail;
