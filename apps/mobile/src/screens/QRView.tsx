import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft, Calendar, CheckCircle2, Clock, MapPin, Minus, Plus } from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { format } from "date-fns";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { ErrorState } from "../components/ui/error-state";
import { PageLoader } from "../components/ui/page-loader";
import { useColors } from "../theme/colors";
import { useMyRegistrations } from "../hooks/useEvents";
import type { EventRegistration } from "../store/api/eventsApi";
import { usePartialCancelTicketsMutation } from "../store/api/eventsApi";

/**
 * QRView — full-screen QR pass. Reads the registration row from the
 * cached `useMyRegistrations()` query so it stays in sync after RTK
 * cache invalidations (e.g. after the user gets checked in).
 *
 * Status logic:
 *   • refunded        → fully cancelled / no active tickets remain
 *   • cancelled       → event cancelled by organizer
 *   • checked-in      → registration.checked_in === true
 *   • upcoming        → otherwise (default, includes partial_refund with active tickets)
 */

type PassStatus = "upcoming" | "checked-in" | "cancelled" | "refunded";

function deriveStatus(reg: EventRegistration | undefined): PassStatus {
  if (!reg) return "upcoming";
  const totalTickets = reg.ticket_count ?? 0;
  const cancelledTickets = reg.cancelled_count ?? 0;
  const activeTickets = Math.max(0, totalTickets - cancelledTickets);

  // Treat as fully refunded only when no active tickets remain.
  // This also tolerates older/stale refund_status values set during partial cancels.
  if (reg.cancelled_at || activeTickets <= 0) return "refunded";

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
  const [partialCancel, { isLoading: isCancelling }] = usePartialCancelTicketsMutation();
  const [cancelCount, setCancelCount] = useState(1);

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
          <StatusBanner status={status} pass={pass} />

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
            <View className="flex-row flex-wrap gap-2">
              {pass.payment_status === "paid" ? (
                <Badge className="bg-success/10 text-success border-none text-xs">
                  Paid{pass.amount_paid != null ? ` ₹${pass.amount_paid}` : ""}
                </Badge>
              ) : null}
              {(() => {
                const activeT = (pass.ticket_count ?? 0) - (pass.cancelled_count ?? 0);
                const hasPartialCancel = (pass.cancelled_count ?? 0) > 0 && activeT > 0;
                return (
                  <Badge className="bg-primary/10 text-primary border-none text-xs">
                    {hasPartialCancel
                      ? `${activeT} of ${pass.ticket_count} tickets active`
                      : `${pass.ticket_count} ${pass.ticket_count > 1 ? "tickets" : "ticket"}`}
                  </Badge>
                );
              })()}
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

          {/* Partial ticket cancellation — only for upcoming paid/free registrations */}
          {status === "upcoming" && !pass.checked_in && (
            (() => {
              const activeTickets = (pass.ticket_count ?? 0) - (pass.cancelled_count ?? 0);
              if (activeTickets < 1) return null;

              const perTicketAmount =
                pass.payment_status === "paid" && pass.amount_paid && pass.ticket_count
                  ? pass.amount_paid / pass.ticket_count
                  : 0;
              const refundAmount = perTicketAmount * cancelCount;

              const handleCancel = () => {
                const refundLine =
                  pass.payment_status === "paid" && refundAmount > 0
                    ? `\nRefund: ₹${refundAmount.toFixed(2)} will be credited back.`
                    : "\nThese tickets will be released (no charge).";
                Alert.alert(
                  "Cancel Tickets",
                  `Cancel ${cancelCount} ticket${cancelCount > 1 ? "s" : ""}?${refundLine}`,
                  [
                    { text: "No", style: "cancel" },
                    {
                      text: "Yes, Cancel",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          const result = await partialCancel({
                            eventId: pass.event_id,
                            cancel_count: cancelCount,
                          }).unwrap();
                          const refundMsg = result.refund_amount
                            ? ` ₹${result.refund_amount.toFixed(2)} will be refunded.`
                            : "";
                          Alert.alert(
                            "Done",
                            cancelCount === activeTickets
                              ? `All tickets cancelled.${refundMsg}`
                              : `${cancelCount} ticket${cancelCount > 1 ? "s" : ""} cancelled.${refundMsg} ${activeTickets - cancelCount} ticket${activeTickets - cancelCount > 1 ? "s" : ""} still valid.`,
                          );
                          setCancelCount(1);
                          refetch();
                        } catch (e: any) {
                          Alert.alert("Error", e?.data?.error ?? "Could not cancel tickets. Please try again.");
                        }
                      },
                    },
                  ],
                );
              };

              return (
                <View className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 gap-3">
                  <Text className="text-sm font-semibold text-destructive">Cancel Tickets</Text>
                  <Text className="text-xs text-muted-foreground">
                    You have {activeTickets} active ticket{activeTickets > 1 ? "s" : ""}. Select how many to cancel:
                  </Text>
                  <View className="flex-row items-center justify-center gap-4">
                    <Pressable
                      onPress={() => setCancelCount((v) => Math.max(1, v - 1))}
                      disabled={cancelCount <= 1}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: cancelCount <= 1 ? "#f1f5f9" : "#fee2e2",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Minus size={16} color={cancelCount <= 1 ? "#94a3b8" : "#dc2626"} />
                    </Pressable>
                    <Text className="text-2xl font-bold text-foreground w-8 text-center">{cancelCount}</Text>
                    <Pressable
                      onPress={() => setCancelCount((v) => Math.min(activeTickets, v + 1))}
                      disabled={cancelCount >= activeTickets}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: cancelCount >= activeTickets ? "#f1f5f9" : "#fee2e2",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Plus size={16} color={cancelCount >= activeTickets ? "#94a3b8" : "#dc2626"} />
                    </Pressable>
                  </View>
                  <Button
                    variant="destructive"
                    className="mt-1"
                    onPress={handleCancel}
                    disabled={isCancelling}
                  >
                    {isCancelling ? "Cancelling…" : `Cancel ${cancelCount} Ticket${cancelCount > 1 ? "s" : ""}`}
                  </Button>
                </View>
              );
            })()
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

function StatusBanner({ status, pass }: { status: PassStatus; pass: EventRegistration }) {
  const colors = useColors();
  const activeTickets = (pass.ticket_count ?? 0) - (pass.cancelled_count ?? 0);
  const hasPartialCancel = (pass.cancelled_count ?? 0) > 0 && activeTickets > 0;
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
    <View className="gap-2">
      <View className="rounded-xl bg-primary/10 px-4 py-3">
        <Text className="text-sm font-semibold text-primary">Upcoming</Text>
        <Text className="text-xs text-muted-foreground mt-0.5">
          Save this QR — you'll need it at the door.
        </Text>
      </View>
      {hasPartialCancel && (
        <View className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <Text className="text-sm font-semibold text-amber-700">
            {activeTickets} of {pass.ticket_count} tickets active
          </Text>
          <Text className="text-xs text-amber-600 mt-0.5">
            {pass.cancelled_count} ticket{(pass.cancelled_count ?? 0) > 1 ? "s" : ""} cancelled and refunded. This QR admits {activeTickets} {activeTickets > 1 ? "people" : "person"}.
          </Text>
        </View>
      )}
    </View>
  );
}

export default QRView;
