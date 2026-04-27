import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft, Clock, Share2, ShieldCheck } from "lucide-react-native";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { useAuth } from "../hooks/useAuth";
import { useClaimVoucher, useVoucher } from "../hooks/useVouchers";
import { toast } from "../lib/toast";
import QRCode from "react-native-qrcode-svg";
import { differenceInDays, isValid } from "date-fns";
import { colors } from "../theme/colors";
import { useIconColor } from "../theme/colors";

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
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id = route?.params?.id as string;
  const { user } = useAuth();
  const { data: voucher, isLoading, refetch: refetchVoucher } = useVoucher(id || "");
  const claimVoucher = useClaimVoucher();
  const [showPurchase, setShowPurchase] = useState(false);
  const [showRedemption, setShowRedemption] = useState(false);
  const [claimReference, setClaimReference] = useState("");

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

  const savings = voucher.original_price - voucher.discounted_price;
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

  const handlePurchase = async () => {
    if (!user) {
      toast.error("Please sign in first");
      navigation.navigate("Auth");
      return;
    }
    try {
      const result = await claimVoucher.mutateAsync(voucher.id);
      setClaimReference(`CLM-${result.id}`);
      setShowPurchase(false);
      setShowRedemption(true);
    } catch (e: any) {
      // error toast is handled by useClaimVoucher hook
    }
  };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between border-b border-border bg-card px-4 py-4">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={iconColor} />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">Voucher Details</Text>
        <Pressable>
          <Share2 size={20} color="#6a7181" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 16 }} refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2463eb"]} tintColor="#2463eb" />
        }>
        <View className="px-4 py-5 gap-5">
          <View className="relative h-48 items-center justify-center rounded-2xl bg-muted overflow-hidden">
            <Text className="text-7xl">{emojiMap[voucher.category] || "🎁"}</Text>
            {voucher.discount_label && (
              <Badge className="absolute left-3 top-3 bg-primary text-primary-foreground border-none text-sm px-3 py-1">
                {voucher.discount_label}
              </Badge>
            )}
            <View className="absolute bottom-3 left-3 flex-row items-center gap-1 rounded-full bg-background/80 px-3 py-1">
              <Clock size={12} color={iconColor} />
              <Text className="text-xs font-medium text-foreground">{expiryLabel}</Text>
            </View>
          </View>

          <View>
            <Text className="text-xl font-bold text-foreground">{voucher.title}</Text>
            <Text className="mt-1 text-sm text-muted-foreground">{voucher.subtitle}</Text>
            <View className="mt-3 flex-row items-center gap-3">
              <Text className="text-2xl font-bold text-primary">
                ₹{voucher.discounted_price.toLocaleString()}
              </Text>
              <Text className="text-lg text-muted-foreground line-through">
                ₹{voucher.original_price.toLocaleString()}
              </Text>
              <Badge className="bg-green-500/10 text-green-600 border-none">
                Save ₹{savings.toLocaleString()}
              </Badge>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-3">
            {[
              { icon: "✅", label: "Instant Delivery" },
              { icon: "🔄", label: "Easy Refund" },
              { icon: "📱", label: "Mobile Voucher" },
              { icon: "🎉", label: "Gift Ready" },
            ].map((f) => (
              <View key={f.label} className="w-[48%] flex-row items-center gap-2 rounded-xl border border-border bg-card p-3">
                <Text>{f.icon}</Text>
                <Text className="text-xs font-medium text-foreground">{f.label}</Text>
              </View>
            ))}
          </View>

          {voucher.terms && (
            <View className="rounded-xl border border-border bg-card p-4 gap-2">
              <View className="flex-row items-center gap-2">
                <ShieldCheck size={16} color="#2463eb" />
                <Text className="text-sm font-semibold text-foreground">
                  Terms & Conditions
                </Text>
              </View>
              <Text className="text-xs text-muted-foreground">
                {voucher.terms}
              </Text>
            </View>
          )}

          <View className="rounded-xl border border-border bg-card p-4 gap-2">
            <Text className="text-sm font-semibold text-foreground">How to Redeem</Text>
            <View className="gap-2">
              {[
                "Claim the voucher",
                "Receive voucher reference via app",
                "Show the QR code at the merchant",
                "Enjoy your discount!",
              ].map((step, idx) => (
                <Text key={step} className="text-xs text-muted-foreground">
                  {idx + 1}. {step}
                </Text>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="border-t border-border bg-card px-4 py-3">
        <Button
          className="w-full rounded-xl py-4"
          onPress={() => setShowPurchase(true)}
          disabled={claimVoucher.isPending || (expiryDays !== null && expiryDays < 0)}
        >
          <Text style={{ color: colors.primaryForeground, fontSize: 16, fontWeight: "700" }}>
            {expiryDays !== null && expiryDays < 0 ? "Voucher Expired" : `Claim Voucher — ₹${voucher.discounted_price.toLocaleString()}`}
          </Text>
        </Button>
      </View>

      <Dialog open={showPurchase} onOpenChange={setShowPurchase}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Claim</DialogTitle>
            <DialogDescription>
              You're about to claim {voucher.title} for ₹{voucher.discounted_price.toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <View className="rounded-xl bg-muted p-3 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-foreground">Total</Text>
            <Text className="text-lg font-bold text-primary">
              ₹{voucher.discounted_price.toLocaleString()}
            </Text>
          </View>
          <DialogFooter>
            <View className="gap-2">
              <Button className="w-full rounded-xl" onPress={handlePurchase} disabled={claimVoucher.isPending}>
                {claimVoucher.isPending ? "Processing..." : "Confirm Claim"}
              </Button>
              <Button variant="outline" className="w-full rounded-xl" onPress={() => setShowPurchase(false)}>
                Cancel
              </Button>
            </View>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Text className="mt-3 text-sm font-mono font-bold text-foreground">
              REF: {claimReference}
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground">Valid until expiry</Text>
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
    </View>
  );
};

export default VoucherDetail;

