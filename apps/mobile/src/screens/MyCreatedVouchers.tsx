import { useCallback, useState } from "react";
import { Alert, Image, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Gift,
  Pencil,
  Plus,
  QrCode,
  ShieldCheck,
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
import { useIconColor, useColors } from "../theme/colors";
import { toast } from "../lib/toast";
import { formatINR } from "../lib/utils";
import {
  useGetMyCreatedVouchersQuery,
  useOwnerTransferVoucherMutation,
  useUpdateVoucherStatusMutation,
  useDeleteVoucherMutation,
  useGetVoucherClaimsQuery,
  useGetVoucherInstallmentLedgerQuery,
  useGetAllMyClaimsQuery,
  useGetSentOwnerTransfersQuery,
  useSettleOwnerTransferMutation,
  useGetOwnerTransferPaymentsQuery,
} from "../store/api/vouchersApi";

const safeFormat = (d: any, fmt: string, fb = "—") => {
  if (!d) return fb;
  const date = new Date(d);
  return isValid(date) ? format(date, fmt) : fb;
};

/** Renders the Razorpay payment history for one barter (owner-transfer). */
const BarterTransferPayments = ({ transferId }: { transferId: number }) => {
  const { data = [], isLoading } = useGetOwnerTransferPaymentsQuery(transferId);
  if (isLoading) {
    return <Text className="text-[10px] text-muted-foreground">Loading payments…</Text>;
  }
  if (!data.length) {
    return <Text className="text-[10px] text-muted-foreground">No payments yet</Text>;
  }
  return (
    <View className="gap-1.5">
      {data.map((p) => (
        <View
          key={p.id}
          className="flex-row items-center justify-between rounded-md bg-muted/40 px-2.5 py-1.5"
        >
          <View className="flex-1 pr-2">
            <Text className="text-[12px] font-semibold text-foreground">
              ₹{Number(p.amount).toLocaleString("en-IN")}
            </Text>
            <Text className="text-[9px] text-muted-foreground">
              {safeFormat(p.paid_at, "dd MMM yyyy, hh:mm a")}
            </Text>
          </View>
          <Text className="max-w-[55%] text-[9px] text-muted-foreground" numberOfLines={1}>
            {p.razorpay_payment_id}
          </Text>
        </View>
      ))}
    </View>
  );
};

const MyCreatedVouchers = () => {
  const iconColor = useIconColor();
  const colors = useColors();
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const { data: vouchers = [], isLoading, refetch } = useGetMyCreatedVouchersQuery(undefined, { skip: !user });
  const [updateStatus] = useUpdateVoucherStatusMutation();
  const [deleteVoucher, { isLoading: isDeleting }] = useDeleteVoucherMutation();
  const [ownerTransfer] = useOwnerTransferVoucherMutation();

  const [refreshing, setRefreshing] = useState(false);
  const [claimsVoucherId, setClaimsVoucherId] = useState<number | null>(null);

  // Owner transfer state
  const [transferVoucher, setTransferVoucher] = useState<any | null>(null);
  const [transferPhone, setTransferPhone] = useState("");
  const [transferQty, setTransferQty] = useState("1");
  const [transferLoading, setTransferLoading] = useState(false);

  // Transfer-to-Friend (Rajesh Modi only) state
  const RAJESH_MODI_PHONE = "9867477227";
  const normalizedUserPhone = (user?.phone || "").replace(/\D/g, "");
  const isRajeshModi = normalizedUserPhone.endsWith(RAJESH_MODI_PHONE);
  const [friendVoucher, setFriendVoucher] = useState<any | null>(null);
  const [friendPhone, setFriendPhone] = useState("");
  const [friendQty, setFriendQty] = useState("1");
  const [friendPayNow, setFriendPayNow] = useState("");
  const [friendPayLater, setFriendPayLater] = useState("");
  const [friendPayBarter, setFriendPayBarter] = useState("");
  const [friendLoading, setFriendLoading] = useState(false);
  // Pending owner-transfers modal (Rajesh Modi only — sender view)
  const [pendingTransfersOpen, setPendingTransfersOpen] = useState(false);
  const { data: sentTransfers = [], refetch: refetchSentTransfers, isFetching: sentTransfersFetching } =
    useGetSentOwnerTransfersQuery(undefined, { skip: !isRajeshModi });
  const [settleOwnerTransfer] = useSettleOwnerTransferMutation();
  const [settlingTransferId, setSettlingTransferId] = useState<number | null>(null);
  const pendingTransfers = (sentTransfers || []).filter((t: any) => Number(t.pay_later ?? 0) > 0);
  const totalPendingAmount = pendingTransfers.reduce((sum: number, t: any) => sum + Number(t.pay_later ?? 0), 0);
  const [ledgerVoucherId, setLedgerVoucherId] = useState<number | null>(null);
  const [ledgerTab, setLedgerTab] = useState<"installments" | "barter">("installments");
  const [expandedBarterTransfer, setExpandedBarterTransfer] = useState<Set<number>>(new Set());
  const [historyClaim, setHistoryClaim] = useState<any | null>(null);
  // Global claims modal: null = closed, "active" | "redeemed" | "expired" = open with filter
  const [globalClaimsFilter, setGlobalClaimsFilter] = useState<string | null>(null);
  const [showActiveVouchers, setShowActiveVouchers] = useState(false);
  const [claimsFromActive, setClaimsFromActive] = useState(false);

  const { data: claims = [], isFetching: claimsFetching } = useGetVoucherClaimsQuery(
    claimsVoucherId ?? 0,
    { skip: !claimsVoucherId }
  );
  const { data: ledger = [], isFetching: ledgerFetching } = useGetVoucherInstallmentLedgerQuery(
    ledgerVoucherId ?? 0,
    { skip: !ledgerVoucherId }
  );
  const { data: globalClaims = [], isFetching: globalClaimsFetching } = useGetAllMyClaimsQuery(
    globalClaimsFilter ? { status: globalClaimsFilter } : undefined,
    { skip: !globalClaimsFilter }
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const handleOwnerTransfer = async () => {
    if (!transferVoucher) return;
    const qty = parseInt(transferQty, 10);
    if (!qty || qty < 1) { toast.error("Enter a valid quantity"); return; }
    if (!transferPhone.trim()) { toast.error("Enter recipient phone number"); return; }
    const remaining = transferVoucher.max_claims != null
      ? Math.max(0, transferVoucher.max_claims - (transferVoucher.claimed_count || 0))
      : null;
    if (remaining !== null && qty > remaining) {
      toast.error(`Only ${remaining} voucher(s) remaining`);
      return;
    }
    setTransferLoading(true);
    try {
      await ownerTransfer({ id: transferVoucher.id, recipient_phone: transferPhone.trim(), quantity: qty }).unwrap();
      toast.success(`${qty} voucher(s) transferred successfully!`);
      setTransferPhone("");
      setTransferQty("1");
      setTransferVoucher(null);
      refetch();
    } catch (e: any) {
      toast.error(e?.data?.error || "Transfer failed");
    } finally {
      setTransferLoading(false);
    }
  };

  const handleFriendTransfer = async () => {
    if (!friendVoucher) return;
    const qty = parseInt(friendQty, 10);
    if (!qty || qty < 1) { toast.error("Enter a valid quantity"); return; }
    if (!friendPhone.trim()) { toast.error("Enter recipient phone number"); return; }
    const remaining = friendVoucher.max_claims != null
      ? Math.max(0, friendVoucher.max_claims - (friendVoucher.claimed_count || 0))
      : null;
    if (remaining !== null && qty > remaining) {
      toast.error(`Only ${remaining} voucher(s) remaining`);
      return;
    }
    const unitPrice = Number(friendVoucher.original_price ?? friendVoucher.mrp ?? friendVoucher.amount ?? 0);
    const payNow = parseInt(friendPayNow, 10) || 0;
    const payLater = parseInt(friendPayLater, 10) || 0;
    const payBarter = parseInt(friendPayBarter, 10) || 0;
    const totalAmount = payNow + payLater + payBarter;
    setFriendLoading(true);
    try {
      await ownerTransfer({
        id: friendVoucher.id,
        recipient_phone: friendPhone.trim(),
        quantity: qty,
        pay_now: payNow,
        pay_later: payLater,
        pay_barter: payBarter,
        total_amount: totalAmount,
      } as any).unwrap();
      toast.success(`${qty} voucher(s) transferred successfully!`);
      setFriendPhone("");
      setFriendQty("1");
      setFriendPayNow("");
      setFriendPayLater("");
      setFriendPayBarter("");
      setFriendVoucher(null);
      refetch();
      refetchSentTransfers();
    } catch (e: any) {
      toast.error(e?.data?.error || "Transfer failed");
    } finally {
      setFriendLoading(false);
    }
  };

  const handleMarkAsPaid = (transferId: number, amount: number, recipientName?: string | null) => {
    Alert.alert(
      "Mark as Paid",
      `Mark ₹${amount.toLocaleString("en-IN")} as received from ${recipientName || "recipient"}? This clears the pending balance.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark Paid",
          onPress: async () => {
            setSettlingTransferId(transferId);
            try {
              await settleOwnerTransfer({ transferId }).unwrap();
              toast.success("Payment marked as received");
              await refetchSentTransfers();
            } catch (err: any) {
              toast.error(err?.data?.error || "Failed to mark as paid");
            } finally {
              setSettlingTransferId(null);
            }
          },
        },
      ]
    );
  };

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
  const totalRedeemed = vouchers.reduce((s: number, v: any) => s + (v.redeemed_claims || 0), 0);

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 border-b border-border bg-card px-4 py-4">
        <Pressable onPress={() => navigation.goBack()} className="p-0.5">
          <ArrowLeft size={20} color={iconColor} />
        </Pressable>
        <Text
          className="flex-1 text-lg font-bold text-foreground"
          numberOfLines={1}
        >
          My Created Vouchers
        </Text>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => navigation.navigate("VoucherCreate")}
            className="flex-row items-center gap-1 rounded-lg bg-primary px-3 py-1.5 active:opacity-80"
          >
            <Plus size={14} color="#fff" />
            <Text className="text-xs font-semibold text-primary-foreground">New</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate("VoucherScanner")}
            className="flex-row items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 active:opacity-80"
          >
            <QrCode size={14} color="#2463eb" />
            <Text className="text-xs font-semibold text-primary">Scan</Text>
          </Pressable>
        </View>
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
            <Pressable
              className="flex-1 rounded-xl border border-border bg-card p-3 items-center active:opacity-70"
              onPress={() => setShowActiveVouchers(true)}
            >
              <CheckCircle2 size={18} color="#16a34a" />
              <Text className="mt-1 text-xl font-bold text-foreground">{activeVouchers}</Text>
              <Text className="text-[10px] text-green-600 font-medium">Active ›</Text>
            </Pressable>
            <Pressable
              className="flex-1 rounded-xl border border-border bg-card p-3 items-center active:opacity-70"
              onPress={() => setGlobalClaimsFilter("active")}
            >
              <Users size={18} color="#f97316" />
              <Text className="mt-1 text-xl font-bold text-foreground">{totalClaims}</Text>
              <Text className="text-[10px] text-orange-500 font-medium">Claimed ›</Text>
            </Pressable>
            <Pressable
              className="flex-1 rounded-xl border border-border bg-card p-3 items-center active:opacity-70"
              onPress={() => setGlobalClaimsFilter("redeemed")}
            >
              <ShieldCheck size={18} color="#2463eb" />
              <Text className="mt-1 text-xl font-bold text-foreground">{totalRedeemed}</Text>
              <Text className="text-[10px] text-primary font-medium">Redeemed ›</Text>
            </Pressable>
          </View>

          {/* Pending Transfers banner (Rajesh Modi only) */}
          {isRajeshModi && pendingTransfers.length > 0 && (
            <Pressable
              onPress={() => setPendingTransfersOpen(true)}
              className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 active:opacity-80"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                    Pending Transfers
                  </Text>
                  <Text className="mt-1 text-base font-bold text-amber-700">
                    ₹{totalPendingAmount.toLocaleString("en-IN")}
                  </Text>
                  <Text className="mt-0.5 text-[11px] text-amber-700/80">
                    {pendingTransfers.length} transfer{pendingTransfers.length === 1 ? "" : "s"} awaiting payment
                  </Text>
                </View>
                <Button
                  size="sm"
                  className="rounded-lg bg-amber-600 px-3"
                  textClassName="text-xs text-white"
                  onPress={() => setPendingTransfersOpen(true)}
                >
                  <Text className="text-xs font-semibold text-white">View</Text>
                </Button>
              </View>
            </Pressable>
          )}

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
                      {/* Claim status breakdown */}
                      <View className="flex-row items-center gap-2 mt-1 flex-wrap">
                        <View className="flex-row items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5">
                          <Text className="text-[10px] font-semibold text-orange-600">
                            {v.active_claims ?? 0} active
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5">
                          <Text className="text-[10px] font-semibold text-primary">
                            {v.redeemed_claims ?? 0} redeemed
                          </Text>
                        </View>
                        {(v.expired_claims ?? 0) > 0 && (
                          <View className="flex-row items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                            <Text className="text-[10px] font-semibold text-muted-foreground">
                              {v.expired_claims} expired
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  <View className="flex-row gap-2 border-t border-border bg-muted/30 px-3 py-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 rounded-lg"
                      textClassName="text-[12px]"
                      onPress={() => setClaimsVoucherId(v.id)}
                    >
                      <View className="flex-row items-center justify-center gap-1">
                        <Users size={14} color={iconColor} />
                        <Text className="text-[12px] font-medium text-foreground">Claims</Text>
                      </View>
                    </Button>
                    {v.allows_installment && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 rounded-lg"
                        textClassName="text-[12px]"
                        onPress={() => setLedgerVoucherId(v.id)}
                      >
                        <View className="flex-row items-center justify-center gap-1">
                          <CreditCard size={14} color={iconColor} />
                          <Text className="text-[12px] font-medium text-foreground">Ledger</Text>
                        </View>
                      </Button>
                    )}
                    {v.max_claims != null && (
                      (() => {
                        const remaining = Math.max(0, v.max_claims - (v.claimed_count || 0));
                        return remaining > 0 ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 rounded-lg border-violet-400/60"
                            textClassName="text-[12px]"
                            onPress={() => { setTransferVoucher(v); setTransferPhone(""); setTransferQty("1"); }}
                          >
                            <View className="flex-row items-center justify-center gap-1">
                              <Gift size={14} color="#7c3aed" />
                              <Text className="text-[12px] font-semibold text-violet-600">
                                Transfer
                              </Text>
                            </View>
                          </Button>
                        ) : (
                          <View className="flex-1 rounded-lg border border-border bg-muted/50 px-2 py-1.5 items-center justify-center">
                            <Text className="text-[11px] font-semibold text-muted-foreground">Sold Out</Text>
                          </View>
                        );
                      })()
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className={`flex-1 rounded-lg px-1 ${v.status === "active" ? "border-destructive/40" : "border-primary/40"}`}
                      textClassName="text-[11px]"
                      onPress={() => toggleStatus(v.id, v.status)}
                    >
                      <Text
                        className={`text-[11px] font-semibold ${v.status === "active" ? "text-destructive" : "text-primary"}`}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {v.status === "active" ? "Deactivate" : "Activate"}
                      </Text>
                    </Button>
                  </View>
                  {isRajeshModi && (
                    <View className="flex-row gap-2 border-t border-border bg-emerald-500/5 px-3 py-2">
                      <Button
                        size="sm"
                        className="flex-1 rounded-lg bg-emerald-600"
                        textClassName="text-[12px]"
                        onPress={() => {
                          setFriendVoucher(v);
                          setFriendPhone("");
                          setFriendQty("1");
                          setFriendPayNow("");
                          setFriendPayLater("");
                          setFriendPayBarter("");
                        }}
                      >
                        <View className="flex-row items-center justify-center gap-1.5">
                          <Gift size={14} color="#fff" />
                          <Text className="text-[12px] font-semibold text-white">
                            Barter Transfer
                          </Text>
                        </View>
                      </Button>
                    </View>
                  )}
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
      <Dialog open={!!claimsVoucherId} onOpenChange={(open) => {
        if (!open) {
          setClaimsVoucherId(null);
          if (claimsFromActive) { setClaimsFromActive(false); setShowActiveVouchers(true); }
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Voucher Claims</DialogTitle>
          </DialogHeader>
          {claimsFetching ? (
            <View className="py-8 items-center"><Text className="text-sm text-muted-foreground">Loading…</Text></View>
          ) : claims.length === 0 ? (
            <View className="py-8 items-center"><Text className="text-sm text-muted-foreground">No claims yet</Text></View>
          ) : (
            <>
              {/* Summary bar */}
              <View className="flex-row gap-2 pb-2">
                {[
                  { label: "Total", count: claims.length, color: "#6b7280" },
                  { label: "Active", count: claims.filter((c: any) => c.status === "active").length, color: "#f97316" },
                  { label: "Redeemed", count: claims.filter((c: any) => c.status === "redeemed").length, color: "#2463eb" },
                  { label: "Expired", count: claims.filter((c: any) => c.status === "expired").length, color: "#9ca3af" },
                ].map(({ label, count, color }) => (
                  <View key={label} className="flex-1 rounded-lg bg-muted/50 p-2 items-center">
                    <Text className="text-base font-bold text-foreground" style={{ color }}>{count}</Text>
                    <Text className="text-[9px] text-muted-foreground">{label}</Text>
                  </View>
                ))}
              </View>
            <ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
              <View className="gap-2 py-2">
                {claims.map((c: any) => (
                  <View key={c.claim_id} className="rounded-lg border border-border bg-muted/30 p-3 gap-1">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 flex-row items-center gap-2">
                        <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{c.user_name || "Customer"}</Text>
                        <View className="rounded-full bg-primary/10 px-2 py-0.5">
                          <Text className="text-[10px] font-semibold text-primary">Qty: {Number(c.quantity ?? 1)}</Text>
                        </View>
                      </View>
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
            </>
          )}
          <Button className="w-full rounded-xl mt-2" onPress={() => {
            setClaimsVoucherId(null);
            if (claimsFromActive) { setClaimsFromActive(false); setShowActiveVouchers(true); }
          }}>{claimsFromActive ? "← Back" : "Close"}</Button>
        </DialogContent>
      </Dialog>

      {/* Active Vouchers Modal */}
      <Dialog open={showActiveVouchers} onOpenChange={(open) => !open && setShowActiveVouchers(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Active Vouchers</DialogTitle>
          </DialogHeader>
          {vouchers.filter((v: any) => v.status === "active").length === 0 ? (
            <View className="py-8 items-center">
              <Text className="text-sm text-muted-foreground">No active vouchers</Text>
            </View>
          ) : (
            <ScrollView className="max-h-[70vh]" showsVerticalScrollIndicator={false}>
              <View className="gap-2 py-2">
                {vouchers.filter((v: any) => v.status === "active").map((v: any) => (
                  <Pressable
                    key={v.id}
                    className="rounded-lg border border-border bg-muted/30 p-3 gap-1 active:opacity-70"
                    onPress={() => { setShowActiveVouchers(false); setClaimsFromActive(true); setClaimsVoucherId(v.id); }}
                  >
                    <View className="flex-row items-start justify-between gap-2">
                      <Text className="flex-1 text-sm font-semibold text-foreground" numberOfLines={1}>{v.title}</Text>
                      <View className="rounded-full bg-green-500/10 px-2 py-0.5">
                        <Text className="text-[10px] font-semibold text-green-600">active</Text>
                      </View>
                    </View>
                    <Text className="text-sm font-bold text-primary">
                      ₹{formatINR(Number(v.original_price ?? 0))}
                      {v.discount_label ? <Text className="text-[11px] font-normal text-muted-foreground">  {v.discount_label}</Text> : null}
                    </Text>
                    <View className="flex-row items-center gap-3 mt-0.5">
                      <View className="flex-row items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5">
                        <Text className="text-[10px] font-semibold text-orange-600">{v.active_claims ?? 0} active claims</Text>
                      </View>
                      <View className="flex-row items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5">
                        <Text className="text-[10px] font-semibold text-primary">{v.redeemed_claims ?? 0} redeemed</Text>
                      </View>
                    </View>
                    {v.expires_at && (
                      <Text className="text-[10px] text-muted-foreground mt-0.5">
                        Expires {safeFormat(v.expires_at, "d MMM yyyy")}
                      </Text>
                    )}
                    <Text className="text-[10px] text-primary/60 mt-0.5">Tap to view claims →</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          )}
          <Button className="w-full rounded-xl mt-2" onPress={() => setShowActiveVouchers(false)}>Close</Button>
        </DialogContent>
      </Dialog>

      {/* Global Claims Modal (Claimed / Redeemed stats tap) */}
      <Dialog open={!!globalClaimsFilter} onOpenChange={(open) => !open && setGlobalClaimsFilter(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {globalClaimsFilter === "redeemed" ? "Redeemed Claims" : "Active Claims"}
            </DialogTitle>
          </DialogHeader>
          {globalClaimsFetching ? (
            <View className="py-8 items-center"><Text className="text-sm text-muted-foreground">Loading…</Text></View>
          ) : globalClaims.length === 0 ? (
            <View className="py-8 items-center">
              <Text className="text-sm text-muted-foreground">
                No {globalClaimsFilter} claims yet
              </Text>
            </View>
          ) : (
            <ScrollView className="max-h-[70vh]" showsVerticalScrollIndicator={false}>
              <View className="gap-2 py-2">
                {globalClaims.map((c: any) => (
                  <View key={c.claim_id} className="rounded-lg border border-border bg-muted/30 p-3 gap-1">
                    <View className="flex-row items-start justify-between gap-2">
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{c.user_name || "Customer"}</Text>
                          <View className="rounded-full bg-primary/10 px-2 py-0.5">
                            <Text className="text-[10px] font-semibold text-primary">Qty: {Number(c.quantity ?? 1)}</Text>
                          </View>
                        </View>
                        <Text className="text-[11px] text-muted-foreground">{c.user_phone}</Text>
                      </View>
                      <View className={`rounded-full px-2 py-0.5 ${
                        c.status === "redeemed" ? "bg-primary/10" : "bg-orange-500/10"
                      }`}>
                        <Text className={`text-[10px] font-semibold capitalize ${
                          c.status === "redeemed" ? "text-primary" : "text-orange-600"
                        }`}>{c.status}</Text>
                      </View>
                    </View>
                    <View className="mt-1 rounded-md bg-card border border-border px-2 py-1">
                      <Text className="text-[11px] font-medium text-foreground" numberOfLines={1}>
                        🎁 {c.voucher_title}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-3 mt-0.5">
                      <Text className="text-[10px] text-muted-foreground">
                        Claimed: {safeFormat(c.claimed_at, "d MMM yyyy")}
                      </Text>
                      {c.redeemed_at && (
                        <Text className="text-[10px] text-muted-foreground">
                          Redeemed: {safeFormat(c.redeemed_at, "d MMM yyyy")}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
          <Button className="w-full rounded-xl mt-2" onPress={() => setGlobalClaimsFilter(null)}>Close</Button>
        </DialogContent>
      </Dialog>

      {/* Installment Ledger Modal */}
      <Dialog open={!!ledgerVoucherId} onOpenChange={(open) => { if (!open) { setLedgerVoucherId(null); setLedgerTab("installments"); setExpandedBarterTransfer(new Set()); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ledger</DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <View className="flex-row gap-2 mb-2">
            <Pressable
              onPress={() => setLedgerTab("installments")}
              className={`flex-1 rounded-lg px-3 py-2 items-center ${ledgerTab === "installments" ? "bg-primary" : "bg-muted/40"}`}
            >
              <Text className={`text-[12px] font-semibold ${ledgerTab === "installments" ? "text-white" : "text-foreground"}`}>
                Installments
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setLedgerTab("barter")}
              className={`flex-1 rounded-lg px-3 py-2 items-center ${ledgerTab === "barter" ? "bg-primary" : "bg-muted/40"}`}
            >
              <Text className={`text-[12px] font-semibold ${ledgerTab === "barter" ? "text-white" : "text-foreground"}`}>
                Barter Transfers
              </Text>
            </Pressable>
          </View>

          {ledgerTab === "installments" ? (
            ledgerFetching ? (
            <View className="py-8 items-center"><Text className="text-sm text-muted-foreground">Loading…</Text></View>
          ) : ledger.length === 0 ? (
            <View className="py-8 items-center"><Text className="text-sm text-muted-foreground">No installment claims yet</Text></View>
          ) : (
            <>
              {/* Summary header */}
              <View className="flex-row gap-2 px-1">
                <View className="flex-1 rounded-xl bg-green-500/10 p-3">
                  <Text className="text-[10px] font-semibold text-green-700 uppercase">Total Collected</Text>
                  <Text className="text-base font-bold text-green-700">
                    ₹{formatINR(ledger.reduce((s: number, c: any) => s + Number(c.paid_amount ?? 0), 0))}
                  </Text>
                </View>
                <View className="flex-1 rounded-xl bg-amber-500/10 p-3">
                  <Text className="text-[10px] font-semibold text-amber-700 uppercase">Outstanding</Text>
                  <Text className="text-base font-bold text-amber-700">
                    ₹{formatINR(ledger.reduce((s: number, c: any) => s + Number(c.remaining_balance ?? 0), 0))}
                  </Text>
                </View>
              </View>
              <ScrollView className="max-h-96 mt-2" showsVerticalScrollIndicator={false}>
                <View className="gap-2.5 py-1">
                  {ledger.map((claim: any) => {
                    const statusColor = claim.installment_status === "completed"
                      ? "bg-green-500/10 text-green-700" : claim.installment_status === "expired"
                      ? "bg-muted text-muted-foreground" : "bg-amber-500/10 text-amber-700";
                    const last = claim.last_payment;
                    return (
                      <View key={claim.claim_id} className="rounded-xl border border-border bg-card p-3 gap-2">
                        <View className="flex-row items-start justify-between">
                          <View className="flex-1 pr-2">
                            <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                              {claim.user_name || "Customer"}
                            </Text>
                            <Text className="text-[11px] text-muted-foreground">{claim.user_phone}</Text>
                          </View>
                          <View className={`rounded-full px-2 py-0.5 ${statusColor.split(" ")[0]}`}>
                            <Text className={`text-[10px] font-semibold capitalize ${statusColor.split(" ")[1]}`}>
                              {claim.installment_status}
                            </Text>
                          </View>
                        </View>
                        <View className="flex-row items-center justify-between">
                          <View>
                            <Text className="text-[10px] text-muted-foreground uppercase tracking-wide">Paid</Text>
                            <Text className="text-sm font-bold text-green-600">₹{formatINR(claim.paid_amount)}</Text>
                          </View>
                          <View>
                            <Text className="text-[10px] text-muted-foreground uppercase tracking-wide">Remaining</Text>
                            <Text className="text-sm font-bold text-foreground">₹{formatINR(claim.remaining_balance)}</Text>
                          </View>
                          {claim.installment_deadline && (
                            <View>
                              <Text className="text-[10px] text-muted-foreground uppercase tracking-wide">Due</Text>
                              <Text className="text-[11px] font-medium text-foreground">{safeFormat(claim.installment_deadline, "d MMM")}</Text>
                            </View>
                          )}
                        </View>
                        {last && (
                          <View className="flex-row items-center justify-between rounded-lg bg-muted/40 px-2.5 py-1.5">
                            <View className="flex-row items-center gap-1.5">
                              <View className="h-1.5 w-1.5 rounded-full bg-primary" />
                              <Text className="text-[11px] text-muted-foreground">
                                Last payment{last.type === "upfront" ? " (upfront)" : ""}
                              </Text>
                            </View>
                            <Text className="text-[11px] font-semibold text-foreground">
                              ₹{formatINR(last.amount)} · {safeFormat(last.paid_at, "d MMM yyyy")}
                            </Text>
                          </View>
                        )}
                        <Pressable
                          onPress={() => setHistoryClaim(claim)}
                          className="flex-row items-center justify-center rounded-lg border border-primary/30 bg-primary/5 py-1.5"
                        >
                          <Text className="text-[11px] font-semibold text-primary">View Full History</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </>
          )
          ) : (
            (() => {
              const voucherBarterTransfers = (sentTransfers || []).filter(
                (t: any) => t.voucher_id === ledgerVoucherId
              );
              if (sentTransfersFetching && voucherBarterTransfers.length === 0) {
                return (
                  <View className="py-8 items-center">
                    <Text className="text-sm text-muted-foreground">Loading…</Text>
                  </View>
                );
              }
              if (voucherBarterTransfers.length === 0) {
                return (
                  <View className="py-8 items-center">
                    <Text className="text-sm text-muted-foreground">No barter transfers for this voucher</Text>
                  </View>
                );
              }
              const totalPaidNow = voucherBarterTransfers.reduce(
                (s: number, t: any) => s + Number(t.pay_now ?? 0),
                0
              );
              const totalPending = voucherBarterTransfers.reduce(
                (s: number, t: any) => s + Number(t.pay_later ?? 0),
                0
              );
              return (
                <>
                  <View className="flex-row gap-2 px-1">
                    <View className="flex-1 rounded-xl bg-green-500/10 p-3">
                      <Text className="text-[10px] font-semibold text-green-700 uppercase">Settled</Text>
                      <Text className="text-base font-bold text-green-700">₹{formatINR(totalPaidNow)}</Text>
                    </View>
                    <View className="flex-1 rounded-xl bg-amber-500/10 p-3">
                      <Text className="text-[10px] font-semibold text-amber-700 uppercase">Pending</Text>
                      <Text className="text-base font-bold text-amber-700">₹{formatINR(totalPending)}</Text>
                    </View>
                  </View>
                  <ScrollView className="max-h-96 mt-2" showsVerticalScrollIndicator={false}>
                    <View className="gap-2.5 py-1">
                      {voucherBarterTransfers.map((t: any) => {
                        const pending = Number(t.pay_later ?? 0);
                        const paidNow = Number(t.pay_now ?? 0);
                        const barter = Number(t.pay_barter ?? 0);
                        const recipientName = t.recipient?.name || "Recipient";
                        const recipientPhone = t.recipient?.phone || t.recipient_phone || "—";
                        const isExpanded = expandedBarterTransfer.has(t.id);
                        return (
                          <View key={t.id} className="rounded-xl border border-border bg-card p-3 gap-2">
                            <View className="flex-row items-start justify-between">
                              <View className="flex-1 pr-2">
                                <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                                  {recipientName}
                                </Text>
                                <Text className="text-[11px] text-muted-foreground">{recipientPhone}</Text>
                                <Text className="text-[10px] text-muted-foreground mt-0.5">
                                  Qty {t.quantity} · {safeFormat(t.transferred_at, "d MMM yyyy")}
                                </Text>
                              </View>
                              <View
                                className={`rounded-full px-2 py-0.5 ${
                                  pending > 0 ? "bg-amber-500/10" : "bg-green-500/10"
                                }`}
                              >
                                <Text
                                  className={`text-[10px] font-semibold ${
                                    pending > 0 ? "text-amber-700" : "text-green-700"
                                  }`}
                                >
                                  {pending > 0 ? `₹${formatINR(pending)} pending` : "Settled"}
                                </Text>
                              </View>
                            </View>
                            <View className="flex-row items-center justify-between">
                              <View>
                                <Text className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                  Paid Now
                                </Text>
                                <Text className="text-sm font-bold text-green-600">
                                  ₹{formatINR(paidNow)}
                                </Text>
                              </View>
                              <View>
                                <Text className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                  Barter
                                </Text>
                                <Text className="text-sm font-bold text-foreground">
                                  ₹{formatINR(barter)}
                                </Text>
                              </View>
                              <View>
                                <Text className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                  Total
                                </Text>
                                <Text className="text-sm font-bold text-foreground">
                                  ₹{formatINR(Number(t.total_amount ?? 0))}
                                </Text>
                              </View>
                            </View>
                            <Pressable
                              onPress={() =>
                                setExpandedBarterTransfer((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(t.id)) next.delete(t.id);
                                  else next.add(t.id);
                                  return next;
                                })
                              }
                              className="flex-row items-center justify-center rounded-lg border border-primary/30 bg-primary/5 py-1.5"
                            >
                              <Text className="text-[11px] font-semibold text-primary">
                                {isExpanded ? "Hide Payment History" : "View Payment History"}
                              </Text>
                            </Pressable>
                            {isExpanded && (
                              <View className="rounded-lg bg-muted/30 p-2">
                                <BarterTransferPayments transferId={t.id} />
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                </>
              );
            })()
          )}
          <Button className="w-full rounded-xl mt-2" onPress={() => { setLedgerVoucherId(null); setLedgerTab("installments"); setExpandedBarterTransfer(new Set()); }}>Close</Button>
        </DialogContent>
      </Dialog>

      {/* Payment History Detail Modal */}
      <Dialog open={!!historyClaim} onOpenChange={(open) => !open && setHistoryClaim(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
          </DialogHeader>
          {historyClaim && (
            <View className="gap-3">
              <View className="rounded-xl border border-border bg-muted/30 p-3">
                <Text className="text-sm font-semibold text-foreground">{historyClaim.user_name || "Customer"}</Text>
                <Text className="text-[11px] text-muted-foreground">{historyClaim.user_phone}</Text>
                <View className="flex-row gap-4 mt-2">
                  <View>
                    <Text className="text-[10px] text-muted-foreground uppercase">Total Paid</Text>
                    <Text className="text-sm font-bold text-green-600">₹{formatINR(historyClaim.paid_amount)}</Text>
                  </View>
                  <View>
                    <Text className="text-[10px] text-muted-foreground uppercase">Remaining</Text>
                    <Text className="text-sm font-bold text-foreground">₹{formatINR(historyClaim.remaining_balance)}</Text>
                  </View>
                </View>
              </View>
              <ScrollView className="max-h-72" showsVerticalScrollIndicator={false}>
                <View className="gap-2">
                  <Text className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Timeline</Text>
                  {Number(historyClaim.upfront_amount) > 0 && (
                    <View className="flex-row items-center justify-between rounded-lg border border-border bg-blue-500/5 px-3 py-2">
                      <View>
                        <Text className="text-[11px] font-semibold text-blue-700">Upfront Payment</Text>
                        <Text className="text-[10px] text-muted-foreground">{safeFormat(historyClaim.claimed_at, "d MMM yyyy · p")}</Text>
                      </View>
                      <Text className="text-sm font-bold text-blue-700">₹{formatINR(historyClaim.upfront_amount)}</Text>
                    </View>
                  )}
                  {historyClaim.payments && historyClaim.payments.length > 0 ? (
                    historyClaim.payments.map((p: any, i: number) => (
                      <View key={i} className="flex-row items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
                        <View>
                          <Text className="text-[11px] font-semibold text-foreground">Installment #{historyClaim.payments.length - i}</Text>
                          <Text className="text-[10px] text-muted-foreground">{safeFormat(p.paid_at, "d MMM yyyy · p")}</Text>
                        </View>
                        <Text className="text-sm font-bold text-green-600">₹{formatINR(p.amount)}</Text>
                      </View>
                    ))
                  ) : (
                    Number(historyClaim.upfront_amount) === 0 && (
                      <Text className="text-[11px] text-muted-foreground py-4 text-center">No payments yet</Text>
                    )
                  )}
                </View>
              </ScrollView>
            </View>
          )}
          <Button className="w-full rounded-xl mt-2" onPress={() => setHistoryClaim(null)}>Close</Button>
        </DialogContent>
      </Dialog>

      {/* Owner Transfer Dialog */}
      <Dialog open={!!transferVoucher} onOpenChange={(open) => { if (!open) setTransferVoucher(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Transfer Vouchers</DialogTitle>
          </DialogHeader>
          {transferVoucher && (() => {
            const remaining = Math.max(0, transferVoucher.max_claims - (transferVoucher.claimed_count || 0));
            const qty = parseInt(transferQty, 10) || 1;
            return (
              <View className="gap-4">
                {/* Voucher info */}
                <View className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 gap-1">
                  <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{transferVoucher.title}</Text>
                  <View className="flex-row items-center gap-2">
                    <View className="rounded-full bg-violet-500/10 px-2 py-0.5">
                      <Text className="text-[10px] font-semibold text-violet-600">{remaining} available to transfer</Text>
                    </View>
                    <View className="rounded-full bg-muted px-2 py-0.5">
                      <Text className="text-[10px] text-muted-foreground">{transferVoucher.claimed_count || 0}/{transferVoucher.max_claims} claimed</Text>
                    </View>
                  </View>
                </View>

                {/* Phone */}
                <View className="gap-1.5">
                  <Text className="text-xs font-semibold text-foreground">Recipient Phone Number</Text>
                  <TextInput
                    style={{
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 14,
                      color: colors.foreground,
                    }}
                    placeholder="+91 9876543210"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="phone-pad"
                    value={transferPhone}
                    onChangeText={setTransferPhone}
                    autoFocus
                  />
                </View>

                {/* Quantity */}
                <View className="gap-1.5">
                  <Text className="text-xs font-semibold text-foreground">Quantity (max {remaining})</Text>
                  <View className="flex-row items-center gap-3">
                    <Pressable
                      onPress={() => setTransferQty((v) => String(Math.max(1, parseInt(v, 10) - 1)))}
                      className="h-9 w-9 rounded-full border border-border items-center justify-center active:opacity-60"
                    >
                      <Text className="text-lg font-semibold text-foreground">−</Text>
                    </Pressable>
                    <TextInput
                      style={{
                        height: 36,
                        width: 64,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: colors.border,
                        color: colors.foreground,
                        fontSize: 14,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        paddingHorizontal: 8,
                      }}
                      keyboardType="number-pad"
                      value={transferQty}
                      onChangeText={(val) => {
                        const n = parseInt(val, 10);
                        if (!isNaN(n) && n >= 1) setTransferQty(String(Math.min(n, remaining)));
                        else if (val === "") setTransferQty("");
                      }}
                    />
                    <Pressable
                      onPress={() => setTransferQty((v) => String(Math.min(parseInt(v, 10) + 1, remaining)))}
                      className="h-9 w-9 rounded-full border border-border items-center justify-center active:opacity-60"
                    >
                      <Text className="text-lg font-semibold text-foreground">+</Text>
                    </Pressable>
                    <View className="flex-1 rounded-xl bg-violet-500/10 px-3 py-1.5">
                      <Text className="text-[11px] font-semibold text-violet-600 text-center">
                        {qty} voucher{qty !== 1 ? "s" : ""} · free
                      </Text>
                    </View>
                  </View>
                  {qty > 0 && remaining > 0 && (() => {
                    const startNo = Number(transferVoucher.voucher_start_no) || 1;
                    const base = startNo + (transferVoucher.claimed_count || 0);
                    const count = Math.min(qty, remaining);
                    const first = String(base).padStart(3, "0");
                    const last = String(base + count - 1).padStart(3, "0");
                    const label = count > 1 ? `${first} to ${last}` : first;
                    return (
                      <Text className="text-[10px] font-medium text-foreground">
                        Serial No{count > 1 ? "s" : ""} to issue: {label}
                      </Text>
                    );
                  })()}
                </View>

                {/* Actions */}
                <View className="gap-2">
                  <Button
                    className="w-full rounded-xl"
                    onPress={handleOwnerTransfer}
                    disabled={transferLoading}
                  >
                    <View className="flex-row items-center gap-2">
                      <Gift size={14} color="#fff" />
                      <Text className="text-sm font-semibold text-primary-foreground">
                        {transferLoading ? "Transferring..." : `Transfer ${qty} Voucher${qty !== 1 ? "s" : ""}`}
                      </Text>
                    </View>
                  </Button>
                  <Button variant="outline" className="w-full rounded-xl" onPress={() => setTransferVoucher(null)}>
                    Cancel
                  </Button>
                </View>
              </View>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Barter Transfer Dialog (Rajesh Modi only) */}
      <Dialog open={!!friendVoucher} onOpenChange={(open) => { if (!open) setFriendVoucher(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Barter Transfer</DialogTitle>
          </DialogHeader>
          {friendVoucher && (() => {
            const remaining = friendVoucher.max_claims != null
              ? Math.max(0, friendVoucher.max_claims - (friendVoucher.claimed_count || 0))
              : null;
            const qty = parseInt(friendQty, 10) || 1;
            const payNowNum = parseInt(friendPayNow, 10) || 0;
            const payLaterNum = parseInt(friendPayLater, 10) || 0;
            const payBarterNum = parseInt(friendPayBarter, 10) || 0;
            const enteredSum = payNowNum + payLaterNum + payBarterNum;
            const unitPrice = Number(
              friendVoucher.original_price ?? friendVoucher.mrp ?? friendVoucher.amount ?? 0
            );
            const voucherTotal = Math.max(0, unitPrice * qty);
            // Allocated = what's actually settled (Pay Now + Pay Barter)
            // Remaining = Pay Later (the pending amount the recipient still owes)
            const allocatedAmount = payNowNum + payBarterNum;
            const remainingAmount = payLaterNum;
            const overpaid = enteredSum > voucherTotal;
            const unallocated = voucherTotal - enteredSum; // > 0 means user hasn't entered enough yet
            const inputStyle = {
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 14,
              color: colors.foreground,
            } as const;
            return (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 16 }}
              >
                <View className="gap-4">
                  {/* Voucher info */}
                  <View className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 gap-1.5">
                    <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{friendVoucher.title}</Text>
                    {remaining !== null && (
                      <View className="flex-row items-center gap-2">
                        <View className="rounded-full bg-emerald-500/10 px-2 py-0.5">
                          <Text className="text-[10px] font-semibold text-emerald-600">{remaining} available</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Phone */}
                  <View className="gap-1.5">
                    <Text className="text-xs font-semibold text-foreground">Recipient Phone Number</Text>
                    <TextInput
                      style={inputStyle}
                      placeholder="+91 9876543210"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="phone-pad"
                      value={friendPhone}
                      onChangeText={setFriendPhone}
                      autoFocus
                    />
                  </View>

                  {/* Pay Now */}
                  <View className="gap-1.5">
                    <Text className="text-xs font-semibold text-foreground">Pay Now</Text>
                    <TextInput
                      style={inputStyle}
                      placeholder="0"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="number-pad"
                      value={friendPayNow}
                      onChangeText={(t) => setFriendPayNow(t.replace(/\D/g, ""))}
                    />
                  </View>

                  {/* Pay Later */}
                  <View className="gap-1.5">
                    <Text className="text-xs font-semibold text-foreground">Pay Later</Text>
                    <TextInput
                      style={inputStyle}
                      placeholder="0"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="number-pad"
                      value={friendPayLater}
                      onChangeText={(t) => setFriendPayLater(t.replace(/\D/g, ""))}
                    />
                  </View>

                  {/* Pay Barter */}
                  <View className="gap-1.5">
                    <Text className="text-xs font-semibold text-foreground">Pay Barter</Text>
                    <TextInput
                      style={inputStyle}
                      placeholder="0"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="number-pad"
                      value={friendPayBarter}
                      onChangeText={(t) => setFriendPayBarter(t.replace(/\D/g, ""))}
                    />
                  </View>

                  {/* Quantity */}
                  <View className="gap-1.5">
                    <Text className="text-xs font-semibold text-foreground">
                      Quantity{remaining !== null ? ` (max ${remaining})` : ""}
                    </Text>
                    <View className="flex-row items-center gap-3">
                      <Pressable
                        onPress={() => setFriendQty((v) => String(Math.max(1, (parseInt(v, 10) || 1) - 1)))}
                        className="h-9 w-9 rounded-full border border-border items-center justify-center active:opacity-60"
                      >
                        <Text className="text-lg font-semibold text-foreground">−</Text>
                      </Pressable>
                      <TextInput
                        style={{
                          height: 36,
                          width: 64,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: colors.border,
                          color: colors.foreground,
                          fontSize: 14,
                          fontWeight: 'bold',
                          textAlign: 'center',
                          paddingHorizontal: 8,
                        }}
                        keyboardType="number-pad"
                        value={friendQty}
                        onChangeText={(val) => {
                          const n = parseInt(val, 10);
                          if (!isNaN(n) && n >= 1) {
                            setFriendQty(remaining !== null ? String(Math.min(n, remaining)) : String(n));
                          } else if (val === "") {
                            setFriendQty("");
                          }
                        }}
                      />
                      <Pressable
                        onPress={() => setFriendQty((v) => {
                          const next = (parseInt(v, 10) || 0) + 1;
                          return String(remaining !== null ? Math.min(next, remaining) : next);
                        })}
                        className="h-9 w-9 rounded-full border border-border items-center justify-center active:opacity-60"
                      >
                        <Text className="text-lg font-semibold text-foreground">+</Text>
                      </Pressable>
                      <View className="flex-1 rounded-xl bg-emerald-500/10 px-3 py-1.5">
                        <Text className="text-[11px] font-semibold text-emerald-600 text-center">
                          {qty} voucher{qty !== 1 ? "s" : ""}
                        </Text>
                      </View>
                    </View>
                    {qty > 0 && (remaining === null || remaining > 0) && (() => {
                      const startNo = Number(friendVoucher.voucher_start_no) || 1;
                      const base = startNo + (friendVoucher.claimed_count || 0);
                      const cap = remaining !== null ? Math.min(qty, remaining) : qty;
                      const first = String(base).padStart(3, "0");
                      const last = String(base + cap - 1).padStart(3, "0");
                      const label = cap > 1 ? `${first} to ${last}` : first;
                      return (
                        <Text className="text-[10px] font-medium text-foreground">
                          Serial No{cap > 1 ? "s" : ""} to issue: {label}
                        </Text>
                      );
                    })()}
                  </View>

                  {/* Summary: Allocated = Pay Now + Pay Barter (paid). Remaining = Pay Later (pending). */}
                  <View className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 gap-1">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[12px] text-muted-foreground">Voucher Total</Text>
                      <Text className="text-[13px] font-semibold text-foreground">{formatINR(voucherTotal)}</Text>
                    </View>
                    <View className="h-px bg-border my-1" />
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[12px] text-muted-foreground">Pay Now</Text>
                      <Text className="text-[12px] text-foreground">{formatINR(payNowNum)}</Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[12px] text-muted-foreground">Pay Barter</Text>
                      <Text className="text-[12px] text-foreground">{formatINR(payBarterNum)}</Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[12px] text-muted-foreground">Pay Later (Pending)</Text>
                      <Text className="text-[12px] font-semibold text-amber-700">{formatINR(payLaterNum)}</Text>
                    </View>
                    <View className="h-px bg-border my-1" />
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-semibold text-foreground">Allocated (Paid)</Text>
                      <Text className="text-sm font-bold text-emerald-600">{formatINR(allocatedAmount)}</Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-semibold text-foreground">Remaining (Pending)</Text>
                      <Text className="text-base font-bold text-amber-600">{formatINR(remainingAmount)}</Text>
                    </View>
                    {overpaid ? (
                      <Text className="mt-1 text-[11px] font-semibold text-destructive">
                        Entered amounts exceed voucher total by {formatINR(enteredSum - voucherTotal)}
                      </Text>
                    ) : unallocated > 0 ? (
                      <Text className="mt-1 text-[11px] text-amber-700">
                        {formatINR(unallocated)} of the voucher total is still un-entered.
                      </Text>
                    ) : (
                      <Text className="mt-1 text-[11px] text-emerald-600">
                        Voucher total fully entered. {formatINR(payLaterNum)} will show as pending on the recipient.
                      </Text>
                    )}
                  </View>

                  {/* Actions */}
                  <View className="gap-2">
                    <Button
                      className="w-full rounded-xl"
                      onPress={handleFriendTransfer}
                      disabled={friendLoading}
                    >
                      <View className="flex-row items-center gap-2">
                        <Gift size={14} color="#fff" />
                        <Text className="text-sm font-semibold text-primary-foreground">
                          {friendLoading ? "Transferring..." : `Transfer ${qty} Voucher${qty !== 1 ? "s" : ""}`}
                        </Text>
                      </View>
                    </Button>
                    <Button variant="outline" className="w-full rounded-xl" onPress={() => setFriendVoucher(null)}>
                      Cancel
                    </Button>
                  </View>
                </View>
              </ScrollView>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Pending Owner-Transfers Dialog (Rajesh Modi only — sender view) */}
      <Dialog open={pendingTransfersOpen} onOpenChange={(open) => setPendingTransfersOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pending Transfers</DialogTitle>
          </DialogHeader>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            <View className="gap-3 px-1 py-2">
              {sentTransfersFetching && pendingTransfers.length === 0 ? (
                <Text className="text-center text-xs text-muted-foreground py-4">Loading...</Text>
              ) : pendingTransfers.length === 0 ? (
                <View className="items-center py-8">
                  <CheckCircle2 size={36} color="#16a34a" />
                  <Text className="mt-3 text-sm text-muted-foreground">No pending payments</Text>
                </View>
              ) : (
                pendingTransfers.map((t: any) => {
                  const pending = Number(t.pay_later ?? 0);
                  const total = Number(t.total_amount ?? 0);
                  const paid = Number(t.pay_now ?? 0);
                  const recipientName = t.recipient?.name || t.recipient_phone || "Unknown";
                  const recipientPhone = t.recipient?.phone || t.recipient_phone || "—";
                  const isThisSettling = settlingTransferId === t.id;
                  return (
                    <View
                      key={t.id}
                      className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3"
                    >
                      <View className="flex-row items-start justify-between gap-2">
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                            {t.voucher?.title || `Voucher #${t.voucher_id}`}
                          </Text>
                          <Text className="mt-0.5 text-[11px] text-muted-foreground">
                            To {recipientName} · {recipientPhone}
                          </Text>
                          <Text className="mt-0.5 text-[10px] text-muted-foreground">
                            Qty {t.quantity} · {safeFormat(t.transferred_at, "MMM d, yyyy")}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-[10px] text-amber-700/70">Pending</Text>
                          <Text className="text-base font-bold text-amber-700">
                            ₹{pending.toLocaleString("en-IN")}
                          </Text>
                        </View>
                      </View>
                      <View className="mt-2 flex-row items-center justify-between rounded-md bg-muted/40 px-2 py-1.5">
                        <Text className="text-[10px] text-muted-foreground">
                          Total ₹{total.toLocaleString("en-IN")} · Paid ₹{paid.toLocaleString("en-IN")}
                        </Text>
                      </View>
                      <View className="mt-2 flex-row gap-2">
                        <Button
                          size="sm"
                          className="flex-1 rounded-lg bg-amber-600"
                          disabled={isThisSettling}
                          onPress={() => handleMarkAsPaid(t.id, pending, recipientName)}
                        >
                          <Text className="text-xs font-semibold text-white">
                            {isThisSettling ? "Marking…" : "Mark as Paid"}
                          </Text>
                        </Button>
                      </View>
                    </View>
                  );
                })
              )}
              <Button
                variant="outline"
                className="mt-2 w-full rounded-xl"
                onPress={() => setPendingTransfersOpen(false)}
              >
                Close
              </Button>
            </View>
          </ScrollView>
        </DialogContent>
      </Dialog>
    </View>
  );
};

export default MyCreatedVouchers;
