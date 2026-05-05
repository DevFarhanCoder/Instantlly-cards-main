import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  ImageSourcePropType,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
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
  TierKey,
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
import {
  useCreateCartPaymentIntentMutation,
  useGetFriendAttendeesQuery,
  useRegisterCartMutation,
} from "../store/api/eventsApi";
import type { AppEvent, AppTicketTier } from "../store/api/eventsApi";
import { promptAddToCalendar } from "../utils/calendar";
import { EventAgendaSection } from "../components/ui/EventAgendaSection";

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
  const [createCartPaymentIntentMutation] = useCreateCartPaymentIntentMutation();
  const [registerCartMutation] = useRegisterCartMutation();
  const waitlistMutation = useJoinWaitlist();
  const { user } = useAuth();
  const { registrations, refetch: refetchRegistrations } = useMyRegistrations();

  // All registrations the user already has for this event (multi-tier aware)
  const existingPasses = useMemo(
    () => registrations.filter((r: any) => String(r.event_id) === String(id)),
    [registrations, id],
  );

  const eventIdNum =
    typeof id === "string" ? parseInt(id, 10) : Number(id);
  const { data: friendAttendees } = useGetFriendAttendeesQuery(eventIdNum, {
    skip: !user || !Number.isFinite(eventIdNum) || eventIdNum <= 0,
  });

  const friendNamesSummary = useMemo(() => {
    const names = (friendAttendees?.friends ?? [])
      .map((f) => f?.name)
      .filter((n): n is string => typeof n === "string" && n.trim().length > 0);
    const uniqueNames = Array.from(new Set(names));
    const top = uniqueNames.slice(0, 3);
    const remaining = uniqueNames.length - top.length;
    const namesText = top.join(", ");
    if (!namesText) return "";
    return remaining > 0 ? `${namesText} +${remaining} more` : namesText;
  }, [friendAttendees]);

  const friendPreview = useMemo(() => {
    return (friendAttendees?.friends ?? []).slice(0, 5).map((f) => {
      const cleanName = (f?.name ?? "Friend").trim() || "Friend";
      const initials = cleanName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("") || "F";
      return {
        userId: f.user_id,
        name: cleanName,
        profilePicture: f.profile_picture,
        initials,
      };
    });
  }, [friendAttendees]);
  // Tier IDs already purchased so we can show "already bought" state
  const purchasedTierIds = useMemo(
    () => new Set(existingPasses.map((r: any) => r.ticket_tier_id).filter(Boolean)),
    [existingPasses],
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

  // Cart: maps String(tier.id ?? "virtual") → quantity
  const [cartItems, setCartItems] = useState<Record<string, number>>({});
  const updateCart = useCallback((key: string, qty: number) => {
    setCartItems((prev) => {
      if (qty <= 0) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: qty };
    });
  }, []);

  // Reset cart whenever event data changes (refetch / navigate back)
  React.useEffect(() => { setCartItems({}); }, [event?.id]);

  const cartItemsList = useMemo(
    () =>
      realTiers
        .map((t) => ({ tier: t, qty: cartItems[String(t.id ?? "virtual")] ?? 0 }))
        .filter((x) => x.qty > 0),
    [realTiers, cartItems],
  );
  const cartHasItems = cartItemsList.length > 0;
  const cartTotal = useMemo(
    () => cartItemsList.reduce((sum, x) => sum + (x.tier.is_free ? 0 : x.tier.price * x.qty), 0),
    [cartItemsList],
  );
  const cartIsAllFree = cartItemsList.every((x) => x.tier.is_free);

  // For legacy single-tier flow — keep backward compat
  const firstCartTier = cartItemsList[0]?.tier ?? null;
  const firstCartQty = cartItemsList[0]?.qty ?? 1;

  // Local UX state — protects against double-tap and exposes payment retry.
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [waitlistAlreadyJoined, setWaitlistAlreadyJoined] = useState(false);

  // Razorpay WebView fallback state
  const [newRegistrations, setNewRegistrations] = useState<any[]>([]);
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [webViewOptions, setWebViewOptions] =
    useState<RazorpayCheckoutOptions | null>(null);
  // Pending cart items for WebView flow (paid cart needs payment before registering)
  const [pendingCartItems, setPendingCartItems] = useState<Array<{ tier: AppTicketTier; qty: number }>>([]);

  // Venue photos viewer state
  const [photosModalOpen, setPhotosModalOpen] = useState(false);

  // Parallax hero scroll animation — must be declared before any early returns
  const HERO_H = 200;
  const scrollY = useRef(new Animated.Value(0)).current;

  // ─── Action handlers ────────────────────────────────────────────────

  /** Complete a SINGLE-tier or legacy registration (existing flow). */
  const completeRegistration = useCallback(
    async (paymentPayload?: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => {
      if (!event) return;
      const tierIdForCall =
        !legacy && firstCartTier?.id ? firstCartTier.id : null;
      const ticketCount = legacy ? 1 : firstCartQty;
      const result = await registerMutation.mutateAsync({
        event_id: id!,
        ticket_count: ticketCount,
        tier_id: tierIdForCall,
        payment: paymentPayload,
      });
      setNewRegistrations([result]);
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
    [event, legacy, firstCartTier, firstCartQty, id, registerMutation],
  );

  /** Complete a MULTI-tier cart registration. */
  const completeCartRegistration = useCallback(
    async (paymentPayload?: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }, overrideItems?: Array<{ tier: AppTicketTier; qty: number }>) => {
      if (!event) return;
      const items = (overrideItems ?? cartItemsList).map((x) => ({
        tier_id: x.tier.id!,
        ticket_count: x.qty,
      }));
      const result = await registerCartMutation({
        eventId: id!,
        items,
        payment: paymentPayload,
      }).unwrap();
      setNewRegistrations(result.registrations);
      toast.success(`Registered! ${result.registrations.length} ticket type${result.registrations.length > 1 ? "s" : ""} confirmed`);
    },
    [event, cartItemsList, id, registerCartMutation],
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
      isCart = false,
      cartSnapshot?: Array<{ tier: AppTicketTier; qty: number }>,
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
          if (isCart) {
            await completeCartRegistration(res, cartSnapshot);
          } else {
            await completeRegistration(res);
          }
          return true;
        } catch (nativeErr: any) {
          if (/null|undefined|not a function/i.test(nativeErr?.message || "")) {
            setPendingCartItems(isCart ? (cartSnapshot ?? cartItemsList) : []);
            setWebViewOptions(checkoutOptions);
            setWebViewVisible(true);
            return true;
          }
          throw nativeErr;
        }
      }
      setPendingCartItems(isCart ? (cartSnapshot ?? cartItemsList) : []);
      setWebViewOptions(checkoutOptions);
      setWebViewVisible(true);
      return true;
    },
    [event, user, colors.primary, completeRegistration, completeCartRegistration, cartItemsList],
  );

  const handleRegisterPress = useCallback(async () => {
    if (!user) {
      toast.error("Please sign in to register");
      navigation.navigate("Auth");
      return;
    }
    if (!event) return;
    if (isProcessing) return;
    setIsProcessing(true);
    setPaymentError(null);

    try {
      // ── Legacy single-tier flow ──────────────────────────────────────
      if (legacy) {
        const free = legacyIsFree(event);
        if (free) { await completeRegistration(); return; }
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

      // ── Cart flow ────────────────────────────────────────────────────
      if (!cartHasItems) {
        toast.error("Please add at least one ticket");
        return;
      }

      // Single free tier — use existing endpoint
      if (cartItemsList.length === 1 && cartItemsList[0].tier.is_free) {
        await completeRegistration();
        return;
      }

      // All free cart — use cart register endpoint directly
      if (cartIsAllFree) {
        await completeCartRegistration();
        return;
      }

      // Has paid items — single cart uses single-tier intent for simplicity,
      // multi-tier uses cart intent
      if (cartItemsList.length === 1) {
        const item = cartItemsList[0];
        const intent = await paymentIntentMutation.mutateAsync({
          event_id: id!,
          ticket_count: item.qty,
          tier_id: item.tier.id ?? undefined,
        });
        await startPaidCheckout(intent.amount, {
          key_id: intent.key_id,
          order_id: intent.order_id,
          currency: intent.currency,
          event_title: intent.event_title,
        });
      } else {
        // Multi-tier paid cart
        const snapshot = [...cartItemsList];
        const intent = await createCartPaymentIntentMutation({
          eventId: id!,
          items: snapshot.map((x) => ({ tier_id: x.tier.id!, ticket_count: x.qty })),
        }).unwrap();
        await startPaidCheckout(intent.amount, {
          key_id: intent.key_id,
          order_id: intent.order_id,
          currency: intent.currency,
          event_title: intent.event_title,
        }, true, snapshot);
      }
    } catch (err: any) {
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
    user, event, legacy, cartHasItems, cartItemsList, cartIsAllFree,
    id, isProcessing, paymentIntentMutation, startPaidCheckout,
    completeRegistration, completeCartRegistration, createCartPaymentIntentMutation,
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
        ticket_count: legacy ? 1 : (cartItemsList[0]?.qty ?? 1),
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
    cartItemsList,
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

  if (newRegistrations.length > 0) {
    return (
      <SuccessQrView
        event={event}
        registrations={newRegistrations}
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
  const hasVenuePhotos = venueImages.length > 0;
  const venueImageSources: ImageSourcePropType[] = venueImages.map((uri) => ({ uri }));

  const heroScale = scrollY.interpolate({ inputRange: [-HERO_H, 0], outputRange: [2, 1], extrapolate: "clamp" });
  const heroTranslate = scrollY.interpolate({ inputRange: [0, HERO_H], outputRange: [0, -HERO_H / 2], extrapolate: "clamp" });
  const backBg = scrollY.interpolate({ inputRange: [HERO_H - 60, HERO_H], outputRange: ["rgba(0,0,0,0)", colors.card], extrapolate: "clamp" });

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Floating back button */}
      <Animated.View
        style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
          backgroundColor: backBg,
          paddingTop: 10, paddingBottom: 10, paddingHorizontal: 16,
          flexDirection: "row", alignItems: "center",
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            flexDirection: "row", alignItems: "center", gap: 6,
            backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 20,
            paddingHorizontal: 12, paddingVertical: 6,
          }}
          hitSlop={10}
        >
          <ArrowLeft size={18} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>Back</Text>
        </Pressable>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            progressViewOffset={HERO_H}
          />
        }
      >
        {/* Parallax hero — shows company logo */}
        <Animated.View style={{ height: HERO_H, overflow: "hidden", transform: [{ translateY: heroTranslate }] }}>
          <Animated.View style={{ flex: 1, transform: [{ scale: heroScale }] }}>
            {companyLogo ? (
              <View style={{ flex: 1, backgroundColor: "#f8f9fa", alignItems: "center", justifyContent: "center" }}>
                <Image
                  source={{ uri: companyLogo }}
                  style={{ width: "100%", height: HERO_H }}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={{ flex: 1, backgroundColor: "#1d3b6e", alignItems: "center", justifyContent: "center" }}>
                <Image
                  source={require("../../assets/Instantlly_Logo-removebg.png")}
                  style={{ width: 120, height: 120, opacity: 0.7 }}
                  resizeMode="contain"
                />
              </View>
            )}
          </Animated.View>
          {/* Gradient overlay at bottom of hero */}
          <View
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
              backgroundColor: "transparent",
            }}
            pointerEvents="none"
          />
          {/* View Photos button — bottom-right of hero */}
          {hasVenuePhotos ? (
            <Pressable
              onPress={() => setPhotosModalOpen(true)}
              style={{
                position: "absolute", bottom: 36, right: 12,
                flexDirection: "row", alignItems: "center", gap: 5,
                backgroundColor: "rgba(0,0,0,0.55)",
                borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
              }}
              hitSlop={8}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
                View Photos ({venueImages.length})
              </Text>
            </Pressable>
          ) : null}
        </Animated.View>

        {/* Content card lifts up over hero */}
        <View style={{ marginTop: -24, paddingHorizontal: 16 }}>

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
              {/* Recurrence info */}
              {event.recurrence_rule && !event.parent_event_id ? (
                <View className="flex-row items-center gap-1.5 mt-1">
                  <Text className="text-xs text-blue-500 font-medium">
                    🔄 Repeating{" "}
                    {(() => {
                      try {
                        const rule = JSON.parse(event.recurrence_rule!);
                        if (rule.freq === "weekly" && rule.days?.length) {
                          return `weekly on ${rule.days.join(", ")}`;
                        }
                        return rule.freq;
                      } catch {
                        return "";
                      }
                    })()}
                  </Text>
                </View>
              ) : event.parent_event_id ? (
                <View className="flex-row items-center gap-1.5 mt-1">
                  <Text className="text-xs text-blue-500 font-medium">
                    🔄 Part of a recurring series
                  </Text>
                </View>
              ) : null}
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

            {(friendAttendees?.total_friends_attending ?? 0) > 0 ? (
              <View className="rounded-xl bg-success/10 p-3">
                <Text className="text-xs uppercase tracking-wide text-success mb-1">
                  Friends Attending
                </Text>
                <Text className="text-xs text-muted-foreground mb-2">
                  You have {friendAttendees?.total_friends_attending ?? 0} friend{(friendAttendees?.total_friends_attending ?? 0) > 1 ? "s" : ""} attending
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-2">
                  {friendPreview.map((friend) => (
                    <View
                      key={friend.userId}
                      className="flex-row items-center bg-background/80 rounded-full pl-1 pr-2 py-1"
                    >
                      {friend.profilePicture ? (
                        <Image
                          source={{ uri: friend.profilePicture }}
                          style={{ width: 22, height: 22, borderRadius: 11 }}
                        />
                      ) : (
                        <View className="w-[22px] h-[22px] rounded-full bg-primary/20 items-center justify-center">
                          <Text className="text-[10px] font-semibold text-primary">
                            {friend.initials}
                          </Text>
                        </View>
                      )}
                      <Text className="text-xs text-foreground ml-1.5">
                        {friend.name}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text className="text-sm text-foreground font-medium">
                  {friendNamesSummary}
                </Text>
              </View>
            ) : null}
          </CardContent>
        </Card>

        {/* Multi-day agenda — only shown when the event has sessions/speakers */}
        <EventAgendaSection eventId={eventIdNum} />

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

        {existingPasses.length > 0 ? (
          <Card className="mt-4">
            <CardContent className="p-5 gap-3">
              <View className="flex-row items-center gap-2 bg-success/10 rounded-xl p-4">
                <CheckCircle size={20} color={colors.success} />
                <View className="flex-1">
                  <Text className="text-sm font-bold text-success">
                    Already Registered
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    You have {existingPasses.length} pass{existingPasses.length > 1 ? "es" : ""} for this event
                  </Text>
                </View>
              </View>
              {existingPasses.map((pass: any, idx: number) => (
                pass.qr_code ? (
                  <View key={pass.id ?? idx} className="items-center bg-muted/30 rounded-xl p-4 gap-2 border border-dashed border-border">
                    {existingPasses.length > 1 && (
                      <Text className="text-xs font-semibold text-muted-foreground">
                        {pass.ticket_tier?.name ?? `Ticket ${idx + 1}`}
                      </Text>
                    )}
                    <View className="bg-white p-3 rounded-xl">
                      <QRCode value={pass.qr_code} size={160} />
                    </View>
                    <Text className="text-[10px] text-muted-foreground font-mono">
                      {pass.qr_code}
                    </Text>
                  </View>
                ) : null
              ))}
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
                  cartItems={cartItems}
                  onCartChange={updateCart}
                  cartTotal={cartTotal}
                  cartHasItems={cartHasItems}
                  onRegister={handleRegisterPress}
                  onJoinWaitlist={handleJoinWaitlist}
                  busy={
                    isProcessing ||
                    registerMutation.isPending ||
                    paymentIntentMutation.isPending
                  }
                  waitlistBusy={isProcessing || waitlistMutation.isPending}
                  cancelled={eventCancelled}
                />
              )}
            </CardContent>
          </Card>
        )}
      </View>{/* end content card wrapper */}
      </Animated.ScrollView>

      {webViewVisible && webViewOptions ? (
        <RazorpayWebView
          visible={webViewVisible}
          options={webViewOptions}
          onSuccess={async (data) => {
            setWebViewVisible(false);
            setWebViewOptions(null);
            try {
              if (pendingCartItems.length > 1) {
                await completeCartRegistration(data, pendingCartItems);
              } else {
                await completeRegistration(data);
              }
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

      {/* Venue Photos Modal */}
      <VenuePhotosModal
        visible={photosModalOpen}
        images={venueImageSources}
        onClose={() => setPhotosModalOpen(false)}
      />
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

// ─── Venue Photos Modal ───────────────────────────────────────────────

function VenuePhotosModal({
  visible,
  images,
  onClose,
}: {
  visible: boolean;
  images: ImageSourcePropType[];
  onClose: () => void;
}) {
  const { width, height: screenH } = Dimensions.get("window");
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        {/* Counter */}
        {images.length > 1 ? (
          <View style={{ position: "absolute", top: 52, left: 0, right: 0, alignItems: "center", zIndex: 20, pointerEvents: "none" }}>
            <View style={{ backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
                {activeIndex + 1} / {images.length}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Swipeable images */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / width);
            setActiveIndex(idx);
          }}
          style={{ width, height: screenH }}
          contentContainerStyle={{ alignItems: "flex-start" }}
        >
          {images.map((source, i) => (
            <View
              key={i}
              style={{ width, height: screenH, justifyContent: "center", alignItems: "center" }}
            >
              <Image
                source={source}
                style={{ width, height: screenH * 0.75 }}
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>

        {/* Close button */}
        <Pressable
          onPress={onClose}
          style={{
            position: "absolute", top: 44, right: 16,
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: "rgba(255,255,255,0.2)",
            borderWidth: 1, borderColor: "rgba(255,255,255,0.4)",
            justifyContent: "center", alignItems: "center",
            zIndex: 20,
          }}
          hitSlop={16}
        >
          <Text style={{ color: "#fff", fontSize: 22, lineHeight: 24, fontWeight: "700" }}>×</Text>
        </Pressable>

        {/* Dot indicators */}
        {images.length > 1 ? (
          <View style={{ position: "absolute", bottom: 48, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 }}>
            {images.map((_, i) => (
              <View
                key={i}
                style={{
                  height: 6, borderRadius: 3,
                  width: i === activeIndex ? 24 : 6,
                  backgroundColor: i === activeIndex ? "#fff" : "rgba(255,255,255,0.35)",
                }}
              />
            ))}
          </View>
        ) : null}

        {/* Swipe hint */}
        <Text style={{ position: "absolute", bottom: 20, left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
          Swipe to browse · tap × to close
        </Text>
      </View>
    </Modal>
  );
}

function VenueImageSlider({ images, height: sliderHeight }: { images: ImageSourcePropType[]; height?: number }) {
  const { width, height: screenHeight } = Dimensions.get("window");
  const height = sliderHeight ?? 220;
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const viewerScrollRef = useRef<ScrollView>(null);

  const viewerTranslateY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 10,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) viewerTranslateY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        // Treat tiny movement as a tap → close
        if (Math.abs(gs.dy) < 8 && Math.abs(gs.dx) < 8) {
          Animated.timing(viewerTranslateY, { toValue: 600, duration: 180, useNativeDriver: true }).start(() => {
            setViewerOpen(false);
          });
          return;
        }
        if (gs.dy > 80 || gs.vy > 0.8) {
          Animated.timing(viewerTranslateY, { toValue: 600, duration: 200, useNativeDriver: true }).start(() => {
            setViewerOpen(false);
          });
        } else {
          Animated.spring(viewerTranslateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const closeViewer = () => {
    Animated.timing(viewerTranslateY, { toValue: 600, duration: 180, useNativeDriver: true }).start(() => {
      setViewerOpen(false);
    });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(idx);
  };

  const onViewerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setViewerIndex(idx);
  };

  const openViewer = (idx: number) => {
    viewerTranslateY.setValue(0);
    setViewerIndex(idx);
    setViewerOpen(true);
    setTimeout(() => {
      viewerScrollRef.current?.scrollTo({ x: idx * width, animated: false });
    }, 50);
  };

  return (
    <View style={{ width: "100%", height }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={{ width, height }}
      >
        {images.map((source, i) => (
          <Pressable key={i} onPress={() => openViewer(i)}>
            <Image source={source} style={{ width, height }} resizeMode="cover" />
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

      <Modal
        visible={viewerOpen}
        transparent={false}
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={closeViewer}
      >
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          {/* Image counter */}
          {images.length > 1 ? (
            <View style={{ position: "absolute", top: 52, left: 0, right: 0, alignItems: "center", zIndex: 10 }}>
              <View style={{ backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 }}>
                <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>{viewerIndex + 1} / {images.length}</Text>
              </View>
            </View>
          ) : null}

          <ScrollView
            ref={viewerScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onViewerScroll}
            style={{ width, height: screenHeight }}
            contentContainerStyle={{ alignItems: "flex-start" }}
          >
            {images.map((source, i) => (
              <Animated.View
                key={i}
                style={{ width, height: screenHeight, justifyContent: "center", alignItems: "center", transform: [{ translateY: viewerTranslateY }] }}
                {...panResponder.panHandlers}
              >
                <Image source={source} style={{ width, height: screenHeight * 0.75 }} resizeMode="contain" />
              </Animated.View>
            ))}
          </ScrollView>

          {/* Close button */}
          <Pressable
            onPress={closeViewer}
            style={{
              position: "absolute", top: 44, right: 16,
              width: 38, height: 38, borderRadius: 19,
              backgroundColor: "rgba(255,255,255,0.15)",
              borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
              justifyContent: "center", alignItems: "center",
            }}
            hitSlop={10}
          >
            <Text style={{ color: "#fff", fontSize: 20, lineHeight: 22, fontWeight: "700" }}>×</Text>
          </Pressable>

          {/* Dot indicators */}
          {images.length > 1 ? (
            <View style={{ position: "absolute", bottom: 48, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 }}>
              {images.map((_, i) => (
                <View
                  key={i}
                  style={{
                    height: 6, borderRadius: 3,
                    width: i === viewerIndex ? 24 : 6,
                    backgroundColor: i === viewerIndex ? "#fff" : "rgba(255,255,255,0.35)",
                  }}
                />
              ))}
            </View>
          ) : null}

          {/* Swipe hint */}
          <Text style={{ position: "absolute", bottom: 20, left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
            Tap or swipe down to close
          </Text>
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
  cartItems: Record<string, number>;
  onCartChange: (key: string, qty: number) => void;
  cartTotal: number;
  cartHasItems: boolean;
  onRegister: () => void;
  onJoinWaitlist: () => void;
  busy: boolean;
  waitlistBusy: boolean;
  cancelled: boolean;
}

function TieredTicketBlock({
  tiers,
  cartItems,
  onCartChange,
  cartTotal,
  cartHasItems,
  onRegister,
  onJoinWaitlist,
  busy,
  waitlistBusy,
  cancelled,
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
        cartItems={cartItems}
        onCartChange={onCartChange}
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
        ) : !cancelled && cartHasItems ? (
          <Button
            className="w-full"
            size="lg"
            onPress={onRegister}
            disabled={busy}
          >
            {busy
              ? "Processing…"
              : cartTotal > 0
              ? `Buy Now — \u20B9${cartTotal}`
              : "Register Free"}
          </Button>
        ) : !cancelled ? (
          <Button className="w-full" size="lg" disabled>
            Add tickets above
          </Button>
        ) : null}
      </View>
    </View>
  );
}

interface SuccessQrProps {
  event: AppEvent;
  registrations: any[];
  onBack: () => void;
}

function SuccessQrView({ event, registrations, onBack }: SuccessQrProps) {
  const colors = useColors();
  const totalPaid = registrations.reduce((s, r) => s + (r.amount_paid ?? 0), 0);
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
            {registrations.map((reg, idx) => (
              <View key={reg.id ?? idx} className="items-center gap-3">
                {registrations.length > 1 && (
                  <Text className="text-sm font-semibold text-muted-foreground">
                    Ticket {idx + 1}
                    {reg.ticket_tier?.name ? ` — ${reg.ticket_tier.name}` : ""}
                  </Text>
                )}
                <View className="bg-white p-4 rounded-2xl shadow-md">
                  <QRCode value={reg.qr_code} size={200} />
                </View>
                <View className="items-center">
                  <Text className="text-xs text-muted-foreground">Your QR Code</Text>
                  <Text className="text-sm font-mono font-medium text-foreground mt-1">
                    {reg.qr_code}
                  </Text>
                </View>
              </View>
            ))}
            {registrations.some((r) => r.payment_status === "paid") ? (
              <View className="flex-row items-center justify-center gap-2 bg-success/10 rounded-lg px-3 py-2">
                <CheckCircle size={14} color={colors.success} />
                <Text className="text-sm font-semibold text-success">
                  Payment Confirmed
                </Text>
                {totalPaid > 0 ? (
                  <Text className="text-sm text-success">— ₹{totalPaid}</Text>
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
