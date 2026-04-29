import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  LogOut,
  MapPin,
  Ticket,
} from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { format } from "date-fns";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { EmptyState } from "../components/ui/empty-state";
import { ErrorState } from "../components/ui/error-state";
import { PageLoader } from "../components/ui/page-loader";

import { useAuth } from "../hooks/useAuth";
import { useMyRegistrations } from "../hooks/useEvents";
import { useColors, useMutedIconColor } from "../theme/colors";
import type { EventRegistration } from "../store/api/eventsApi";

/**
 * MyPasses — list of the current user's event registrations with status,
 * countdown, and a tappable mini-QR that opens the full QR view.
 *
 * Status order (first match wins, mirrors QRView):
 *   refunded → cancelled → checked-in → upcoming/past
 */

type PassStatus = "upcoming" | "past" | "checked-in" | "cancelled" | "refunded";

interface DerivedPass extends EventRegistration {
  status: PassStatus;
  startsAt: number | null;
}

function deriveStatus(reg: EventRegistration): PassStatus {
  if (reg.refund_status === "refunded") return "refunded";
  if (reg.cancelled_at) return "cancelled";
  const ev = reg.event as any;
  if (ev?.cancelled_at || ev?.status === "cancelled") return "cancelled";
  if (reg.checked_in) return "checked-in";
  if (reg.event?.date) {
    const start = new Date(reg.event.date).getTime();
    if (!Number.isNaN(start) && start < Date.now() - 12 * 60 * 60 * 1000) {
      return "past";
    }
  }
  return "upcoming";
}

function getStartsAt(reg: EventRegistration): number | null {
  if (!reg.event?.date) return null;
  const ts = new Date(reg.event.date).getTime();
  return Number.isNaN(ts) ? null : ts;
}

/** "Starts in 5h", "Starts in 12 min", or "Started" — coarse, no flicker. */
function formatCountdown(now: number, startsAt: number | null): string | null {
  if (startsAt === null) return null;
  const diffMs = startsAt - now;
  if (diffMs <= 0) return "Started";
  const min = Math.round(diffMs / 60000);
  if (min < 60) return `Starts in ${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `Starts in ${hr}h`;
  const days = Math.round(hr / 24);
  return `Starts in ${days}d`;
}

const MyPasses = () => {
  const navigation = useNavigation<any>();
  const { user, signOut, loading: authLoading } = useAuth();
  const colors = useColors();
  const mutedIcon = useMutedIconColor();
  const {
    registrations,
    isLoading,
    isError,
    refetch,
  } = useMyRegistrations();

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // Tick every minute for the countdown without re-rendering individual cards
  // unnecessarily — the derived `now` flows down via memoized props.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const passes = useMemo<DerivedPass[]>(() => {
    const list = (registrations as EventRegistration[]) ?? [];
    return list.map((r) => ({
      ...r,
      status: deriveStatus(r),
      startsAt: getStartsAt(r),
    }));
  }, [registrations]);

  // Auth gate
  if (authLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-sm text-muted-foreground">Loading…</Text>
      </View>
    );
  }
  if (!user) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 mb-4">
          <Ticket size={36} color={colors.primary} />
        </View>
        <Text className="text-xl font-bold text-foreground">
          Your Event Passes
        </Text>
        <Text className="text-sm text-muted-foreground mt-2 text-center">
          Sign in to view your registered events and QR passes
        </Text>
        <Button
          onPress={() => navigation.navigate("Auth")}
          className="mt-5 px-8 rounded-xl"
        >
          Sign In
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="bg-primary px-4 py-4 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-lg font-bold text-primary-foreground">
            My Passes
          </Text>
          <Text className="text-xs text-primary-foreground/70" numberOfLines={1}>
            {(user as any).email ?? user.phone ?? user.name}
          </Text>
        </View>
        <Pressable
          onPress={signOut}
          accessibilityLabel="Sign out"
          hitSlop={10}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-foreground/10"
        >
          <LogOut size={14} color={colors.primaryForeground} />
          <Text className="text-xs font-medium text-primary-foreground">
            Sign Out
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 24, paddingTop: 16, gap: 12 }}
        className="px-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading ? (
          <PageLoader fullScreen={false} />
        ) : isError ? (
          <ErrorState
            compact
            title="Couldn't load passes"
            onRetry={() => refetch()}
          />
        ) : passes.length === 0 ? (
          <EmptyState
            compact
            icon={<Ticket size={42} color={mutedIcon} />}
            title="No event passes yet"
            message="Browse events and register to see your passes here."
            actionLabel="Browse Events"
            onAction={() => navigation.navigate("Events")}
          />
        ) : (
          passes.map((pass) => (
            <PassCard
              key={pass.id}
              pass={pass}
              now={now}
              onPress={() =>
                navigation.navigate("QRView", { passId: pass.id })
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

interface PassCardProps {
  pass: DerivedPass;
  now: number;
  onPress: () => void;
}

const PassCard = memo(function PassCard({ pass, now, onPress }: PassCardProps) {
  const mutedIcon = useMutedIconColor();
  const dim = pass.status === "cancelled" || pass.status === "refunded";
  const countdown =
    pass.status === "upcoming" ? formatCountdown(now, pass.startsAt) : null;

  return (
    <Pressable onPress={onPress} accessibilityLabel="Open pass">
      <Card className={`overflow-hidden ${dim ? "opacity-60" : ""}`}>
        <CardContent className="p-0">
          <View className="p-4 gap-2">
            <View className="flex-row items-start justify-between gap-2">
              <Text
                className="font-bold text-foreground flex-1"
                numberOfLines={1}
              >
                {pass.event?.title ?? "Event"}
              </Text>
              <StatusPill status={pass.status} />
            </View>

            <View className="flex-row flex-wrap gap-3">
              {pass.event?.date ? (
                <View className="flex-row items-center gap-1">
                  <CalendarDays size={12} color={mutedIcon} />
                  <Text className="text-xs text-muted-foreground">
                    {format(new Date(pass.event.date), "MMM d, yyyy")}
                  </Text>
                </View>
              ) : null}
              {pass.event?.time ? (
                <View className="flex-row items-center gap-1">
                  <Clock size={12} color={mutedIcon} />
                  <Text className="text-xs text-muted-foreground">
                    {pass.event.time}
                  </Text>
                </View>
              ) : null}
              {pass.event?.location ? (
                <View className="flex-row items-center gap-1 flex-1 min-w-[100px]">
                  <MapPin size={12} color={mutedIcon} />
                  <Text
                    className="text-xs text-muted-foreground"
                    numberOfLines={1}
                  >
                    {pass.event.location}
                  </Text>
                </View>
              ) : null}
            </View>

            {countdown ? (
              <Text className="text-xs font-semibold text-primary">
                ⏱ {countdown}
              </Text>
            ) : null}
          </View>

          {pass.qr_code ? (
            <View className="border-t border-dashed border-border bg-muted/30 p-4 items-center gap-2">
              <View
                style={{ backgroundColor: "#ffffff", padding: 8, borderRadius: 12 }}
              >
                <QRCode value={pass.qr_code} size={96} />
              </View>
              <Text className="text-[10px] text-primary font-medium">
                Tap to view full pass
              </Text>
            </View>
          ) : (
            <View className="border-t border-dashed border-border bg-muted/30 p-3 items-center">
              <Text className="text-xs text-muted-foreground">
                Tap to view details
              </Text>
            </View>
          )}
        </CardContent>
      </Card>
    </Pressable>
  );
});

function StatusPill({ status }: { status: PassStatus }) {
  const colors = useColors();
  if (status === "checked-in") {
    return (
      <View className="flex-row items-center gap-1 rounded-full bg-success/10 px-2 py-0.5">
        <CheckCircle2 size={12} color={colors.success} />
        <Text className="text-[10px] font-semibold text-success">
          Checked in
        </Text>
      </View>
    );
  }
  if (status === "cancelled") {
    return (
      <Badge className="bg-destructive/10 text-destructive border-none text-[10px]">
        Cancelled
      </Badge>
    );
  }
  if (status === "refunded") {
    return (
      <Badge className="bg-muted text-muted-foreground border-none text-[10px]">
        Refunded
      </Badge>
    );
  }
  if (status === "past") {
    return (
      <Badge className="bg-muted text-muted-foreground border-none text-[10px]">
        Past
      </Badge>
    );
  }
  return (
    <Badge className="bg-primary/10 text-primary border-none text-[10px]">
      Upcoming
    </Badge>
  );
}

export default MyPasses;
