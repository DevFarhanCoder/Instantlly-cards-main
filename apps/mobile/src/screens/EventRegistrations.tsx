import { useCallback, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  ArrowLeft,
  CheckCircle,
  RotateCcw,
  Ticket,
  User,
  Users,
  XCircle,
} from "lucide-react-native";
import { format } from "date-fns";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  useGetEventQuery,
  useGetEventRegistrationsQuery,
} from "../store/api/eventsApi";
import { useRefundRegistration } from "../hooks/useEvents";
import { toast } from "../lib/toast";
import { useColors, useIconColor, useMutedIconColor } from "../theme/colors";

type FilterTab = "all" | "checked_in" | "pending" | "refunded";

const EventRegistrations = () => {
  const iconColor = useIconColor();
  const mutedIcon = useMutedIconColor();
  const colors = useColors();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id = route?.params?.id;
  const numericId = typeof id === "string" ? parseInt(id, 10) : id;

  const { data: event } = useGetEventQuery(numericId, { skip: !numericId });
  const {
    data: registrations = [],
    isLoading,
    refetch: refetchRegistrations,
  } = useGetEventRegistrationsQuery(numericId, { skip: !numericId });

  const refundMutation = useRefundRegistration();

  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [refundTarget, setRefundTarget] = useState<any | null>(null);
  const [refundReason, setRefundReason] = useState("");

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchRegistrations();
    } finally {
      setRefreshing(false);
    }
  }, [refetchRegistrations]);

  const counts = useMemo(() => {
    let checkedIn = 0;
    let refunded = 0;
    for (const r of registrations as any[]) {
      if (r.refund_status === "refunded" || r.cancelled_at) refunded++;
      else if (r.checked_in) checkedIn++;
    }
    return {
      total: registrations.length,
      checkedIn,
      pending: registrations.length - checkedIn - refunded,
      refunded,
    };
  }, [registrations]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (registrations as any[]).filter((r) => {
      const isRefunded = r.refund_status === "refunded" || r.cancelled_at;
      if (filter === "checked_in" && !r.checked_in) return false;
      if (filter === "pending" && (r.checked_in || isRefunded)) return false;
      if (filter === "refunded" && !isRefunded) return false;
      if (!q) return true;
      const name = (r.user?.name || "").toLowerCase();
      const phone = (r.user?.phone || "").toLowerCase();
      const qrc = (r.qr_code || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || qrc.includes(q);
    });
  }, [registrations, filter, searchQuery]);

  const handleConfirmRefund = useCallback(async () => {
    if (!refundTarget || !numericId) return;
    try {
      await refundMutation.mutateAsync({
        event_id: numericId,
        registration_id: refundTarget.id,
        reason: refundReason.trim() || undefined,
      });
      toast.success("Refund issued");
      setRefundTarget(null);
      setRefundReason("");
      await refetchRegistrations();
    } catch (err: any) {
      const msg = err?.data?.error || err?.message || "Refund failed";
      toast.error(msg);
    }
  }, [refundTarget, refundReason, refundMutation, numericId, refetchRegistrations]);

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <ArrowLeft size={20} color={iconColor} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground">
            Registrations
          </Text>
          {event ? (
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {event.title}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => navigation.navigate("EventScanner")}
          accessibilityLabel="Open scanner"
          className="px-3 py-1.5 rounded-lg bg-primary/10"
        >
          <Text className="text-xs font-semibold text-primary">Scan QR</Text>
        </Pressable>
      </View>

      <View className="px-4 py-3 flex-row gap-3">
        <KpiTile
          icon={<Users size={18} color={colors.primary} />}
          value={counts.total}
          label="Total"
        />
        <KpiTile
          icon={<CheckCircle size={18} color={colors.success} />}
          value={counts.checkedIn}
          label="Checked-in"
        />
        <KpiTile
          icon={<Ticket size={18} color={colors.primary} />}
          value={counts.pending}
          label="Pending"
        />
        {counts.refunded > 0 ? (
          <KpiTile
            icon={<RotateCcw size={18} color={colors.destructive} />}
            value={counts.refunded}
            label="Refunded"
          />
        ) : null}
      </View>

      <View className="px-4 pb-2 flex-row gap-2">
        {(
          [
            { id: "all", label: `All (${counts.total})` },
            { id: "pending", label: `Pending (${counts.pending})` },
            { id: "checked_in", label: `Checked-in (${counts.checkedIn})` },
            { id: "refunded", label: `Refunded (${counts.refunded})` },
          ] as Array<{ id: FilterTab; label: string }>
        ).map((tab) => {
          const active = filter === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-full ${
                active ? "bg-primary" : "bg-muted"
              }`}
              testID={`filter-${tab.id}`}
            >
              <Text
                className={`text-xs font-semibold ${
                  active ? "text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="px-4 pb-2">
        <Input
          placeholder="Search by name, phone, or QR…"
          value={searchQuery}
          onChangeText={setSearchQuery}
          testID="reg-search"
        />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
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
          <View className="items-center py-10">
            <Text className="text-sm text-muted-foreground">
              Loading registrations…
            </Text>
          </View>
        ) : filtered.length === 0 ? (
          <View className="items-center py-10 gap-3">
            <Users size={48} color={mutedIcon} />
            <Text className="text-sm text-muted-foreground">
              {registrations.length === 0
                ? "No registrations yet"
                : "No matches for this filter"}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {filtered.map((reg: any) => (
              <RegistrationCard
                key={reg.id}
                reg={reg}
                colors={colors}
                onRefund={() => setRefundTarget(reg)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!refundTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setRefundTarget(null)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setRefundTarget(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-card border-t border-border rounded-t-2xl p-5 gap-4"
          >
            <Text className="text-base font-bold text-foreground">
              Refund {refundTarget?.user?.name || "registration"}?
            </Text>
            <Text className="text-xs text-muted-foreground">
              {refundTarget?.payment_status === "paid"
                ? `Razorpay will issue ₹${refundTarget?.amount_paid ?? "?"}. The seat will be released and any waitlist users will be notified.`
                : "This will release the seat and notify any waitlist users."}
            </Text>
            <View className="gap-2">
              <Text className="text-xs text-muted-foreground">
                Reason (optional)
              </Text>
              <Textarea
                value={refundReason}
                onChangeText={setRefundReason}
                placeholder="e.g. attendee requested cancellation"
                rows={3}
                testID="refund-reason"
              />
            </View>
            <View className="flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onPress={() => setRefundTarget(null)}
                disabled={refundMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl bg-destructive"
                onPress={handleConfirmRefund}
                disabled={refundMutation.isPending}
                testID="confirm-refund"
              >
                {refundMutation.isPending ? "Processing…" : "Refund"}
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

function KpiTile({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <View className="flex-1 rounded-xl border border-border bg-card p-3 items-center">
      {icon}
      <Text className="text-lg font-bold text-foreground mt-1">{value}</Text>
      <Text className="text-[10px] text-muted-foreground">{label}</Text>
    </View>
  );
}

function RegistrationCard({
  reg,
  colors,
  onRefund,
}: {
  reg: any;
  colors: ReturnType<typeof useColors>;
  onRefund: () => void;
}) {
  const isRefunded = reg.refund_status === "refunded" || reg.cancelled_at;
  const isPaid = reg.payment_status === "paid";
  const isFree = reg.payment_status === "not_required";
  const canRefund = !isRefunded && (isPaid || isFree);

  return (
    <Card
      className={`overflow-hidden ${isRefunded ? "opacity-60" : ""}`}
      testID={`reg-card-${reg.id}`}
    >
      <CardContent className="p-4 gap-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="h-9 w-9 rounded-full bg-primary/10 items-center justify-center">
              <User size={16} color={colors.primary} />
            </View>
            <View>
              <Text className="text-sm font-semibold text-foreground">
                {reg.user?.name || `User #${reg.user_id}`}
              </Text>
              {reg.user?.phone ? (
                <Text className="text-[11px] text-muted-foreground">
                  {reg.user.phone}
                </Text>
              ) : null}
            </View>
          </View>
          <Badge className="bg-primary/10 text-primary border-none text-[10px]">
            {reg.ticket_count || 1} ticket
            {(reg.ticket_count || 1) > 1 ? "s" : ""}
          </Badge>
        </View>

        <View className="flex-row items-center gap-2 flex-wrap mt-1">
          {isRefunded ? (
            <Badge className="bg-destructive/10 text-destructive border-none text-[10px]">
              <View className="flex-row items-center gap-1">
                <XCircle size={10} color={colors.destructive} />
                <Text className="text-[10px] font-semibold text-destructive">
                  Refunded
                </Text>
              </View>
            </Badge>
          ) : reg.checked_in ? (
            <Badge className="bg-success/10 border-none text-[10px]">
              <View className="flex-row items-center gap-1">
                <CheckCircle size={10} color={colors.success} />
                <Text className="text-[10px] font-semibold text-success">
                  Checked in
                  {reg.checked_in_at
                    ? ` · ${format(new Date(reg.checked_in_at), "MMM d, p")}`
                    : ""}
                </Text>
              </View>
            </Badge>
          ) : (
            <Badge className="bg-muted border-none text-[10px]">
              <Text className="text-[10px] text-muted-foreground">Pending</Text>
            </Badge>
          )}

          {reg.payment_status && reg.payment_status !== "not_required" ? (
            <Badge
              className={
                reg.payment_status === "paid"
                  ? "bg-success/10 text-success border-none text-[10px]"
                  : "bg-amber-100 text-amber-700 border-none text-[10px]"
              }
            >
              {reg.payment_status === "paid"
                ? `Paid${reg.amount_paid != null ? ` ₹${reg.amount_paid}` : ""}`
                : reg.payment_status}
            </Badge>
          ) : null}
        </View>

        <View className="flex-row items-center justify-between mt-2">
          <Text className="text-[11px] text-muted-foreground">
            Registered{" "}
            {format(new Date(reg.registered_at), "MMM d, yyyy 'at' p")}
          </Text>
          {canRefund ? (
            <Pressable
              onPress={onRefund}
              accessibilityLabel="Refund registration"
              className="px-3 py-1.5 rounded-lg border border-destructive/40 bg-destructive/5"
              testID={`refund-btn-${reg.id}`}
            >
              <Text className="text-[11px] font-semibold text-destructive">
                Refund
              </Text>
            </Pressable>
          ) : null}
        </View>
      </CardContent>
    </Card>
  );
}

export default EventRegistrations;
