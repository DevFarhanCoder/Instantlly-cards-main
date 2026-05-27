import { useCallback, useRef, useState } from "react";
import { Dimensions, Image, Linking, Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft, AtSign, Clock, Globe, MapPin, Phone, Share2, ShieldCheck, Tag, X } from "lucide-react-native";
import Svg, { Rect, Circle, Path } from "react-native-svg";
import { PinchZoomImage } from "../components/PinchZoomImage";

const InstagramIcon = ({ size = 16 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#E1306C" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <Circle cx="12" cy="12" r="4" />
    <Circle cx="17.5" cy="6.5" r="1" />
  </Svg>
);

const FacebookIcon = ({ size = 16 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" fill="#1877F2" />
  </Svg>
);

const YouTubeIcon = ({ size = 16 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.96-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" fill="#FF0000" /><Path d="M9.75 15.02V8.98L15.5 12l-5.75 3.02z" fill="#fff" />
  </Svg>
);
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { ContactVoucherAdminModal } from "../components/ContactVoucherAdminModal";
import { useAuth } from "../hooks/useAuth";
import { useClaimVoucher, useVoucher } from "../hooks/useVouchers";
import { formatINR } from "../lib/utils";
import { isVoucherAdmin } from "../lib/voucherAdmin";
import {
  useCreateVoucherPaymentIntentMutation,
  useVerifyVoucherPaymentMutation,
  useCreateInstallmentPaymentIntentMutation,
  useVerifyInstallmentPaymentMutation,
} from "../store/api/vouchersApi";
import { toast } from "../lib/toast";
import QRCode from "react-native-qrcode-svg";
import { differenceInDays, format, isValid } from "date-fns";
import { colors, useColors } from "../theme/colors";
import { useIconColor } from "../theme/colors";
import {
  isNativeRazorpayAvailable,
  openRazorpayCheckout,
  type RazorpayCheckoutOptions,
  type RazorpayCheckoutSuccess,
} from "../lib/payments/razorpayCheckout";
import { RazorpayWebView } from "../lib/payments/RazorpayWebView";

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

const VoucherDetail = () => {
  const iconColor = useIconColor();
  const themeColors = useColors();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id = route?.params?.id as string;
  const { user } = useAuth();
  const { data: voucher, isLoading, refetch: refetchVoucher } = useVoucher(id || "");
  const claimVoucher = useClaimVoucher();
  const [createIntent, intentState] = useCreateVoucherPaymentIntentMutation();
  const [verifyPayment, verifyState] = useVerifyVoucherPaymentMutation();
  const [createInstallmentIntent, installIntentState] = useCreateInstallmentPaymentIntentMutation();
  const [verifyInstallment, verifyInstallState] = useVerifyInstallmentPaymentMutation();

  const [showPurchase, setShowPurchase] = useState(false);
  const [showClaimContact, setShowClaimContact] = useState(false);
  const [showRedemption, setShowRedemption] = useState(false);
  const [claimReference, setClaimReference] = useState("");
  const [claimId, setClaimId] = useState<number | null>(null);
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [webViewOptions, setWebViewOptions] = useState<RazorpayCheckoutOptions | null>(null);
  const [webViewMode, setWebViewMode] = useState<"claim" | "installment">("claim");
  const [paymentMode, setPaymentMode] = useState<"full" | "upfront" | null>(null);

  // Refs so verifyAndClaim always reads latest intent + mode without stale closures
  const intentRef = useRef<any>(null);
  const paymentModeRef = useRef<"full" | "upfront" | null>(null);

  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [intentData, setIntentData] = useState<any>(null);

  // Installment payment state
  const [showInstallmentPay, setShowInstallmentPay] = useState(false);
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [installmentInfo, setInstallmentInfo] = useState<any>(null);
  const [showBannerPreview, setShowBannerPreview] = useState(false);
  const [bannerZoom, setBannerZoom] = useState(1);
  const [showAllAddresses, setShowAllAddresses] = useState(false);

  const isProcessing = claimVoucher.isPending || intentState.isLoading || verifyState.isLoading ||
    installIntentState.isLoading || verifyInstallState.isLoading;

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetchVoucher(); } finally { setRefreshing(false); }
  }, [refetchVoucher]);

  if (isLoading) {
    return (
      <View className="flex-1 px-4 py-20 gap-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </View>
    );
  }

  if (!voucher) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-5xl mb-3">🔍</Text>
        <Text className="text-muted-foreground">Voucher not found</Text>
        <Button variant="outline" className="mt-3" onPress={() => navigation.goBack()}>
          Go back
        </Button>
      </View>
    );
  }

  const expiryDays = voucher.expires_at && isValid(new Date(voucher.expires_at))
    ? differenceInDays(new Date(voucher.expires_at), new Date())
    : null;
  const expiryLabel =
    expiryDays === null
      ? "No expiry"
      : expiryDays < 0
      ? "Expired"
      : expiryDays === 0
      ? "Expires today"
      : `${expiryDays} days left`;
  const applicablePrice = promoApplied && intentData ? Number(intentData.applicable_price) : Number(voucher.original_price);
  const remainingAfterUpfront = voucher.allows_installment
    ? promoApplied && intentData
      ? Number(intentData.remaining_after_upfront ?? Math.max(0, applicablePrice - Number(voucher.upfront_amount ?? 0)))
      : Math.max(0, Number(voucher.original_price) - Number(voucher.upfront_amount ?? 0))
    : 0;

  const finishClaim = (cId: string | number, installmentDetails?: any) => {
    setClaimReference(`CLM-${cId}`);
    setClaimId(Number(cId));
    if (installmentDetails) setInstallmentInfo(installmentDetails);
    setShowPurchase(false);
    setShowRedemption(true);
  };

  const applyPromoCode = async () => {
    if (!voucher) return;
    if (!promoCode.trim()) { setPromoError("Enter a promo code"); return; }
    try {
      const intent = await createIntent({ id: Number(voucher.id), promo_code: promoCode.trim().toUpperCase() }).unwrap();
      if (intent.promo_applied) {
        setIntentData(intent);
        setPromoApplied(true);
        intentRef.current = intent;
        setPromoError("");
        toast.success(`Promo applied! You save ₹${formatINR(voucher.original_price - intent.applicable_price)}`);
      } else {
        setPromoError("Invalid promo code");
      }
    } catch (e: any) {
      setPromoError(e?.data?.error || "Invalid promo code");
    }
  };

  const verifyAndClaim = async (payment: RazorpayCheckoutSuccess) => {
    if (!voucher) return;
    try {
      const latestIntent = intentRef.current;
      const latestMode = paymentModeRef.current;
      const isPayingUpfront = latestMode === "upfront" && voucher.allows_installment;
      const result = await verifyPayment({
        voucherId: Number(voucher.id),
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: payment.razorpay_payment_id,
        razorpay_signature: payment.razorpay_signature,
        promo_applied: latestIntent?.promo_applied ?? false,
        allows_installment: isPayingUpfront,
      }).unwrap();
      toast.success("Voucher claimed! 🎉");
      setPaymentMode(null);
      finishClaim(result.id, result.installment);
    } catch (e: any) {
      toast.error(e?.data?.error || e?.message || "Payment verification failed");
      setPaymentMode(null);
    }
  };

  const verifyAndClaimInstallment = async (payment: RazorpayCheckoutSuccess) => {
    if (!claimId) return;
    const amt = parseFloat(installmentAmount);
    try {
      const result = await verifyInstallment({
        claimId,
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: payment.razorpay_payment_id,
        razorpay_signature: payment.razorpay_signature,
        amount: amt,
      }).unwrap();
      toast.success(result.installment_status === "completed"
        ? "Balance fully paid! 🎉"
        : `₹${formatINR(amt)} paid. Remaining: ₹${formatINR(Number(result.remaining_balance))}`);
      setShowInstallmentPay(false);
      setInstallmentInfo({ ...installmentInfo, remaining_balance: result.remaining_balance });
      await refetchVoucher();
    } catch (e: any) {
      toast.error(e?.data?.error || e?.message || "Installment payment failed");
    }
  };

  const handlePurchase = async (mode: "full" | "upfront" = "full") => {
    if (!user) {
      toast.error("Please sign in first");
      navigation.navigate("Auth");
      return;
    }
    if (!voucher) return;

    // Free vouchers: claim directly without payment.
    if (!voucher.original_price || voucher.original_price <= 0) {
      try {
        const result = await claimVoucher.mutateAsync(voucher.id);
        finishClaim(result.id);
      } catch {
        // toast handled inside hook
      }
      return;
    }

    // Paid voucher — create order + open Razorpay
    try {
      // Always create a fresh intent for the selected payment mode.
      const intent = await createIntent({
        id: Number(voucher.id),
        payment_mode: mode === "upfront" ? "upfront" : "full",
        promo_code: promoApplied ? promoCode.trim().toUpperCase() : undefined,
      }).unwrap();
      setIntentData(intent);
      // Keep refs in sync so verifyAndClaim always reads the latest intent & mode
      intentRef.current = intent;
      paymentModeRef.current = mode;

      // Determine charge amount based on payment mode
      const isPayingUpfront = mode === "upfront" && voucher.allows_installment;
      const chargeAmount = isPayingUpfront ? (intent.upfront_amount || intent.amount) : intent.applicable_price || intent.amount;
      const description = isPayingUpfront
        ? `Upfront payment for ${intent.voucher_title || voucher.title}`
        : intent.voucher_title || voucher.title;

      const checkoutOptions: RazorpayCheckoutOptions = {
        key: intent.key,
        amount: chargeAmount * 100,
        currency: intent.currency,
        order_id: intent.order_id,
        name: voucher.title || "Voucher",
        description,
        prefill: {
          name: user?.name || undefined,
          contact: user?.phone || undefined,
        },
        theme: { color: "#2463eb" },
      };

      if (isNativeRazorpayAvailable()) {
        try {
          const result = await openRazorpayCheckout(checkoutOptions);
          await verifyAndClaim(result);
          return;
        } catch (nativeErr: any) {
          if (/null|undefined|not a function|NATIVE_UNAVAILABLE/i.test(nativeErr?.message || "")) {
            setWebViewMode("claim");
            setWebViewOptions(checkoutOptions);
            setWebViewVisible(true);
            setPaymentMode(mode);
            return;
          }
          if (
            nativeErr?.code === 0 ||
            /cancelled|canceled/i.test(nativeErr?.description || nativeErr?.message || "")
          ) {
            toast.error("Payment cancelled");
            return;
          }
          throw nativeErr;
        }
      }

      setWebViewMode("claim");
      setWebViewOptions(checkoutOptions);
      setWebViewVisible(true);
    } catch (e: any) {
      toast.error(e?.data?.error || e?.message || "Failed to start payment");
    }
  };

  const handleInstallmentPay = async () => {
    if (!claimId || !user) return;
    const amt = parseFloat(installmentAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (installmentInfo && amt > Number(installmentInfo.remaining_balance)) {
      toast.error(`Amount exceeds remaining balance ₹${formatINR(Number(installmentInfo.remaining_balance))}`);
      return;
    }
    try {
      const intent = await createInstallmentIntent({ claimId, amount: amt }).unwrap();
      const checkoutOptions: RazorpayCheckoutOptions = {
        key: intent.key,
        amount: intent.amount,
        currency: intent.currency,
        order_id: intent.order_id,
        name: voucher?.title || "Voucher",
        description: `Installment payment — ${intent.voucher_title}`,
        prefill: { name: user?.name || undefined, contact: user?.phone || undefined },
        theme: { color: "#2463eb" },
      };
      if (isNativeRazorpayAvailable()) {
        try {
          const result = await openRazorpayCheckout(checkoutOptions);
          await verifyAndClaimInstallment(result);
          return;
        } catch (nativeErr: any) {
          if (/null|undefined|not a function|NATIVE_UNAVAILABLE/i.test(nativeErr?.message || "")) {
            setWebViewMode("installment");
            setWebViewOptions(checkoutOptions);
            setWebViewVisible(true);
            return;
          }
          if (nativeErr?.code === 0 || /cancelled|canceled/i.test(nativeErr?.description || nativeErr?.message || "")) {
            toast.error("Payment cancelled"); return;
          }
          throw nativeErr;
        }
      }
      setWebViewMode("installment");
      setWebViewOptions(checkoutOptions);
      setWebViewVisible(true);
    } catch (e: any) {
      toast.error(e?.data?.error || e?.message || "Failed to start installment payment");
    }
  };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between border-b border-border bg-card px-4 py-4">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={iconColor} />
        </Pressable>
        <Text className="text-xl font-bold text-foreground">Voucher Details</Text>
        <Pressable>
          <Share2 size={20} color="#6a7181" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 16 }} keyboardShouldPersistTaps="handled" refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2463eb"]} tintColor="#2463eb" />
        }>
        <View className="px-4 py-5 gap-5">
          {/* Banner + Logo Hero */}
          <Pressable
            className="relative h-52 rounded-2xl bg-muted overflow-hidden"
            onPress={() => setShowBannerPreview(true)}
          >
            {/* Banner image (background) */}
            {voucher.voucher_banner ? (
              <Image source={{ uri: voucher.voucher_banner }} className="absolute inset-0 w-full h-full" resizeMode="cover" />
            ) : voucher.voucher_image ? (
              <Image source={{ uri: voucher.voucher_image }} className="absolute inset-0 w-full h-full" resizeMode="cover" />
            ) : (
              <View className="absolute inset-0 items-center justify-center">
                <Image source={require("../../assets/Instantlly_Logo-removebg.png")} style={{ width: 140, height: 140 }} resizeMode="contain" />
              </View>
            )}

            {voucher.discount_label && (
              <Badge className="absolute left-3 top-3 bg-primary text-primary-foreground border-none text-base px-3 py-1">
                <Text className="text-primary-foreground text-base font-semibold" numberOfLines={1}>
                  {voucher.discount_label} with code
                </Text>
              </Badge>
            )}

            {/* Circular logo at top-right corner */}
            {voucher.voucher_image ? (
              <View
                style={{
                  position: "absolute",
                  right: 12,
                  top: 12,
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: "#fff",
                  borderWidth: 2,
                  borderColor: "#fff",
                  overflow: "hidden",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 4,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image source={{ uri: voucher.voucher_image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              </View>
            ) : null}
          </Pressable>

          <View>
            <Text className="text-2xl font-bold text-foreground">{voucher.title}</Text>
            {voucher.subtitle ? <Text className="mt-1 text-base text-muted-foreground">{voucher.subtitle}</Text> : null}
            <View className="mt-3 flex-row items-center gap-3">
              <Text className="text-3xl font-bold text-primary">
                ₹{formatINR(applicablePrice)}
              </Text>
              {promoApplied && applicablePrice < voucher.original_price && (
                <>
                  <Text className="text-xl text-muted-foreground line-through">
                    ₹{formatINR(voucher.original_price)}
                  </Text>
                  <Badge className="bg-green-500/10 text-green-600 border-none">
                    Save ₹{formatINR(voucher.original_price - applicablePrice)}
                  </Badge>
                </>
              )}
            </View>
          </View>

          {/* Installment Info (when voucher supports it) */}
          {voucher.allows_installment && (
            <View className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-4 gap-2">
              <Text className="text-base font-semibold text-amber-800 dark:text-amber-300">Installment Available</Text>
              <Text className="text-sm text-amber-700 dark:text-amber-400">
                Pay ₹{formatINR(Number(voucher.upfront_amount))} now to claim. Remaining ₹{formatINR(remainingAfterUpfront)} due pay within next 30 days.
              </Text>
            </View>
          )}

          {/* Active Installment Status (after claim) */}
          {installmentInfo && installmentInfo.remaining_balance > 0 && (
            <View className="rounded-xl border border-orange-300 bg-orange-50 dark:bg-orange-950/20 p-4 gap-3">
              <Text className="text-base font-semibold text-orange-800 dark:text-orange-300">Installment Balance Due</Text>
              <View className="flex-row justify-between">
                <Text className="text-sm text-orange-700 dark:text-orange-400">Remaining</Text>
                <Text className="text-base font-bold text-orange-800 dark:text-orange-300">
                  ₹{formatINR(Number(installmentInfo.remaining_balance))}
                </Text>
              </View>
              {installmentInfo.installment_deadline && (
                <View className="flex-row justify-between">
                  <Text className="text-sm text-orange-700 dark:text-orange-400">Due by</Text>
                  <Text className="text-sm text-orange-700 dark:text-orange-400">
                    {format(new Date(installmentInfo.installment_deadline), "d MMM yyyy")}
                  </Text>
                </View>
              )}
              <View className="flex-row gap-2">
                <TextInput
                  className="flex-1 rounded-lg border border-orange-300 bg-background px-3 py-2 text-base text-foreground"
                  placeholder={`Amount (max ₹${formatINR(Number(installmentInfo.remaining_balance))})`}
                  placeholderTextColor={themeColors.mutedForeground}
                  keyboardType="number-pad"
                  value={installmentAmount}
                  onChangeText={setInstallmentAmount}
                />
                <Button onPress={handleInstallmentPay} disabled={isProcessing} className="px-4 rounded-lg bg-orange-500">
                  <Text style={{ color: "#fff", fontWeight: "600" }}>Pay</Text>
                </Button>
              </View>
            </View>
          )}

          {/* Business Info */}
          {(voucher.company_name || voucher.phone_number || voucher.address || (voucher as any).addresses?.length > 0 || (voucher as any).city || (voucher as any).pincode || voucher.what_we_do || voucher.website || voucher.instagram || (voucher as any).facebook || (voucher as any).youtube) && (
            <View className="rounded-xl border border-border bg-card p-4 gap-3">
              <Text className="text-base font-semibold text-foreground">About the Business</Text>
              {voucher.company_name && (
                <View className="flex-row items-center gap-2">
                  <ShieldCheck size={14} color={iconColor} />
                  <Text className="text-base font-medium text-foreground">{voucher.company_name}</Text>
                </View>
              )}
              {voucher.what_we_do ? (
                <Text className="text-base text-muted-foreground leading-5">{voucher.what_we_do}</Text>
              ) : null}
              {voucher.phone_number && (
                <Pressable
                  className="flex-row items-center gap-2"
                  onPress={() => {
                    const tel = String(voucher.phone_number).replace(/[^0-9+]/g, "");
                    if (tel) Linking.openURL(`tel:${tel}`).catch(() => {});
                  }}
                >
                  <Phone size={14} color={iconColor} />
                  <Text className="text-base text-primary underline">{voucher.phone_number}</Text>
                </Pressable>
              )}
              {/* Multiple addresses */}
              {(() => {
                type AddrEntry = { address: string; instagram?: string | null };
                const raw = (voucher as any).addresses;
                const entries: AddrEntry[] = Array.isArray(raw) && raw.length > 0
                  ? raw.map((a: any) =>
                      typeof a === 'string'
                        ? { address: a, instagram: null }
                        : { address: a.address ?? '', instagram: a.instagram ?? null }
                    ).filter((a: AddrEntry) => a.address)
                  : voucher.address ? [{ address: voucher.address, instagram: null }] : [];
                if (entries.length === 0) return null;
                const first = entries[0];
                const rest = entries.slice(1);
                const isUrl = (s: string) => s.startsWith('http://') || s.startsWith('https://');
                // Splits "Label : https://..." into { label, url } for mixed entries
                const extractUrl = (s: string): { label: string; url: string } | null => {
                  if (isUrl(s)) return null; // pure URL handled separately
                  const m = s.match(/(https?:\/\/\S+)/);
                  if (!m) return null;
                  const url = m[0];
                  const label = s.slice(0, m.index).replace(/[\s:]+$/, '').trim();
                  return { label, url };
                };
                const openMap = (entry: AddrEntry) => {
                  const url = isUrl(entry.address)
                    ? entry.address
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entry.address)}`;
                  Linking.openURL(url).catch(() => {});
                };
                const openInsta = (insta: string) => {
                  let url = insta.trim();
                  if (!url.startsWith('http')) {
                    const handle = url.replace(/^@/, '');
                    url = `https://instagram.com/${handle}`;
                  }
                  Linking.openURL(url).catch(() => {});
                };
                const AddrContent = ({ entry, size }: { entry: AddrEntry; size: 'sm' | 'base' }) => {
                  const mixed = extractUrl(entry.address);
                  const cls = size === 'base' ? 'text-base' : 'text-sm';
                  if (mixed) {
                    return (
                      <View className="flex-1 flex-row flex-wrap items-center gap-x-2 gap-y-1">
                        {mixed.label ? <Text className={`${cls} text-muted-foreground`}>{mixed.label}</Text> : null}
                        <Pressable
                          onPress={() => Linking.openURL(mixed.url).catch(() => {})}
                          className="flex-row items-center gap-1 rounded-md px-2 py-0.5"
                          style={{ backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#A5D6A7' }}
                        >
                          <MapPin size={11} color="#2E7D32" />
                          <Text className="text-xs font-semibold" style={{ color: '#2E7D32' }}>View on Google Maps</Text>
                        </Pressable>
                      </View>
                    );
                  }
                  return (
                    <Pressable className="flex-1" onPress={() => openMap(entry)}>
                      <Text className={`${cls} text-muted-foreground underline`}>
                        {isUrl(entry.address) ? 'View on Maps' : entry.address}
                      </Text>
                    </Pressable>
                  );
                };
                const AddressRow = ({ entry, small, indent }: { entry: AddrEntry; small?: boolean; indent?: boolean }) => (
                  <View className={`flex-row items-start gap-2${indent ? ' pl-5' : ''}`}>
                    <MapPin size={small ? 13 : 14} color={iconColor} style={{ marginTop: 2 }} />
                    <AddrContent entry={entry} size="sm" />
                    {entry.instagram ? (
                      <Pressable onPress={() => openInsta(entry.instagram!)} className="mt-0.5 px-1">
                        <AtSign size={13} color="#e1306c" />
                      </Pressable>
                    ) : null}
                  </View>
                );
                return (
                  <View className="gap-2">
                    <View className="flex-row items-start gap-2">
                      <MapPin size={14} color={iconColor} style={{ marginTop: 2 }} />
                      <AddrContent entry={first} size="base" />
                      {first.instagram ? (
                        <Pressable onPress={() => openInsta(first.instagram!)} className="mt-0.5 px-1">
                          <AtSign size={14} color="#e1306c" />
                        </Pressable>
                      ) : null}
                      {rest.length > 0 && !showAllAddresses && (
                        <Pressable
                          onPress={() => setShowAllAddresses(true)}
                          className="ml-1"
                        >
                          <Text className="text-sm font-semibold text-primary">+{rest.length} more</Text>
                        </Pressable>
                      )}
                    </View>
                    {showAllAddresses && rest.map((addr, idx) => (
                      <AddressRow key={idx} entry={addr} small indent />
                    ))}
                  </View>
                );
              })()}
              {((voucher as any).city || (voucher as any).pincode) && (
                <View className="flex-row items-center gap-2">
                  <MapPin size={14} color={iconColor} />
                  <Text className="text-base text-muted-foreground">
                    {(voucher as any).city}{(voucher as any).city && (voucher as any).pincode ? " - " : ""}{(voucher as any).pincode}
                  </Text>
                </View>
              )}
              {voucher.website ? (
                <Pressable
                  className="flex-row items-center gap-2"
                  onPress={() => {
                    let url = String(voucher.website).trim();
                    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
                    Linking.openURL(url).catch(() => {});
                  }}
                >
                  <Globe size={14} color="#2463eb" />
                  <Text className="text-base text-primary underline">{voucher.website}</Text>
                </Pressable>
              ) : null}
              {voucher.instagram ? (() => {
                const raw = String(voucher.instagram).trim();
                const isUrl = /^https?:\/\//i.test(raw);
                const displayText = isUrl ? raw : `@${raw.replace(/^@/, "")}`;
                const linkUrl = isUrl ? raw : `https://instagram.com/${raw.replace(/^@/, "")}`;
                return (
                  <Pressable
                    className="flex-row items-center gap-2"
                    onPress={() => { Linking.openURL(linkUrl).catch(() => {}); }}
                  >
                    <InstagramIcon size={16} />
                    <Text className="text-base text-primary underline">{displayText}</Text>
                  </Pressable>
                );
              })() : null}
              {(voucher as any).facebook ? (() => {
                const raw = String((voucher as any).facebook).trim();
                const isUrl = /^https?:\/\//i.test(raw);
                const displayText = isUrl ? raw : `@${raw.replace(/^@/, "")}`;
                const linkUrl = isUrl ? raw : `https://facebook.com/${raw.replace(/^@/, "")}`;
                return (
                  <Pressable
                    className="flex-row items-center gap-2"
                    onPress={() => { Linking.openURL(linkUrl).catch(() => {}); }}
                  >
                    <FacebookIcon size={16} />
                    <Text className="text-base text-primary underline">{displayText}</Text>
                  </Pressable>
                );
              })() : null}
              {(voucher as any).youtube ? (() => {
                const raw = String((voucher as any).youtube).trim();
                const isUrl = /^https?:\/\//i.test(raw);
                const displayText = isUrl ? raw : raw;
                const linkUrl = isUrl ? raw : `https://youtube.com/${raw.replace(/^\//, "")}`;
                return (
                  <Pressable
                    className="flex-row items-center gap-2"
                    onPress={() => { Linking.openURL(linkUrl).catch(() => {}); }}
                  >
                    <YouTubeIcon size={16} />
                    <Text className="text-base text-primary underline">{displayText}</Text>
                  </Pressable>
                );
              })() : null}
            </View>
          )}

          {voucher.terms && (
            <View className="rounded-xl border border-border bg-card p-4 gap-2">
              <View className="flex-row items-center gap-2">
                <ShieldCheck size={16} color="#2463eb" />
                <Text className="text-base font-semibold text-foreground">
                  Terms & Conditions
                </Text>
              </View>
              <View className="gap-1.5">
                {voucher.terms
                  .split(/(?:\r?\n)+|(?<=[.!?])\s+(?=[A-Z₹])/)
                  .map((s) => s.trim())
                  .filter((s) => s.length > 0)
                  .map((line, idx) => (
                    <View key={idx} className="flex-row items-start gap-2">
                      <View
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: "#6b7280",
                          marginTop: 6,
                        }}
                      />
                      <Text className="flex-1 text-sm text-muted-foreground">{line}</Text>
                    </View>
                  ))}
              </View>
            </View>
          )}

          {(voucher as any).marketed_by_instantlly && (
            <View className="rounded-xl border border-border bg-card p-4 gap-3">
              <View className="flex-row items-center gap-2">
                <Text className="text-base font-semibold text-foreground">Marketed By:</Text>
                <Image
                  source={require("../../assets/Instantlly_Logo-removebg.png")}
                  style={{ width: 20, height: 20 }}
                  resizeMode="contain"
                />
                <Text className="text-base font-semibold text-primary">Instantlly Cards</Text>
              </View>
              <Pressable
                className="flex-row items-center gap-2"
                onPress={() => { Linking.openURL("https://www.instantlly.com").catch(() => {}); }}
              >
                <Globe size={14} color="#2463eb" />
                <Text className="text-base text-primary underline">www.instantlly.com</Text>
              </Pressable>
              <Pressable
                className="flex-row items-center gap-2"
                onPress={() => { Linking.openURL("tel:9076106061").catch(() => {}); }}
              >
                <Phone size={14} color={iconColor} />
                <Text className="text-base text-primary underline">9076106061</Text>
              </Pressable>
            </View>
          )}

          <View className="rounded-xl border border-border bg-card p-4 gap-2">
            <Text className="text-base font-semibold text-foreground">How to Redeem</Text>
            <View className="gap-2">
              {[
                "Claim the voucher",
                "Receive voucher reference via app",
                "Show the QR code at the merchant",
                "Enjoy your discount!",
              ].map((step, idx) => (
                <Text key={step} className="text-sm text-muted-foreground">
                  {idx + 1}. {step}
                </Text>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="border-t border-border bg-card px-4 py-3">
        {isVoucherAdmin(user as any) ? (
          // Rajesh Modi (voucher admin) doesn't claim vouchers via WhatsApp.
          // Instead, surface the two owner actions: Transfer and Barter Transfer.
          <View className="flex-row gap-2">
            <Button
              className="flex-1 rounded-xl py-4"
              variant="outline"
              onPress={() =>
                navigation.navigate("MyCreatedVouchers", {
                  openTransferForVoucherId: Number(voucher.id),
                })
              }
              disabled={expiryDays !== null && expiryDays < 0}
            >
              <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>
                Transfer
              </Text>
            </Button>
            <Button
              className="flex-1 rounded-xl py-4"
              onPress={() =>
                navigation.navigate("MyCreatedVouchers", {
                  openBarterForVoucherId: Number(voucher.id),
                })
              }
              disabled={expiryDays !== null && expiryDays < 0}
            >
              <Text style={{ color: colors.primaryForeground, fontSize: 16, fontWeight: "700" }}>
                Barter Transfer
              </Text>
            </Button>
          </View>
        ) : (
          <Button
            className="w-full rounded-xl py-4"
            onPress={() => setShowClaimContact(true)}
            disabled={isProcessing || (expiryDays !== null && expiryDays < 0)}
          >
            <Text style={{ color: colors.primaryForeground, fontSize: 18, fontWeight: "700" }}>
              {expiryDays !== null && expiryDays < 0
                ? "Voucher Expired"
                : promoApplied
                  ? voucher.allows_installment
                    ? `Claim Now — ₹${formatINR(applicablePrice)} (Pay ₹${formatINR(Number(voucher.upfront_amount))} Upfront)`
                    : `Claim Voucher — ₹${formatINR(applicablePrice)}`
                  : "Claim Voucher"}
            </Text>
          </Button>
        )}
      </View>

      <Dialog open={showPurchase} onOpenChange={setShowPurchase}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Claim</DialogTitle>
            <DialogDescription>
              {promoApplied
                ? voucher.allows_installment
                  ? `₹${formatINR(applicablePrice)} total — Pay ₹${formatINR(Number(voucher.upfront_amount))} now and the rest within 30 days.`
                  : `You're about to claim ${voucher.title} for ₹${formatINR(applicablePrice)}`
                : `You're about to claim ${voucher.title}`}
            </DialogDescription>
          </DialogHeader>

          {/* Promo Code Input in Dialog */}
          {voucher.code && !promoApplied && (
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <Tag size={14} color="#2463eb" />
                <Text className="text-sm font-semibold text-foreground">Have a Promo Code?</Text>
              </View>
              <View className="flex-row gap-2">
                <TextInput
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground"
                  placeholder="Enter promo code"
                  placeholderTextColor={themeColors.mutedForeground}
                  value={promoCode}
                  onChangeText={(v) => { setPromoCode(v.toUpperCase()); setPromoError(""); }}
                  autoCapitalize="characters"
                />
                <Button onPress={applyPromoCode} disabled={isProcessing} className="px-4 rounded-lg">
                  <Text style={{ color: colors.primaryForeground, fontWeight: "600" }}>Apply</Text>
                </Button>
              </View>
              {promoError ? <Text className="text-sm text-destructive">{promoError}</Text> : null}
            </View>
          )}

          {promoApplied && (
            <View className="rounded-lg bg-green-50 dark:bg-green-950/20 px-3 py-2 flex-row items-center justify-between">
              <Text className="text-base text-green-600 dark:text-green-400 font-semibold">✅ {promoCode} applied!</Text>
              <Pressable onPress={() => { setPromoApplied(false); setPromoCode(""); setIntentData(null); }}>
                <Text className="text-sm text-green-600 dark:text-green-400 underline">Remove</Text>
              </Pressable>
            </View>
          )}

          <View className="rounded-xl bg-muted p-3 gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-medium text-foreground">Pay Now</Text>
              <Text className="text-xl font-bold text-primary">
                ₹{formatINR(voucher.original_price)}
              </Text>
            </View>

            {promoApplied && (
              <>
                <View className="flex-row items-center justify-between border-t border-border pt-2">
                  <Text className="text-sm text-green-600 dark:text-green-400 font-semibold">Promo Applied</Text>
                  <Text className="text-sm text-green-600 dark:text-green-400 font-semibold">{promoCode}</Text>
                </View>

                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-green-600 dark:text-green-400 font-semibold">Discounted Price</Text>
                  <Text className="text-base font-bold text-green-600 dark:text-green-400">
                    ₹{formatINR(applicablePrice)}
                  </Text>
                </View>

                {voucher.allows_installment && (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-muted-foreground">Pay Upfront</Text>
                    <Text className="text-sm font-semibold text-foreground">
                      ₹{formatINR(Number(voucher.upfront_amount))}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
          <DialogFooter>
            <View className="gap-2 w-full">
              <>
                {(() => {
                  const RAZORPAY_MAX = 500000; // ₹5,00,000 single-payment cap
                  const fullExceedsLimit = Number(applicablePrice) > RAZORPAY_MAX;
                  const upfrontExceedsLimit = Number(voucher.upfront_amount ?? 0) > RAZORPAY_MAX;
                  const showFullButton = !fullExceedsLimit;
                  const showInstallmentButton = voucher.allows_installment && !upfrontExceedsLimit;
                  return (
                    <>
                      {showFullButton && (
                        <Button className="w-full rounded-xl" onPress={() => handlePurchase("full")} disabled={isProcessing}>
                          <Text style={{ color: colors.primaryForeground, fontWeight: "600" }}>
                            {isProcessing ? "Processing..." : `Pay ₹${formatINR(applicablePrice)}`}
                          </Text>
                        </Button>
                      )}

                      {showInstallmentButton && (
                        <Button className="w-full rounded-xl bg-orange-500" onPress={() => handlePurchase("upfront")} disabled={isProcessing}>
                          <Text style={{ color: "#fff", fontWeight: "600" }}>
                            {isProcessing ? "Processing..." : `Pay Upfront ₹${formatINR(Number(voucher.upfront_amount ?? 0))}`}
                          </Text>
                        </Button>
                      )}

                      {fullExceedsLimit && voucher.allows_installment && (
                        <View className="rounded-lg bg-amber-50 dark:bg-amber-950/20 px-3 py-2">
                          <Text className="text-sm text-amber-700 dark:text-amber-400">
                            Full payment over ₹5,00,000 isn't supported online. Pay upfront now and the rest in installments.
                          </Text>
                        </View>
                      )}

                      {fullExceedsLimit && !voucher.allows_installment && (
                        <View className="rounded-lg bg-amber-50 dark:bg-amber-950/20 px-3 py-2">
                          <Text className="text-sm text-amber-700 dark:text-amber-400">
                            This voucher's price exceeds the online payment limit of ₹5,00,000. Please contact the business directly.
                          </Text>
                        </View>
                      )}
                    </>
                  );
                })()}

                <Button variant="outline" className="w-full rounded-xl" onPress={() => setShowPurchase(false)}>
                  Cancel
                </Button>
              </>
            </View>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ContactVoucherAdminModal
        open={showClaimContact}
        onOpenChange={setShowClaimContact}
        mode="claim"
        userName={user?.name}
        voucherTitle={voucher?.title}
        voucherPrice={formatINR(applicablePrice)}
      />

      <Dialog open={showRedemption} onOpenChange={setShowRedemption}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Your Voucher is Ready!</DialogTitle>
            <DialogDescription>
              Show this QR code at the merchant to redeem your voucher.
            </DialogDescription>
          </DialogHeader>
          <View className="items-center py-4">
            <QRCode value={`instantly://voucher/${voucher.id}/claim/${claimReference}`} size={160} />
            <Text className="mt-3 text-base font-mono font-bold text-foreground">
              REF: {claimReference}
            </Text>
            <Text className="mt-1 text-sm text-muted-foreground">Valid until expiry</Text>
          </View>
          <Button
            className="w-full rounded-xl"
            onPress={() => {
              setShowRedemption(false);
              navigation.navigate("MyVouchers");
            }}
          >
            View My Vouchers
          </Button>
        </DialogContent>
      </Dialog>

      <Modal
        visible={showBannerPreview}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setBannerZoom(1);
          setShowBannerPreview(false);
        }}
      >
        <View className="flex-1 bg-black">
          {voucher.voucher_banner || voucher.voucher_image ? (
            <PinchZoomImage
              source={{ uri: (voucher.voucher_banner || voucher.voucher_image) as string }}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Image source={require("../../assets/Instantlly_Logo-removebg.png")} style={{ width: 200, height: 200 }} resizeMode="contain" />
            </View>
          )}

          <Pressable
            className="absolute top-14 right-4 rounded-full bg-black/50 p-2"
            onPress={() => {
              setBannerZoom(1);
              setShowBannerPreview(false);
            }}
          >
            <X size={20} color="white" />
          </Pressable>
        </View>
      </Modal>

      {webViewOptions && (
        <RazorpayWebView
          visible={webViewVisible}
          options={webViewOptions}
          onSuccess={async (data) => {
            setWebViewVisible(false);
            if (webViewMode === "installment") {
              await verifyAndClaimInstallment(data);
            } else {
              await verifyAndClaim(data);
            }
            setWebViewOptions(null);
          }}
          onCancel={() => {
            setWebViewVisible(false);
            setWebViewOptions(null);
            toast.error("Payment cancelled");
          }}
          onError={(err) => {
            setWebViewVisible(false);
            setWebViewOptions(null);
            toast.error(err || "Payment failed");
          }}
        />
      )}
    </View>
  );
};

export default VoucherDetail;

