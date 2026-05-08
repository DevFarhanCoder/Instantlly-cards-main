import { useCallback, useState } from "react";
import { Alert, Image, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Pencil,
  Plus,
  Tag,
  Ticket,
  Trash2,
  Users,
  X,
} from "lucide-react-native";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { useAuth } from "../hooks/useAuth";
import { format, isValid } from "date-fns";
import { useIconColor } from "../theme/colors";
import { toast } from "../lib/toast";
import { formatINR } from "../lib/utils";
import {
  useGetMyCreatedVouchersQuery,
  useUpdateVoucherStatusMutation,
  useDeleteVoucherMutation,
  useGetVoucherClaimsQuery,
  useGetVoucherInstallmentLedgerQuery,
} from "../store/api/vouchersApi";

const safeFormat = (d: any, fmt: string, fb = "—") => {
  if (!d) return fb;
  const date = new Date(d);
  return isValid(date) ? format(date, fmt) : fb;
};

const MyCreatedVouchers = () => {
  const iconColor = useIconColor();
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const { data: vouchers = [], isLoading, refetch } = useGetMyCreatedVouchersQuery(undefined, { skip: !user });
  const [updateStatus] = useUpdateVoucherStatusMutation();
  const [deleteVoucher, { isLoading: isDeleting }] = useDeleteVoucherMutation();

  const [refreshing, setRefreshing] = useState(false);
  const [claimsVoucherId, setClaimsVoucherId] = useState<number | null>(null);
  const [ledgerVoucherId, setLedgerVoucherId] = useState<number | null>(null);

  const { data: claims = [], isFetching: claimsFetching } = useGetVoucherClaimsQuery(
    claimsVoucherId ?? 0,
    { skip: !claimsVoucherId }
  );
  const { data: ledger = [], isFetching: ledgerFetching } = useGetVoucherInstallmentLedgerQuery(
    ledgerVoucherId ?? 0,
    { skip: !ledgerVoucherId }
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const toggleStatus = async (id: number, current: string) => {
    const next = current === "active" ? "inactive" : "active";
    try {
      await updateStatus({ id, status: next }).unwrap();
      toast.success(next === "active" ? "Voucher activated" : "Voucher deactivated");
    } catch (e: any) {
      toast.error(e?.data?.error || "Failed to update voucher");
    }
  };

  const handleEdit = (id: number) => {
    navigation.navigate("VoucherCreate", { voucherId: id });
  };

  const handleDelete = (v: any) => {
    const hasClaims = (v.claimed_count || 0) > 0;
    Alert.alert(
      hasClaims ? "Deactivate Voucher?" : "Delete Voucher?",
      hasClaims
        ? "This voucher has active claims and cannot be deleted. It will be marked inactive instead."
        : "Are you sure you want to permanently delete this voucher? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: hasClaims ? "Deactivate" : "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await deleteVoucher(v.id).unwrap();
              if (res?.soft_deleted) {
                toast.success("Voucher deactivated");
              } else {
                toast.success("Voucher deleted");
              }
            } catch (e: any) {
              toast.error(e?.data?.error || "Failed to delete voucher");
            }
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Ticket size={48} color="#6a7181" />
        <Text className="mt-3 text-sm text-muted-foreground">Sign in to view your created vouchers</Text>
        <Button className="mt-4 rounded-xl" onPress={() => navigation.navigate("Auth")}>Sign In</Button>
      </View>
    );
  }

  const activeVouchers = vouchers.filter((v: any) => v.status === "active").length;
  const totalClaims = vouchers.reduce((s: number, v: any) => s + (v.claimed_count || 0), 0);

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between border-b border-border bg-card px-4 py-4">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color={iconColor} />
          </Pressable>
          <Text className="text-lg font-bold text-foreground">My Created Vouchers</Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate("VoucherCreate")}
          className="flex-row items-center gap-1 rounded-lg bg-primary px-3 py-1.5"
        >
          <Plus size={14} color="#fff" />
          <Text className="text-xs font-semibold text-primary-foreground">New</Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2463eb"]} tintColor="#2463eb" />
        }
      >
        <View className="px-4 py-4 gap-4">
          {/* Stats */}
          <View className="flex-row gap-3">
            <View className="flex-1 rounded-xl border border-border bg-card p-3 items-center">
              <Tag size={18} color="#2463eb" />
              <Text className="mt-1 text-xl font-bold text-foreground">{vouchers.length}</Text>
              <Text className="text-[10px] text-muted-foreground">Total</Text>
            </View>
            <View className="flex-1 rounded-xl border border-border bg-card p-3 items-center">
              <CheckCircle2 size={18} color="#16a34a" />
              <Text className="mt-1 text-xl font-bold text-foreground">{activeVouchers}</Text>
              <Text className="text-[10px] text-muted-foreground">Active</Text>
            </View>
            <View className="flex-1 rounded-xl border border-border bg-card p-3 items-center">
              <Users size={18} color="#f97316" />
              <Text className="mt-1 text-xl font-bold text-foreground">{totalClaims}</Text>
              <Text className="text-[10px] text-muted-foreground">Claimed</Text>
            </View>
          </View>

          {/* List */}
          {isLoading ? (
            <View className="gap-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
            </View>
          ) : vouchers.length === 0 ? (
            <View className="items-center py-16">
              <Ticket size={48} color="#6a7181" />
              <Text className="mt-3 text-sm text-muted-foreground">No vouchers created yet</Text>
              <Button className="mt-4 rounded-xl" onPress={() => navigation.navigate("VoucherCreate")}>
                Create Voucher
              </Button>
            </View>
          ) : (
            <View className="gap-3">
              {vouchers.map((v: any) => (
                <View key={v.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  <View className="flex-row gap-3 p-3">
                    <View className="h-16 w-16 items-center justify-center rounded-lg bg-muted overflow-hidden">
                      {v.voucher_image ? (
                        <Image source={{ uri: v.voucher_image }} className="w-full h-full" resizeMode="contain" />
                      ) : (
                        <Text className="text-3xl">🎁</Text>
                      )}
                    </View>
                    <View className="flex-1 gap-1">
                      <View className="flex-row items-start justify-between gap-2">
                        <Text className="flex-1 text-sm font-semibold text-foreground" numberOfLines={1}>
                          {v.title}
                        </Text>
                        <View className={`rounded-full px-2 py-0.5 ${
                          v.status === "active" ? "bg-green-500/10" : "bg-muted"
                        }`}>
                          <Text className={`text-[10px] font-semibold ${
                            v.status === "active" ? "text-green-600" : "text-muted-foreground"
                          }`}>
                            {v.status}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-sm font-bold text-primary">₹{formatINR(Number(v.original_price ?? 0))}</Text>
                        {Number(v.original_price) > 0 && Number(v.discounted_price) >= 0 && Number(v.original_price) > Number(v.discounted_price) ? (
                          <Text className="text-[10px] text-muted-foreground">→ ₹{formatINR(Number(v.discounted_price))} with promo</Text>
                        ) : null}
                        {v.allows_installment ? (
                          <View className="rounded-full bg-amber-500/10 px-2 py-0.5">
                            <Text className="text-[10px] font-semibold text-amber-600">Installment</Text>
                          </View>
                        ) : null}
                      </View>
                      <View className="flex-row items-center gap-3">
                        <View className="flex-row items-center gap-1">
                          <Users size={11} color="#6a7181" />
                          <Text className="text-[11px] text-muted-foreground">
                            {v.claimed_count || 0}{v.max_claims ? `/${v.max_claims}` : ""} claimed
                          </Text>
                        </View>
                        {v.expires_at ? (
                          <View className="flex-row items-center gap-1">
                            <Clock size={11} color="#6a7181" />
                            <Text className="text-[11px] text-muted-foreground">
                              till {safeFormat(v.expires_at, "d MMM")}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  <View className="flex-row gap-2 border-t border-border bg-muted/30 px-3 py-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 rounded-lg"
                      textClassName="text-[11px]"
                      onPress={() => setClaimsVoucherId(v.id)}
                    >
                      <View className="flex-row items-center justify-center gap-1">
                        <Users size={12} color={iconColor} />
                        <Text className="text-[11px] font-medium text-foreground">Claims</Text>
                      </View>
                    </Button>
                    {v.allows_installment && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 rounded-lg"
                        textClassName="text-[11px]"
                        onPress={() => setLedgerVoucherId(v.id)}
                      >
                        <View className="flex-row items-center justify-center gap-1">
                          <CreditCard size={12} color={iconColor} />
                          <Text className="text-[11px] font-medium text-foreground">Ledger</Text>
                        </View>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className={`flex-1 rounded-lg ${v.status === "active" ? "border-destructive/40" : "border-primary/40"}`}
                      textClassName="text-[11px]"
                      onPress={() => toggleStatus(v.id, v.status)}
                    >
                      <Text className={`text-[11px] font-semibold ${v.status === "active" ? "text-destructive" : "text-primary"}`}>
                        {v.status === "active" ? "Deactivate" : "Activate"}
                      </Text>
                    </Button>
                  </View>
                  <View className="flex-row gap-2 border-t border-border bg-muted/20 px-3 py-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 rounded-lg"
                      textClassName="text-[11px]"
                      onPress={() => handleEdit(v.id)}
                    >
                      <View className="flex-row items-center justify-center gap-1">
                        <Pencil size={12} color={iconColor} />
                        <Text className="text-[11px] font-medium text-foreground">Edit</Text>
                      </View>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 rounded-lg border-destructive/40"
                      textClassName="text-[11px]"
                      onPress={() => handleDelete(v)}
                      disabled={isDeleting}
                    >
                      <View className="flex-row items-center justify-center gap-1">
                        <Trash2 size={12} color="#ef4444" />
                        <Text className="text-[11px] font-semibold text-destructive">Delete</Text>
                      </View>
                    </Button>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Claims Modal */}
      <Dialog open={!!claimsVoucherId} onOpenChange={(open) => !open && setClaimsVoucherId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Voucher Claims</DialogTitle>
          </DialogHeader>
          {claimsFetching ? (
            <View className="py-8 items-center"><Text className="text-sm text-muted-foreground">Loading…</Text></View>
          ) : claims.length === 0 ? (
            <View className="py-8 items-center"><Text className="text-sm text-muted-foreground">No claims yet</Text></View>
          ) : (
            <ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
              <View className="gap-2 py-2">
                {claims.map((c: any) => (
                  <View key={c.claim_id} className="rounded-lg border border-border bg-muted/30 p-3 gap-1">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-semibold text-foreground">{c.user_name || "Customer"}</Text>
                      <Text className={`text-[10px] font-semibold capitalize ${
                        c.status === "active" ? "text-green-600" :
                        c.status === "redeemed" ? "text-primary" :
                        c.status === "expired" ? "text-muted-foreground" : "text-foreground"
                      }`}>
                        {c.status}
                      </Text>
                    </View>
                    <Text className="text-[11px] text-muted-foreground">{c.user_phone}</Text>
                    <View className="flex-row items-center gap-3 mt-1">
                      <Text className="text-[10px] text-muted-foreground">
                        Claimed: {safeFormat(c.claimed_at, "d MMM yyyy")}
                      </Text>
                      {c.redeemed_at && (
                        <Text className="text-[10px] text-muted-foreground">
                          Redeemed: {safeFormat(c.redeemed_at, "d MMM yyyy")}
                        </Text>
                      )}
                    </View>
                    {c.installment_status && (
                      <View className="mt-1 rounded-md bg-amber-500/10 px-2 py-1 flex-row justify-between">
                        <Text className="text-[10px] font-semibold text-amber-700">
                          Installment: {c.installment_status}
                        </Text>
                        <Text className="text-[10px] font-semibold text-amber-700">
                          Paid ₹{formatINR(c.paid_amount ?? 0)}
                          {c.remaining_balance != null && c.remaining_balance > 0
                            ? ` · Due ₹${formatINR(c.remaining_balance)}`
                            : ""}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
          <Button className="w-full rounded-xl mt-2" onPress={() => setClaimsVoucherId(null)}>Close</Button>
        </DialogContent>
      </Dialog>

      {/* Installment Ledger Modal */}
      <Dialog open={!!ledgerVoucherId} onOpenChange={(open) => !open && setLedgerVoucherId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Installment Ledger</DialogTitle>
          </DialogHeader>
          {ledgerFetching ? (
            <View className="py-8 items-center"><Text className="text-sm text-muted-foreground">Loading…</Text></View>
          ) : ledger.length === 0 ? (
            <View className="py-8 items-center"><Text className="text-sm text-muted-foreground">No installment claims yet</Text></View>
          ) : (
            <ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
              <View className="gap-3 py-2">
                {ledger.map((claim: any) => {
                  const statusColor = claim.installment_status === "completed"
                    ? "text-green-600" : claim.installment_status === "expired"
                    ? "text-muted-foreground" : "text-amber-600";
                  return (
                    <View key={claim.claim_id} className="rounded-xl border border-border bg-muted/30 p-3 gap-2">
                      <View className="flex-row items-center justify-between">
                        <View>
                          <Text className="text-sm font-semibold text-foreground">{claim.user_name || "Customer"}</Text>
                          <Text className="text-[11px] text-muted-foreground">{claim.user_phone}</Text>
                        </View>
                        <Text className={`text-[10px] font-semibold capitalize ${statusColor}`}>
                          {claim.installment_status}
                        </Text>
                      </View>
                      <View className="flex-row gap-4">
                        <View>
                          <Text className="text-[10px] text-muted-foreground">Paid</Text>
                          <Text className="text-sm font-bold text-green-600">₹{formatINR(claim.paid_amount)}</Text>
                        </View>
                        <View>
                          <Text className="text-[10px] text-muted-foreground">Remaining</Text>
                          <Text className="text-sm font-bold text-foreground">₹{formatINR(claim.remaining_balance)}</Text>
                        </View>
                        {claim.installment_deadline && (
                          <View>
                            <Text className="text-[10px] text-muted-foreground">Due</Text>
                            <Text className="text-[11px] font-medium text-foreground">{safeFormat(claim.installment_deadline, "d MMM")}</Text>
                          </View>
                        )}
                      </View>
                      {claim.payments && claim.payments.length > 0 && (
                        <View className="rounded-lg bg-card px-3 py-2 gap-1">
                          <Text className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Payments</Text>
                          {claim.payments.map((p: any, i: number) => (
                            <View key={i} className="flex-row items-center justify-between">
                              <Text className="text-[11px] text-foreground">₹{formatINR(p.amount)}</Text>
                              <Text className="text-[10px] text-muted-foreground">{safeFormat(p.paid_at, "d MMM yyyy")}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
          <Button className="w-full rounded-xl mt-2" onPress={() => setLedgerVoucherId(null)}>Close</Button>
        </DialogContent>
      </Dialog>
    </View>
  );
};

export default MyCreatedVouchers;
