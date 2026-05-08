import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, Clock, Gift, QrCode, Send, Ticket } from "lucide-react-native";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { useAuth } from "../hooks/useAuth";
import {
  useMyVouchers,
  useTransferVoucher,
  useVoucherTransfers,
  type ClaimedVoucher,
} from "../hooks/useVouchers";
import {
  useGetMyInstallmentsQuery,
  useCreateInstallmentPaymentIntentMutation,
  useVerifyInstallmentPaymentMutation,
} from "../store/api/vouchersApi";
import { isNativeRazorpayAvailable, openRazorpayCheckout, type RazorpayCheckoutOptions } from "../lib/payments/razorpayCheckout";
import { RazorpayWebView } from "../lib/payments/RazorpayWebView";
import { toast } from "../lib/toast";
import { formatINR } from "../lib/utils";
import QRCode from "react-native-qrcode-svg";
import { format, isValid } from "date-fns";
import * as Clipboard from "expo-clipboard";
import { useIconColor } from "../theme/colors";

/** Safely format a date string — returns fallback on invalid input */
const safeFormat = (dateStr: any, fmt: string, fallback = "N/A") => {
  if (!dateStr) return fallback;
  const d = new Date(dateStr);
  return isValid(d) ? format(d, fmt) : fallback;
};

const statusConfig: Record<string, { label: string; bg: string; text: string; iconColor: string; icon: any }> = {
  active: { label: "Active", bg: "bg-green-500/10", text: "text-green-600", iconColor: "#28af60", icon: Ticket },
  redeemed: { label: "Redeemed", bg: "bg-primary/10", text: "text-primary", iconColor: "#2463eb", icon: CheckCircle2 },
  expired: { label: "Expired", bg: "bg-muted", text: "text-muted-foreground", iconColor: "#6a7181", icon: Clock },
  transferred: { label: "Transferred", bg: "bg-orange-500/10", text: "text-orange-600", iconColor: "#f97316", icon: Send },
};

const emojiMap: Record<string, string> = {
  travel: "🏖️",
  beauty: "💆",
  food: "🍽️",
  health: "💪",
  shopping: "🛍️",
  entertainment: "🎬",
  activities: "🏄",
  education: "📚",
  general: "🎁",
};

const tabs = ["All", "Active", "Redeemed", "Expired", "Transfers"];

const MyVouchers = () => {
  const iconColor = useIconColor();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { data: claimedVouchers = [], isLoading, refetch: refetchVouchers } = useMyVouchers();
  const { mutate: transferVoucher, isPending: isTransferring } = useTransferVoucher();
  const { data: transfers = [], refetch: refetchTransfers } = useVoucherTransfers();
  const { data: myInstallments = [], refetch: refetchInstallments } = useGetMyInstallmentsQuery(undefined, { skip: !user });
  const [createInstallmentIntent, { isLoading: creatingIntent }] = useCreateInstallmentPaymentIntentMutation();
  const [verifyInstallment, { isLoading: verifyingIntent }] = useVerifyInstallmentPaymentMutation();
  const [payingClaimId, setPayingClaimId] = useState<number | null>(null);
  const [payAmounts, setPayAmounts] = useState<Record<number, string>>({});
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [webViewOptions, setWebViewOptions] = useState<RazorpayCheckoutOptions | null>(null);
  const [webViewContext, setWebViewContext] = useState<{ claimId: number; amount: number } | null>(null);
  const isPayingInstallment = creatingIntent || verifyingIntent;

  const verifyInstallmentResult = useCallback(
    async (claimId: number, payAmount: number, payment: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
      try {
        const result = await verifyInstallment({
          claimId,
          razorpay_order_id: payment.razorpay_order_id,
          razorpay_payment_id: payment.razorpay_payment_id,
          razorpay_signature: payment.razorpay_signature,
          amount: payAmount,
        }).unwrap();
        toast.success(
          result.installment_status === "completed"
            ? "Balance fully paid! \ud83c\udf89"
            : `\u20b9${formatINR(payAmount)} paid. Remaining: \u20b9${formatINR(Number(result.remaining_balance))}`,
        );
        setPayAmounts((prev) => ({ ...prev, [claimId]: "" }));
        await refetchInstallments();
      } catch (e: any) {
        toast.error(e?.data?.error || e?.message || "Verification failed");
      }
    },
    [verifyInstallment, refetchInstallments],
  );

  const handlePayInstallment = useCallback(
    async (claimId: number, requestedAmount: number, remainingBalance: number, voucherTitle: string) => {
      if (!user) return;
      if (!requestedAmount || requestedAmount <= 0) { toast.error("Enter a valid amount"); return; }
      if (requestedAmount > remainingBalance) {
        toast.error(`Amount exceeds remaining balance \u20b9${formatINR(remainingBalance)}`);
        return;
      }
      const RAZORPAY_MAX = 500000;
      if (requestedAmount > RAZORPAY_MAX) {
        toast.error(`Razorpay limit is ₹5,00,000 per transaction. Please split your payment.`);
        return;
      }
      const payAmount = requestedAmount;
      setPayingClaimId(claimId);
      try {
        const intent = await createInstallmentIntent({ claimId, amount: payAmount }).unwrap();
        const checkoutOptions: RazorpayCheckoutOptions = {
          key: intent.key,
          amount: intent.amount,
          currency: intent.currency,
          order_id: intent.order_id,
          name: voucherTitle || "Voucher",
          description: `Installment payment \u2014 ${intent.voucher_title || voucherTitle}`,
          prefill: { name: user?.name || undefined, contact: user?.phone || undefined },
          theme: { color: "#2463eb" },
        };
        const openWebViewFallback = () => {
          setWebViewContext({ claimId, amount: payAmount });
          setWebViewOptions(checkoutOptions);
          setWebViewVisible(true);
        };
        if (isNativeRazorpayAvailable()) {
          try {
            const payment = await openRazorpayCheckout(checkoutOptions);
            await verifyInstallmentResult(claimId, payAmount, payment);
            return;
          } catch (nativeErr: any) {
            const msg = nativeErr?.message || nativeErr?.description || "";
            if (/null|undefined|not a function|NATIVE_UNAVAILABLE/i.test(msg)) {
              openWebViewFallback();
              return;
            }
            if (nativeErr?.code === 0 || /cancelled|canceled/i.test(msg)) {
              toast.error("Payment cancelled");
              return;
            }
            throw nativeErr;
          }
        }
        openWebViewFallback();
      } catch (e: any) {
        toast.error(e?.data?.error || e?.message || "Installment payment failed");
      } finally {
        setPayingClaimId(null);
      }
    },
    [user, createInstallmentIntent, verifyInstallmentResult],
  );

  // Build a lookup map: claimId -> installment data
  const installmentMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const inst of myInstallments) {
      map.set(String(inst.claim_id), inst);
    }
    return map;
  }, [myInstallments]);

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await Promise.all([refetchVouchers(), refetchTransfers(), refetchInstallments()]); } finally { setRefreshing(false); }
  }, [refetchVouchers, refetchTransfers, refetchInstallments]);
  const [activeTab, setActiveTab] = useState("All");
  const [qrVoucher, setQrVoucher] = useState<ClaimedVoucher | null>(null);
  const [transferVoucherTarget, setTransferVoucherTarget] = useState<ClaimedVoucher | null>(null);
  const [transferPhone, setTransferPhone] = useState("");
  const [expandedInstallments, setExpandedInstallments] = useState<Set<string>>(new Set());
  const toggleInstallment = (id: string) => setExpandedInstallments((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const filtered =
    activeTab === "All"
      ? claimedVouchers
      : activeTab === "Transfers"
      ? claimedVouchers
      : claimedVouchers.filter((v) => v.status === activeTab.toLowerCase());

  const totalSaved = claimedVouchers
    .filter((v) => v.status !== "expired" && v.voucher)
    .reduce(
      (s, v) => s + (v.voucher!.original_price - v.voucher!.discounted_price),
      0
    );

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Gift size={48} color="#6a7181" />
        <Text className="mt-3 text-sm text-muted-foreground">
          Sign in to view your vouchers
        </Text>
        <Button className="mt-4 rounded-xl" onPress={() => navigation.navigate("Auth")}>
          Sign In
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 border-b border-border bg-card px-4 py-4">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={iconColor} />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">My Vouchers</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 16 }} refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2463eb"]} tintColor="#2463eb" />
        }>
        <View className="px-4 py-4 gap-4">
          <View className="rounded-2xl border border-border bg-primary/5 p-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xs text-muted-foreground">Total Savings</Text>
                <Text className="text-2xl font-bold text-foreground">
                  ₹{formatINR(totalSaved)}
                </Text>
              </View>
              <View className="flex-row gap-3">
                <View className="items-center">
                  <Text className="text-lg font-bold text-foreground">
                    {claimedVouchers.filter((v) => v.status === "active").length}
                  </Text>
                  <Text className="text-[10px] text-muted-foreground">Active</Text>
                </View>
                <View className="items-center">
                  <Text className="text-lg font-bold text-foreground">
                    {claimedVouchers.filter((v) => v.status === "redeemed").length}
                  </Text>
                  <Text className="text-[10px] text-muted-foreground">Used</Text>
                </View>
              </View>
            </View>
          </View>

          <View className="flex-row gap-2">
            {tabs.map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`flex-1 rounded-lg py-2 ${
                  activeTab === tab ? "bg-primary" : "bg-muted"
                }`}
              >
                <Text
                  className={`text-center text-xs font-medium ${
                    activeTab === tab ? "text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {tab}
                </Text>
              </Pressable>
            ))}
          </View>

          {activeTab === "Transfers" ? (
            transfers.length === 0 ? (
              <View className="items-center py-16">
                <Send size={48} color="#6a7181" />
                <Text className="mt-3 text-sm text-muted-foreground">
                  No transfer history
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {transfers.map((t) => {
                  const isSent = String(t.sender_id) === String(user?.id ?? "");
                  const counterPhone = isSent ? t.recipient_phone : t.sender_phone;
                  const rawName = isSent ? t.recipient_name : t.sender_name;
                  const counterName =
                    (rawName && rawName.trim()) || counterPhone || "Unknown user";
                  const voucherTitle = t.voucher?.title || `Voucher #${t.voucher_id}`;
                  const business = t.voucher?.business_name;
                  const discount = t.voucher?.discount_label;
                  return (
                    <View
                      key={t.id}
                      testID={`transfer-row-${t.id}`}
                      className="rounded-xl border border-border bg-card p-4"
                    >
                      <View className="flex-row items-center gap-3">
                        <View
                          className={`h-10 w-10 items-center justify-center rounded-full ${
                            isSent ? "bg-destructive/10" : "bg-primary/10"
                          }`}
                        >
                          <Send
                            size={16}
                            color={isSent ? "#ef4343" : "#2463eb"}
                            style={{ transform: [{ rotate: isSent ? "0deg" : "180deg" }] }}
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                            {voucherTitle}
                          </Text>
                          {business ? (
                            <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                              {business}
                            </Text>
                          ) : null}
                        </View>
                        <View
                          className={`rounded-full px-2 py-0.5 ${
                            isSent ? "bg-destructive/10" : "bg-primary/10"
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-semibold ${
                              isSent ? "text-destructive" : "text-primary"
                            }`}
                          >
                            {isSent ? "Sent" : "Received"}
                          </Text>
                        </View>
                      </View>

                      <View className="mt-3 gap-1 rounded-lg bg-muted px-3 py-2">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-[11px] text-muted-foreground">
                            {isSent ? "Sent to" : "Received from"}
                          </Text>
                          <Text className="text-[11px] font-semibold text-foreground" numberOfLines={1}>
                            {counterName}
                          </Text>
                        </View>
                        {counterPhone ? (
                          <View className="flex-row items-center justify-between">
                            <Text className="text-[11px] text-muted-foreground">Mobile</Text>
                            <Text className="text-[11px] font-mono text-foreground">
                              {counterPhone}
                            </Text>
                          </View>
                        ) : null}
                        {discount ? (
                          <View className="flex-row items-center justify-between">
                            <Text className="text-[11px] text-muted-foreground">Value</Text>
                            <Text className="text-[11px] font-semibold text-primary">
                              {discount}
                            </Text>
                          </View>
                        ) : null}
                        <View className="flex-row items-center justify-between">
                          <Text className="text-[11px] text-muted-foreground">Voucher Ref</Text>
                          <Text className="text-[11px] font-mono text-foreground">
                            VCH-{t.voucher_id}
                          </Text>
                        </View>
                      </View>

                      <Text className="mt-2 text-[10px] text-muted-foreground">
                        {safeFormat(t.transferred_at, "MMM d, yyyy • h:mm a")}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )
          ) : isLoading ? (
            <View className="gap-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </View>
          ) : filtered.length === 0 ? (
            <View className="items-center py-16">
              <Gift size={48} color="#6a7181" />
              <Text className="mt-3 text-sm text-muted-foreground">
                No vouchers found
              </Text>
              <Button
                variant="outline"
                className="mt-3"
                onPress={() => navigation.navigate("Vouchers")}
              >
                Browse Vouchers
              </Button>
            </View>
          ) : (
            <View className="gap-3">
              {filtered.map((v) => {
                const config = statusConfig[v.status] || statusConfig.active;
                const StatusIcon = config.icon;
                const voucher = v.voucher;
                const actionIconColor = config.iconColor;
                return (
                  <View
                    key={v.id}
                    testID={`voucher-card-${v.id}`}
                    className="overflow-hidden rounded-xl border border-border bg-card"
                  >
                    <View className="p-4">
                      <View className="flex-row items-start gap-3">
                        <View className="h-12 w-12 items-center justify-center rounded-xl bg-muted">
                          <Text className="text-2xl">
                            {emojiMap[voucher?.category || "general"] || "🎁"}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-start justify-between gap-2">
                            <Text className="flex-1 text-sm font-semibold text-foreground" numberOfLines={1}>
                              {voucher?.title || "Voucher"}
                            </Text>
                            <View
                              testID={`voucher-status-${v.id}`}
                              className={`flex-row items-center gap-1 rounded-full px-2 py-0.5 ${config.bg}`}
                            >
                              <StatusIcon size={12} color={config.iconColor} />
                              <Text className={`text-[10px] font-semibold ${config.text}`}>
                                {config.label}
                              </Text>
                            </View>
                          </View>
                          {voucher?.subtitle ? (
                            <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={2}>
                              {voucher.subtitle}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      {v.status === "active" && (
                        <View className="mt-3 rounded-lg bg-muted px-3 py-2.5">
                          <Text className="text-[10px] text-muted-foreground">Voucher Reference</Text>
                          <Text className="mt-0.5 text-sm font-mono font-bold text-foreground">
                            CLM-{v.id}
                          </Text>
                          <View className="mt-2.5 flex-row gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 rounded-lg px-2"
                              textClassName="text-xs"
                              onPress={() => setQrVoucher(v)}
                            >
                              <QrCode size={14} color={actionIconColor} />
                              <Text className="text-xs font-medium text-foreground">QR</Text>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 rounded-lg px-2"
                              textClassName="text-xs"
                              onPress={async () => {
                                await Clipboard.setStringAsync(`CLM-${v.id}`);
                                toast.success("Reference copied!");
                              }}
                            >
                              Copy
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 rounded-lg px-2"
                              textClassName="text-xs"
                              onPress={() => {
                                setTransferVoucherTarget(v);
                                setTransferPhone("");
                              }}
                            >
                              <Send size={14} color={actionIconColor} />
                              <Text className="text-xs font-medium text-foreground">Transfer</Text>
                            </Button>
                          </View>
                        </View>
                      )}

                      <View className="mt-2 flex-row items-center justify-between">
                        <Text className="text-[10px] text-muted-foreground">
                          Claimed: {safeFormat(v.claimed_at, "MMM d, yyyy")}
                        </Text>
                        {voucher?.expires_at && (
                          <Text className="text-[10px] text-muted-foreground">
                            Expires: {safeFormat(voucher.expires_at, "MMM d, yyyy")}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Installment payment history */}
                    {(() => {
                      const inst = installmentMap.get(String(v.id));
                      if (!inst) return null;
                      const isExpanded = expandedInstallments.has(String(v.id));
                      const statusColor = inst.installment_status === "completed"
                        ? { bg: "bg-green-500/10", text: "text-green-600" }
                        : inst.installment_status === "expired"
                        ? { bg: "bg-muted", text: "text-muted-foreground" }
                        : { bg: "bg-amber-500/10", text: "text-amber-600" };
                      return (
                        <View className="border-t border-border">
                          <Pressable
                            className="flex-row items-center justify-between px-4 py-2.5"
                            onPress={() => toggleInstallment(String(v.id))}
                          >
                            <View className="flex-row items-center gap-2">
                              <View className={`rounded-full px-2 py-0.5 ${statusColor.bg}`}>
                                <Text className={`text-[10px] font-semibold ${statusColor.text}`}>
                                  Installment {inst.installment_status === "completed" ? "Paid" : inst.installment_status === "expired" ? "Expired" : "Active"}
                                </Text>
                              </View>
                              <Text className="text-[11px] text-muted-foreground">
                                ₹{formatINR(inst.paid_amount)} paid
                                {inst.remaining_balance > 0 ? ` · ₹${formatINR(inst.remaining_balance)} due` : ""}
                              </Text>
                            </View>
                            {isExpanded ? <ChevronUp size={14} color="#6a7181" /> : <ChevronDown size={14} color="#6a7181" />}
                          </Pressable>
                          {isExpanded && (
                            <View className="px-4 pb-3 gap-2">
                              {inst.installment_deadline && (
                                <View className="flex-row justify-between">
                                  <Text className="text-[11px] text-muted-foreground">Due date</Text>
                                  <Text className="text-[11px] font-medium text-foreground">
                                    {safeFormat(inst.installment_deadline, "MMM d, yyyy")}
                                  </Text>
                                </View>
                              )}
                              {inst.recent_payments && inst.recent_payments.length > 0 ? (
                                <View className="rounded-lg bg-muted px-3 py-2 gap-1.5">
                                  <Text className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Payment History</Text>
                                  {inst.recent_payments.map((p: any, idx: number) => (
                                    <View key={idx} className="flex-row items-center justify-between">
                                      <Text className="text-[11px] text-foreground">₹{formatINR(p.amount)}</Text>
                                      <Text className="text-[10px] text-muted-foreground">
                                        {safeFormat(p.paid_at, "MMM d, yyyy")}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              ) : (
                                <Text className="text-[11px] text-muted-foreground">No payments recorded yet</Text>
                              )}
                              {inst.remaining_balance > 0 && inst.installment_status !== "expired" && voucher?.id && (
                                <View className="mt-1 gap-1.5">
                                  <Text className="text-[11px] font-medium text-muted-foreground">
                                    Pay any amount (max ₹{formatINR(Math.min(Number(inst.remaining_balance), 500000))} per transaction)
                                  </Text>
                                  <View className="flex-row items-center gap-2">
                                    <Input
                                      className="flex-1"
                                      keyboardType="numeric"
                                      placeholder={`₹${formatINR(Math.min(Number(inst.remaining_balance), 500000))}`}
                                      value={payAmounts[Number(v.id)] ?? ""}
                                      onChangeText={(text) =>
                                        setPayAmounts((prev) => ({ ...prev, [Number(v.id)]: text.replace(/[^0-9.]/g, "") }))
                                      }
                                      editable={!(isPayingInstallment && payingClaimId === Number(v.id))}
                                    />
                                    <Button
                                      size="sm"
                                      className="rounded-lg bg-orange-500"
                                      disabled={isPayingInstallment && payingClaimId === Number(v.id)}
                                      onPress={() => {
                                        const raw = payAmounts[Number(v.id)];
                                        const remaining = Number(inst.remaining_balance);
                                        const fallback = Math.min(remaining, 500000);
                                        const amt = raw && raw.trim() !== "" ? parseFloat(raw) : fallback;
                                        handlePayInstallment(
                                          Number(v.id),
                                          amt,
                                          remaining,
                                          voucher.title || "Voucher",
                                        );
                                      }}
                                    >
                                      <Text style={{ color: "#fff", fontWeight: "600" }}>
                                        {isPayingInstallment && payingClaimId === Number(v.id) ? "Processing..." : "Pay"}
                                      </Text>
                                    </Button>
                                  </View>
                                  {Number(inst.remaining_balance) <= 500000 && (
                                    <Pressable
                                      onPress={() =>
                                        setPayAmounts((prev) => ({ ...prev, [Number(v.id)]: String(inst.remaining_balance) }))
                                      }
                                    >
                                      <Text className="text-[11px] font-medium text-orange-600">
                                        Pay full ₹{formatINR(inst.remaining_balance)}
                                      </Text>
                                    </Pressable>
                                  )}
                                  {Number(inst.remaining_balance) > 500000 && (
                                    <Pressable
                                      onPress={() => setPayAmounts((prev) => ({ ...prev, [Number(v.id)]: "500000" }))}
                                    >
                                      <Text className="text-[11px] font-medium text-orange-600">
                                        Pay max ₹5,00,000 (split required)
                                      </Text>
                                    </Pressable>
                                  )}
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })()}

                    {v.status === "active" && voucher && (
                      <View className="border-t border-dashed border-border bg-primary/5 px-4 py-2.5">
                        <Text className="text-center text-xs font-medium text-primary">
                          You saved ₹{formatINR(voucher.original_price - voucher.discounted_price)}!
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Dialog open={!!qrVoucher} onOpenChange={(open) => !open && setQrVoucher(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Redeem Voucher</DialogTitle>
          </DialogHeader>
          {qrVoucher && (
            <View className="items-center py-4">
              <QRCode
                value={`instantly://voucher/${qrVoucher.voucher_id}/claim/${qrVoucher.id}`}
                size={160}
              />
              <Text className="mt-3 text-sm font-mono font-bold text-foreground">
                CLM-{qrVoucher.id}
              </Text>
              <Text className="mt-1 text-xs text-muted-foreground">
                Show this QR to the merchant
              </Text>
            </View>
          )}
          <Button className="w-full rounded-xl" onPress={() => setQrVoucher(null)}>
            Done
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!transferVoucherTarget}
        onOpenChange={(open) => !open && setTransferVoucherTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Transfer Voucher</DialogTitle>
            <DialogDescription>
              Send this voucher to another user by their mobile number.
            </DialogDescription>
          </DialogHeader>
          {transferVoucherTarget && (
            <View className="gap-4 py-2">
              <View className="rounded-lg bg-muted p-3">
                <Text className="text-sm font-semibold text-foreground">
                  {transferVoucherTarget.voucher?.title || "Voucher"}
                </Text>
                <Text className="mt-0.5 text-xs text-muted-foreground">
                  Reference: CLM-{transferVoucherTarget.id}
                </Text>
              </View>
              <View className="gap-2">
                <Text className="text-sm font-medium text-foreground">
                  Recipient Mobile Number
                </Text>
                <Input
                  placeholder="Enter 10-digit mobile number"
                  value={transferPhone}
                  onChangeText={setTransferPhone}
                  keyboardType="phone-pad"
                  className="rounded-lg"
                  maxLength={10}
                />
              </View>
              <Button
                className="w-full rounded-xl"
                disabled={transferPhone.replace(/\D/g, "").length < 10 || isTransferring}
                onPress={() => {
                  transferVoucher(
                    { voucherId: transferVoucherTarget.voucher_id, recipientPhone: transferPhone.trim() },
                    {
                      onSuccess: () => setTransferVoucherTarget(null),
                      onStaleClaim: () => setTransferVoucherTarget(null),
                    }
                  );
                }}
              >
                {isTransferring ? "Transferring..." : "Transfer Voucher"}
              </Button>
            </View>
          )}
        </DialogContent>
      </Dialog>

      {webViewOptions && (
        <RazorpayWebView
          visible={webViewVisible}
          options={webViewOptions}
          onSuccess={async (data) => {
            setWebViewVisible(false);
            const ctx = webViewContext;
            setWebViewContext(null);
            setWebViewOptions(null);
            if (ctx) await verifyInstallmentResult(ctx.claimId, ctx.amount, data);
          }}
          onCancel={() => {
            setWebViewVisible(false);
            setWebViewContext(null);
            setWebViewOptions(null);
            toast.error("Payment cancelled");
          }}
          onError={(err) => {
            setWebViewVisible(false);
            setWebViewContext(null);
            setWebViewOptions(null);
            toast.error(err || "Payment failed");
          }}
        />
      )}
    </View>
  );
};

export default MyVouchers;

