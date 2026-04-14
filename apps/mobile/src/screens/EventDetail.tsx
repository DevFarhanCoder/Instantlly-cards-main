import { useCallback, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { PageLoader } from "../components/ui/page-loader";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
} from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useAuth } from "../hooks/useAuth";
import {
  useCreateEventPaymentIntent,
  useEvent,
  useMyRegistrations,
  useRegisterForEvent,
} from "../hooks/useEvents";
import { toast } from "../lib/toast";
import {
  openRazorpayCheckout,
  isNativeRazorpayAvailable,
} from "../lib/payments/razorpayCheckout";
import type { RazorpayCheckoutOptions } from "../lib/payments/razorpayCheckout";
import { RazorpayWebView } from "../lib/payments/RazorpayWebView";

const EventDetail = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id = route?.params?.id;
  const { data: event, isLoading, refetch: refetchEvent } = useEvent(id || "");
  const registerMutation = useRegisterForEvent();
  const paymentIntentMutation = useCreateEventPaymentIntent();
  const { user } = useAuth();
  const { registrations, refetch: refetchRegistrations } = useMyRegistrations();

  // Check if user already registered for this event
  const existingPass = registrations.find(
    (r: any) => String(r.event_id) === String(id),
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

  const [showPriceConfirm, setShowPriceConfirm] = useState(false);
  const [registration, setRegistration] = useState<any>(null);

  // WebView Razorpay fallback state (for Expo Go)
  const [razorpayWebViewVisible, setRazorpayWebViewVisible] = useState(false);
  const [razorpayWebViewOptions, setRazorpayWebViewOptions] =
    useState<RazorpayCheckoutOptions | null>(null);

  const completeRegistration = async (paymentPayload?: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => {
    const result = await registerMutation.mutateAsync({
      event_id: id!,
      ticket_count: 1,
      payment: paymentPayload,
    });
    console.log(
      "[EventDetail.completeRegistration] SUCCESS — regId:",
      result.id,
      "qr:",
      result.qr_code,
      "paymentStatus:",
      result.payment_status,
    );
    setRegistration(result);
    toast.success("Registration successful! Your QR pass is ready");
  };

  const handleRegister = async () => {
    console.log(
      "[EventDetail.handleRegister] starting — user:",
      user?.id,
      "eventId:",
      id,
    );
    if (!user) {
      console.log("[EventDetail.handleRegister] no user — redirecting to Auth");
      toast.error("Please sign in to register");
      navigation.navigate("Auth");
      return;
    }

    const ticketCount = 1;
    const isPaid = !!event?.ticket_price && event.ticket_price > 0;
    console.log(
      "[EventDetail.handleRegister] isPaid:",
      isPaid,
      "ticketPrice:",
      event?.ticket_price,
    );

    try {
      let paymentPayload:
        | {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }
        | undefined;

      if (isPaid) {
        console.log("[EventDetail.handleRegister] creating payment intent...");
        const intent = await paymentIntentMutation.mutateAsync({
          event_id: id!,
          ticket_count: ticketCount,
        });
        console.log(
          "[EventDetail.handleRegister] got intent — orderId:",
          intent.order_id,
          "amount:",
          intent.amount,
          intent.currency,
        );

        const checkoutOptions: RazorpayCheckoutOptions = {
          key: intent.key_id,
          amount: intent.amount,
          currency: intent.currency,
          order_id: intent.order_id,
          name: event?.title || "Event Ticket",
          description: `Ticket for ${intent.event_title}`,
          prefill: {
            name: user?.name || undefined,
            contact: user?.phone || undefined,
          },
          theme: { color: "#2563eb" },
        };

        if (isNativeRazorpayAvailable()) {
          console.log(
            "[EventDetail.handleRegister] trying native Razorpay SDK...",
          );
          try {
            const checkoutResult = await openRazorpayCheckout(checkoutOptions);
            console.log(
              "[EventDetail.handleRegister] Razorpay result — order:",
              checkoutResult.razorpay_order_id,
              "payment:",
              checkoutResult.razorpay_payment_id,
            );
            paymentPayload = checkoutResult;
          } catch (nativeErr: any) {
            // Native SDK resolved but bridge is null (Expo Go) — fall back to WebView
            if (
              /null|undefined|not a function/i.test(nativeErr?.message || "")
            ) {
              console.log(
                "[EventDetail.handleRegister] native SDK bridge failed, falling back to WebView",
              );
              setRazorpayWebViewOptions(checkoutOptions);
              setRazorpayWebViewVisible(true);
              return;
            }
            throw nativeErr; // re-throw real errors (user cancelled, etc.)
          }
        } else {
          // Expo Go fallback — show WebView checkout
          console.log(
            "[EventDetail.handleRegister] native SDK unavailable, using WebView fallback",
          );
          setRazorpayWebViewOptions(checkoutOptions);
          setRazorpayWebViewVisible(true);
          return; // WebView callbacks will handle completeRegistration
        }
      }

      await completeRegistration(paymentPayload);
    } catch (err: any) {
      console.log(
        "[EventDetail.handleRegister] ERROR:",
        err?.status,
        err?.data?.error || err?.message,
        JSON.stringify(err),
      );
      if (
        err?.code === 0 ||
        /cancelled|canceled/i.test(err?.description || err?.message || "")
      ) {
        console.log("[EventDetail.handleRegister] payment cancelled by user");
        toast.error("Payment cancelled");
        return;
      }

      // Handle 409 — already registered
      if (err?.status === 409 || err?.data?.error === "Already registered") {
        toast.error("You are already registered for this event");
        return;
      }

      if (
        /Razorpay checkout module is not available/i.test(err?.message || "")
      ) {
        toast.error(
          "Payment is unavailable on this build. Please use a native build with Razorpay enabled.",
        );
        return;
      }

      toast.error(err?.data?.error || err?.message || "Registration failed");
    }
  };

  const handleRegisterPress = () => {
    if (!user) {
      toast.error("Please sign in to register");
      navigation.navigate("Auth");
      return;
    }
    // For paid events, show price confirmation first
    if (event && event.ticket_price && event.ticket_price > 0) {
      setShowPriceConfirm(true);
    } else {
      handleRegister();
    }
  };

  const handleConfirmPaid = () => {
    setShowPriceConfirm(false);
    handleRegister();
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (!event) {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-5xl mb-3">😕</Text>
        <Text className="text-sm text-muted-foreground">Event not found</Text>
        <Button className="mt-4" onPress={() => navigation.navigate("Events")}>
          Back to Events
        </Button>
      </View>
    );
  }

  // Show QR pass after fresh registration
  if (registration) {
    return (
      <View className="flex-1 bg-background">
        <View className="bg-primary px-4 py-4">
          <Pressable
            onPress={() => navigation.navigate("Events")}
            className="flex-row items-center gap-2"
          >
            <ArrowLeft size={20} color="#ffffff" />
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
              {registration.payment_status === "paid" && (
                <View className="flex-row items-center justify-center gap-2 bg-success/10 rounded-lg px-3 py-2">
                  <CheckCircle size={14} color="#16a34a" />
                  <Text className="text-sm font-semibold text-success">
                    Payment Confirmed
                  </Text>
                  {registration.amount_paid != null && (
                    <Text className="text-sm text-success">
                      — ₹{registration.amount_paid}
                    </Text>
                  )}
                </View>
              )}
              <View className="gap-2 rounded-xl bg-muted p-4">
                <View className="flex-row items-center gap-2">
                  <Calendar size={14} color="#6a7181" />
                  <Text className="text-sm text-muted-foreground">
                    {new Date(event.date).toLocaleDateString()} • {event.time}
                  </Text>
                </View>
                {event.location && (
                  <View className="flex-row items-center gap-2">
                    <MapPin size={14} color="#6a7181" />
                    <Text className="text-sm text-muted-foreground">
                      {event.location}
                    </Text>
                  </View>
                )}
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

  const isFree = !event.ticket_price || event.ticket_price === 0;

  return (
    <View className="flex-1 bg-background">
      <View className="bg-primary px-4 py-4">
        <Pressable
          onPress={() => navigation.navigate("Events")}
          className="flex-row items-center gap-2"
        >
          <ArrowLeft size={20} color="#ffffff" />
          <Text className="font-medium text-primary-foreground">Back</Text>
        </Pressable>
      </View>

      <View className="h-48 bg-primary/10 items-center justify-center">
        <Text className="text-7xl">🎉</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 16 }}
        className="px-4 -mt-6"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#2463eb"]}
            tintColor="#2463eb"
          />
        }
      >
        <Card>
          <CardContent className="p-5 gap-4">
            <View>
              <View className="flex-row items-center gap-2 mb-2">
                {isFree ? (
                  <Badge className="bg-success/10 text-success border-none text-xs">
                    FREE
                  </Badge>
                ) : (
                  <Badge className="bg-accent/10 text-accent border-none text-xs font-bold">
                    ₹{event.ticket_price}
                  </Badge>
                )}
              </View>
              <Text className="text-xl font-bold text-foreground">
                {event.title}
              </Text>
            </View>

            {event.description && (
              <Text className="text-sm text-muted-foreground">
                {event.description}
              </Text>
            )}

            <View className="gap-2.5 rounded-xl bg-muted p-4">
              <View className="flex-row items-center gap-3">
                <Calendar size={16} color="#2563eb" />
                <Text className="text-sm text-foreground">
                  {new Date(event.date).toLocaleDateString()}
                </Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Clock size={16} color="#2563eb" />
                <Text className="text-sm text-foreground">{event.time}</Text>
              </View>
              {event.location && (
                <View className="flex-row items-center gap-3">
                  <MapPin size={16} color="#2563eb" />
                  <Text className="text-sm text-foreground">
                    {event.location}
                  </Text>
                </View>
              )}
              {event.max_attendees && (
                <View className="flex-row items-center gap-3">
                  <Users size={16} color="#2563eb" />
                  <Text className="text-sm text-foreground">
                    {event.max_attendees} seats ({event.attendee_count || 0}{" "}
                    registered)
                  </Text>
                </View>
              )}
              {event.business && (
                <View className="flex-row items-center gap-3">
                  <Text className="text-sm text-muted-foreground">
                    Organized by
                  </Text>
                  <Text className="text-sm font-medium text-foreground">
                    {event.business.company_name || event.business.full_name}
                  </Text>
                </View>
              )}
            </View>

            {/* Already registered — show pass */}
            {existingPass ? (
              <View className="gap-3">
                <View className="flex-row items-center gap-2 bg-success/10 rounded-xl p-4">
                  <CheckCircle size={20} color="#16a34a" />
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-success">
                      Already Registered
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      You have a pass for this event
                    </Text>
                  </View>
                </View>
                {existingPass.qr_code && (
                  <View className="items-center bg-muted/30 rounded-xl p-4 gap-2 border border-dashed border-border">
                    <QRCode value={existingPass.qr_code} size={160} />
                    <Text className="text-[10px] text-muted-foreground font-mono">
                      {existingPass.qr_code}
                    </Text>
                  </View>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onPress={() => navigation.navigate("MyPasses")}
                >
                  View All Passes
                </Button>
              </View>
            ) : showPriceConfirm ? (
              /* Price confirmation for paid events */
              <View className="gap-3 rounded-xl border border-border bg-card p-4">
                <Text className="font-semibold text-foreground text-center">
                  Confirm Registration
                </Text>
                <View className="items-center py-3">
                  <Text className="text-3xl font-bold text-primary">
                    ₹{event.ticket_price}
                  </Text>
                  <Text className="text-xs text-muted-foreground mt-1">
                    Ticket Price
                  </Text>
                </View>
                {user && (
                  <View className="bg-muted rounded-lg px-3 py-2 gap-1">
                    <Text className="text-xs text-muted-foreground text-center">
                      Registering as
                    </Text>
                    <Text className="text-sm font-semibold text-foreground text-center">
                      {user.name}
                    </Text>
                    {user.phone && (
                      <Text className="text-xs text-muted-foreground text-center">
                        {user.phone}
                      </Text>
                    )}
                  </View>
                )}
                <Text className="text-xs text-muted-foreground text-center">
                  You'll be redirected to a secure Razorpay payment.
                </Text>
                <Button
                  className="w-full"
                  size="lg"
                  onPress={handleConfirmPaid}
                  disabled={
                    registerMutation.isPending ||
                    paymentIntentMutation.isPending
                  }
                >
                  {registerMutation.isPending || paymentIntentMutation.isPending
                    ? "Processing Payment..."
                    : `Confirm & Pay — ₹${event.ticket_price}`}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onPress={() => setShowPriceConfirm(false)}
                >
                  Cancel
                </Button>
              </View>
            ) : (
              <Button
                className="w-full"
                size="lg"
                onPress={handleRegisterPress}
                disabled={
                  registerMutation.isPending || paymentIntentMutation.isPending
                }
              >
                {registerMutation.isPending || paymentIntentMutation.isPending
                  ? "Registering..."
                  : isFree
                    ? "Register Now →"
                    : `Register — ₹${event.ticket_price}`}
              </Button>
            )}
          </CardContent>
        </Card>
      </ScrollView>

      {/* Razorpay WebView fallback for Expo Go */}
      {razorpayWebViewVisible && razorpayWebViewOptions && (
        <RazorpayWebView
          visible={razorpayWebViewVisible}
          options={razorpayWebViewOptions}
          onSuccess={async (data) => {
            console.log(
              "[EventDetail.RazorpayWebView] onSuccess — order:",
              data.razorpay_order_id,
              "payment:",
              data.razorpay_payment_id,
            );
            setRazorpayWebViewVisible(false);
            setRazorpayWebViewOptions(null);
            try {
              await completeRegistration(data);
            } catch (err: any) {
              console.log(
                "[EventDetail.RazorpayWebView] registration error:",
                err?.data?.error || err?.message,
              );
              toast.error(
                err?.data?.error ||
                  err?.message ||
                  "Registration failed after payment",
              );
            }
          }}
          onCancel={() => {
            console.log("[EventDetail.RazorpayWebView] cancelled");
            setRazorpayWebViewVisible(false);
            setRazorpayWebViewOptions(null);
            toast.error("Payment cancelled");
          }}
          onError={(msg) => {
            console.log("[EventDetail.RazorpayWebView] error:", msg);
            setRazorpayWebViewVisible(false);
            setRazorpayWebViewOptions(null);
            toast.error(msg || "Payment failed");
          }}
        />
      )}
    </View>
  );
};

export default EventDetail;
