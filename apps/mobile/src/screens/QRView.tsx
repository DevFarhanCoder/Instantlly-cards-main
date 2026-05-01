import React, { memo, useCallback, useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft, Calendar, CheckCircle2, Clock, MapPin } from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { format } from "date-fns";

import { Button } from "../components/ui/button";
import { ErrorState } from "../components/ui/error-state";
import { PageLoader } from "../components/ui/page-loader";
import { useColors } from "../theme/colors";
import { useMyRegistrations } from "../hooks/useEvents";
import { Ticket } from "lucide-react-native";
import type { EventRegistration } from "../store/api/eventsApi";

/**
 * QRView — full-screen QR pass. Reads the registration row from the
 * cached `useMyRegistrations()` query so it stays in sync after RTK
 * cache invalidations (e.g. after the user gets checked in).
 *
 * Status logic:
 *   • cancelled       → registration.cancelled_at OR event.cancelled_at OR event.status === 'cancelled'
 *   • checked-in      → registration.checked_in === true
 *   • refunded        → registration.refund_status === 'refunded'
 *   • upcoming        → otherwise (default)
 */

type PassStatus = "upcoming" | "checked-in" | "cancelled" | "refunded";

function deriveStatus(reg: EventRegistration | undefined): PassStatus {
  if (!reg) return "upcoming";
  if (reg.refund_status === "refunded") return "refunded";
  if (reg.cancelled_at) return "cancelled";
  const ev = reg.event as any;
  if (ev?.cancelled_at || ev?.status === "cancelled") return "cancelled";
  if (reg.checked_in) return "checked-in";
  return "upcoming";
}

const QrBlock = memo(function QrBlock({
  value,
  size,
  dimmed,
}: {
  value: string;
  size: number;
  dimmed: boolean;
}) {
  // Memoized so re-rendering parents (e.g. countdown ticks) don't
  // force the QR canvas to redraw on every tick.
  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        padding: 16,
        borderRadius: 24,
        opacity: dimmed ? 0.45 : 1,
      }}
    >
      <QRCode value={value} size={size} />
    </View>
  );
});

const QRView = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const passId = route?.params?.passId;
  const colors = useColors();

  const { registrations, isLoading, isError, refetch } = useMyRegistrations();

  const pass = useMemo<EventRegistration | undefined>(
    () =>
      (registrations as EventRegistration[]).find(
        (r) => String(r.id) === String(passId),
      ),
    [registrations, passId],
  );

  const status = useMemo(() => deriveStatus(pass), [pass]);
  const event = pass?.event;

  // Smooth open animation.
  const fade = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, translateY]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("MyPasses");
  }, [navigation]);

  if (isLoading) return <PageLoader />;
  if (isError) {
    return (
      <View className="flex-1 bg-background">
        <ErrorState
          title="Couldn't load pass"
          message="Pull down to retry."
          onRetry={() => refetch()}
        />
      </View>
    );
  }
  if (!pass) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-5xl mb-3">🎫</Text>
        <Text className="text-base font-semibold text-foreground">
          Pass not found
        </Text>
        <Text className="text-sm text-muted-foreground mt-1 text-center">
          This pass may have been removed.
        </Text>
        <Button className="mt-4" onPress={handleBack}>
          Back
        </Button>
      </View>
    );
  }

  const dimmed = status === "cancelled" || status === "refunded";

  return (
    <View className="flex-1 bg-background">
      <View className="bg-primary px-4 py-4 flex-row items-center gap-3">
        <Pressable
          onPress={handleBack}
          accessibilityLabel="Close pass"
          hitSlop={12}
        >
          <ArrowLeft size={20} color={colors.primaryForeground} />
        </Pressable>
        <Text className="text-lg font-bold text-primary-foreground flex-1">
          Event Pass
        </Text>
      </View>

      <Animated.View
        style={{
          flex: 1,
          opacity: fade,
          transform: [{ translateY }],
        }}
      >
        <ScrollView
          contentContainerStyle={{ paddingVertical: 24, paddingHorizontal: 16 }}
        >
          <StatusBanner status={status} />

          <View className="items-center mt-6 mb-4">
            {pass.qr_code ? (
              <QrBlock value={pass.qr_code} size={260} dimmed={dimmed} />
            ) : (
              <View className="bg-muted rounded-2xl p-10 items-center">
                <Text className="text-sm text-muted-foreground">
                  QR code unavailable
                </Text>
              </View>
            )}
            {pass.qr_code ? (
              <Text className="text-[11px] font-mono text-muted-foreground mt-3">
                {pass.qr_code}
              </Text>
            ) : null}
          </View>

          <View className="rounded-2xl bg-card border border-border p-5 gap-3">
            <Text className="text-xl font-bold text-foreground">
              {event?.title || "Event"}
            </Text>

            {/* Ticket type card — shown for tiered registrations */}
            {pass.ticket_tier ? (
              <View className="rounded-xl border border-accent/30 bg-accent/5 p-3 flex-row items-center gap-3">
                <View className="rounded-lg bg-accent/15 p-2">
                  <Ticket size={18} color={colors.accent} />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-muted-foreground uppercase tracking-wide">Ticket Type</Text>
                  <Text className="text-base font-bold text-foreground">{pass.ticket_tier.name}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-xs text-muted-foreground">Price</Text>
                  <Text className="text-base font-bold text-accent">
                    {pass.ticket_tier.price === 0 ? "Free" : `₹${pass.ticket_tier.price}`}
                  </Text>
                </View>
              </View>
            ) : null}

            <View className="flex-row gap-3">
              {/* Payment stat */}
              <View className="flex-1 rounded-xl bg-success/10 px-3 py-2.5 items-center">
                <Text className="text-[10px] uppercase tracking-wide text-success/70 font-medium">
                  {pass.payment_status === "paid" ? "Amount Paid" : "Entry"}
                </Text>
                <Text className="text-lg font-bold text-success mt-0.5">
                  {pass.payment_status === "paid" && pass.amount_paid != null
                    ? `₹${pass.amount_paid}`
                    : "Free"}
                </Text>
              </View>
              {/* Ticket count stat */}
              <View className="flex-1 rounded-xl bg-primary/10 px-3 py-2.5 items-center">
                <Text className="text-[10px] uppercase tracking-wide text-primary/70 font-medium">
                  {pass.ticket_count > 1 ? "Tickets" : "Ticket"}
                </Text>
                <Text className="text-lg font-bold text-primary mt-0.5">
                  {pass.ticket_count}
                </Text>
              </View>
            </View>

            <View className="gap-2 rounded-xl bg-muted p-3 mt-1">
              {event?.date ? (
                <View className="flex-row items-center gap-2">
                  <Calendar size={14} color={colors.primary} />
                  <Text className="text-sm text-foreground">
                    {format(new Date(event.date), "EEE, MMM d, yyyy")}
                  </Text>
                </View>
              ) : null}
              {event?.time ? (
                <View className="flex-row items-center gap-2">
                  <Clock size={14} color={colors.primary} />
                  <Text className="text-sm text-foreground">{event.time}</Text>
                </View>
              ) : null}
              {event?.location ? (
                <View className="flex-row items-center gap-2">
                  <MapPin size={14} color={colors.primary} />
                  <Text className="text-sm text-foreground">
                    {event.location}
                  </Text>
                </View>
              ) : null}
            </View>

            {status === "upcoming" ? (
              <Text className="text-center text-xs text-muted-foreground mt-2">
                Show this QR code at the entrance for verification
              </Text>
            ) : null}
          </View>

          <Button
            variant="outline"
            className="mt-5"
            onPress={() =>
              navigation.navigate("EventDetail", { id: String(pass.event_id) })
            }
          >
            View Event Details
          </Button>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

function StatusBanner({ status }: { status: PassStatus }) {
  const colors = useColors();
  if (status === "checked-in") {
    return (
      <View className="flex-row items-center gap-2 rounded-xl bg-success/10 px-4 py-3">
        <CheckCircle2 size={18} color={colors.success} />
        <Text className="text-sm font-semibold text-success">
          Checked in — enjoy the event!
        </Text>
      </View>
    );
  }
  if (status === "cancelled") {
    return (
      <View className="rounded-xl bg-destructive/10 px-4 py-3">
        <Text className="text-sm font-semibold text-destructive">
          Event cancelled
        </Text>
        <Text className="text-xs text-muted-foreground mt-0.5">
          This pass is no longer valid.
        </Text>
      </View>
    );
  }
  if (status === "refunded") {
    return (
      <View className="rounded-xl bg-muted px-4 py-3">
        <Text className="text-sm font-semibold text-foreground">
          Refunded
        </Text>
        <Text className="text-xs text-muted-foreground mt-0.5">
          Your payment has been refunded.
        </Text>
      </View>
    );
  }
  return (
    <View className="rounded-xl bg-primary/10 px-4 py-3">
      <Text className="text-sm font-semibold text-primary">Upcoming</Text>
      <Text className="text-xs text-muted-foreground mt-0.5">
        Save this QR — you'll need it at the door.
      </Text>
    </View>
  );
}

export default QRView;
