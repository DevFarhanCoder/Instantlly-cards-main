import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft, Check, Crown } from "lucide-react-native";
import { cn } from "../lib/utils";
import { colors } from "../theme/colors";
import { useAuth } from "../hooks/useAuth";
import { useBusinessCards } from "../hooks/useBusinessCards";
import { toast } from "../lib/toast";
import { useAppDispatch, useAppSelector } from "../store";
import { setCredentials, setActiveRole, selectCurrentUser } from '../store/authSlice';
import {
  useCreatePromotionMutation,
  useCreatePromotionPaymentIntentMutation,
  useVerifyPromotionPaymentMutation,
  useListPricingPlansQuery,
} from "../store/api/promotionsApi";
import { isNativeRazorpayAvailable, openRazorpayCheckout } from "../lib/payments/razorpayCheckout";
import { RazorpayWebView } from "../lib/payments/RazorpayWebView";
import * as SecureStore from 'expo-secure-store';
import { parseCategoryString } from "../lib/categoryUtils";
import { useIconColor } from "../theme/colors";

const premiumPlans = [
  {
    id: "growth",
    name: "GROWTH",
    monthlyPrice: "₹1,500",
    yearlyPrice: "₹18,000",
    monthlyYearlyPrice: "₹15,000",
    yearlySavings: "Save ₹3,000/Year",
    bgColor: "#ffffff",
    accentColor: "#1e293b",
    tagColor: "#64748b",
    isFree: false,
    features: [
      { name: "Visiting Card", available: true },
      { name: "Category Listing", available: true },
      { name: "Social Media Posts", available: true },
      { name: "CRM Lead Management", available: true },
    ],
  },
  {
    id: "boost",
    name: "BOOST",
    monthlyPrice: "₹2,500",
    yearlyPrice: "₹30,000",
    monthlyYearlyPrice: "₹25,000",
    yearlySavings: "Save ₹5,000/Year",
    bgColor: "#fffbeb",
    accentColor: "#92400e",
    tagColor: "#b45309",
    isFree: false,
    features: [
      { name: "Visiting Card", available: true },
      { name: "Category Listing", available: true },
      { name: "Social Media Posts", available: true },
      { name: "CRM Lead Management", available: true },
      { name: "Verified Badge", available: true },
      { name: "Meta Ads Management", available: true },
    ],
  },
  {
    id: "scale",
    name: "SCALE",
    monthlyPrice: "₹4,000",
    yearlyPrice: "₹48,000",
    monthlyYearlyPrice: "₹40,000",
    yearlySavings: "Save ₹8,000/Year",
    bgColor: "#fef2f2",
    accentColor: "#991b1b",
    tagColor: "#dc2626",
    isFree: false,
    features: [
      { name: "Visiting Card", available: true },
      { name: "Category Listing", available: true },
      { name: "Social Media Posts", available: true },
      { name: "CRM Lead Management", available: true },
      { name: "Verified Badge", available: true },
      { name: "Meta Ads Management", available: true },
      { name: "Google Ads Management", available: true },
      { name: "Business Audit", available: true },
      { name: "Priority Listing", available: true },
      { name: "Chat GPT", available: true },
    ],
  },
  {
    id: "dominate",
    name: "DOMINATE",
    monthlyPrice: "₹5,000",
    yearlyPrice: "₹60,000",
    monthlyYearlyPrice: "₹50,000",
    yearlySavings: "Save ₹10,000/Year",
    bgColor: "#faf5ff",
    accentColor: "#581c87",
    tagColor: "#7c3aed",
    isFree: false,
    features: [
      { name: "Visiting Card", available: true },
      { name: "Category Listing", available: true },
      { name: "Social Media Posts", available: true },
      { name: "CRM Lead Management", available: true },
      { name: "Verified Badge", available: true },
      { name: "Meta Ads Management", available: true },
      { name: "Google Ads Management", available: true },
      { name: "Business Audit", available: true },
      { name: "Priority Listing", available: true },
      { name: "Chat GPT", available: true },
      { name: "Business Coach", available: true },
    ],
  },
];

const PremiumPlanSelection = () => {
  const iconColor = useIconColor();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { createCard } = useBusinessCards();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  
  // Mode 1: New listing (formData from BusinessPromotionForm)
  // Mode 2: Existing promotion (promotionId from MyCards "Complete Payment")
  const formData = route?.params?.formData;
  const existingPromotionId = route?.params?.promotionId as number | undefined;
  const existingCardId = route?.params?.businessCardId as number | undefined;
  
  const [selectedPlan, setSelectedPlan] = useState<string | null>("scale");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [razorpayOptions, setRazorpayOptions] = useState<any>(null);
  const [pendingPromoId, setPendingPromoId] = useState<number | null>(existingPromotionId ?? null);

  const [createPromotion] = useCreatePromotionMutation();
  const [createPaymentIntent] = useCreatePromotionPaymentIntentMutation();
  const [verifyPayment] = useVerifyPromotionPaymentMutation();
  const { data: pricingPlans = [] } = useListPricingPlansQuery();

  // Map plan IDs to backend pricing plan IDs (matching PromotionPricingPlan.code)
  const planPriceMap: Record<string, { amount: number; label: string }> = {
    growth: { amount: 1500, label: "GROWTH" },
    boost: { amount: 2500, label: "BOOST" },
    scale: { amount: 4000, label: "SCALE" },
    dominate: { amount: 5000, label: "DOMINATE" },
  };

  const completeAfterPayment = async (
    promoId: number,
    paymentData: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
  ) => {
    console.log("[PremiumPlan] Verifying payment for promo:", promoId);
    const result = await verifyPayment({
      promoId,
      ...paymentData,
    }).unwrap();

    console.log("[PremiumPlan] Payment verified:", result.success, "promoId:", promoId, "result:", JSON.stringify({ tier: result.tier, roles: result.roles }));

    // Use fresh tokens returned by backend (they include the new business role)
    if (result.accessToken && result.refreshToken && result.roles && currentUser) {
      const updatedUser = { ...currentUser, roles: result.roles };
      dispatch(setCredentials({ user: updatedUser, accessToken: result.accessToken, refreshToken: result.refreshToken }));
      await SecureStore.setItemAsync('accessToken', result.accessToken);
      await SecureStore.setItemAsync('refreshToken', result.refreshToken);
      if (result.roles.includes('business')) {
        dispatch(setActiveRole('business'));
        await SecureStore.setItemAsync('activeRole', 'business');
      }
      console.log('[PremiumPlan] Tokens + roles updated after payment');
    }

    toast.success("Premium business listing activated!");
    navigation.navigate("MyCards");
  };

  const handleContinue = async () => {
    if (!selectedPlan) {
      toast.error("Please select a plan");
      return;
    }

    if (!user) {
      toast.error("Please sign in to continue");
      navigation.navigate("Auth");
      return;
    }

    // Must have either formData (new listing) or existingPromotionId (complete payment)
    if (!formData && !existingPromotionId) {
      toast.error("Form data missing");
      navigation.goBack();
      return;
    }

    try {
      setLoading(true);

      let promoId: number;

      if (existingPromotionId) {
        // Mode 2: Existing promotion — skip card/promotion creation, go straight to payment
        promoId = existingPromotionId;
        setPendingPromoId(promoId);
        console.log("[PremiumPlan] Using existing promotion:", promoId);
      } else {
        // Mode 1: New listing — create card + promotion
        console.log("[PremiumPlan] Creating business card...");
        const card = await createCard.mutateAsync(formData as any);
        const cardId = typeof card.id === 'string' ? parseInt(card.id, 10) : card.id;
        console.log("[PremiumPlan] Card created:", cardId);

        console.log("[PremiumPlan] Creating promotion...");
        const categoryArray = parseCategoryString(formData.category);
        const promoData = {
          business_name: formData.company_name || formData.full_name,
          owner_name: formData.full_name,
          description: formData.description,
          email: formData.email,
          phone: formData.phone,
          whatsapp: formData.whatsapp,
          website: formData.website,
          pincode: formData.pincode,
          city: formData.city || null,
          state: formData.state || null,
          business_card_id: cardId,
          category: categoryArray,
          listing_type: "premium",
          listing_intent: "premium",
          plan_type: "premium",
          status: "pending_payment",
        };

        const promo = await createPromotion(promoData).unwrap();
        promoId = promo.id;
        setPendingPromoId(promoId);
        console.log("[PremiumPlan] Promotion created:", promoId);
      }

      // Step 3: Create payment intent
      // Resolve the correct DB pricing plan from selected plan + billing period
      const planCode = `${selectedPlan}_${billingPeriod}`;
      const matchedPlan = pricingPlans.find((p: any) => p.code === planCode);
      if (!matchedPlan) {
        toast.error("Pricing plan not available. Please try again later.");
        return;
      }

      console.log("[PremiumPlan] Creating payment intent for plan:", planCode, "id:", matchedPlan.id);
      const paymentIntent = await createPaymentIntent({
        promoId,
        pricing_plan_id: matchedPlan.id,
      }).unwrap();

      console.log("[PremiumPlan] Payment intent received:", paymentIntent.order_id);

      const checkoutOptions = {
        key: paymentIntent.key,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        order_id: paymentIntent.order_id,
        name: "Instantly Cards",
        description: `${planPriceMap[selectedPlan]?.label || "Premium"} Plan`,
        prefill: {
          name: formData?.full_name || user.name || "",
          email: formData?.email || "",
          contact: formData?.phone || user.phone || "",
        },
        theme: { color: colors.primary },
      };

      // Step 4: Open Razorpay checkout
      if (isNativeRazorpayAvailable()) {
        try {
          console.log("[PremiumPlan] Opening native Razorpay...");
          const result = await openRazorpayCheckout(checkoutOptions);
          await completeAfterPayment(promoId, result);
        } catch (err: any) {
          if (err?.message?.includes("null") || err?.message?.includes("undefined")) {
            // Native bridge failed, fall back to WebView
            console.log("[PremiumPlan] Native bridge failed, using WebView...");
            setRazorpayOptions(checkoutOptions);
            setWebViewVisible(true);
          } else {
            throw err;
          }
        }
      } else {
        // Use WebView fallback
        console.log("[PremiumPlan] Using WebView checkout...");
        setRazorpayOptions(checkoutOptions);
        setWebViewVisible(true);
      }
    } catch (error: any) {
      console.error("[PremiumPlan] Error:", error);
      toast.error(error?.data?.error || error?.message || "Failed to process. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => {
    setWebViewVisible(false);
    try {
      setLoading(true);
      if (pendingPromoId) {
        await completeAfterPayment(pendingPromoId, data);
      }
    } catch (error: any) {
      console.error("[PremiumPlan] Verify error:", error);
      toast.error("Payment received but activation failed. Please contact support.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentCancel = () => {
    setWebViewVisible(false);
    toast.error("Payment cancelled");
  };

  const handlePaymentError = (error: string) => {
    setWebViewVisible(false);
    toast.error(error || "Payment failed");
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="border-b border-border bg-card px-4 py-4">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color={iconColor} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-lg font-bold text-foreground">Premium Plans</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {/* Billing Period Toggle */}
        <View className="flex-row justify-center px-4 pt-4">
          <View className="flex-row bg-muted rounded-xl overflow-hidden">
            <Pressable
              onPress={() => setBillingPeriod("monthly")}
              className={cn(
                "px-6 py-2 rounded-xl",
                billingPeriod === "monthly" ? "bg-primary" : ""
              )}
            >
              <Text className={cn("font-semibold text-sm", billingPeriod === "monthly" ? "text-primary-foreground" : "text-muted-foreground")}>Monthly</Text>
            </Pressable>
            <Pressable
              onPress={() => setBillingPeriod("yearly")}
              className={cn(
                "px-6 py-2 rounded-xl",
                billingPeriod === "yearly" ? "bg-primary" : ""
              )}
            >
              <Text className={cn("font-semibold text-sm", billingPeriod === "yearly" ? "text-primary-foreground" : "text-muted-foreground")}>Yearly</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20 }}
          nestedScrollEnabled
      >
        {premiumPlans.map((plan, index) => {
          const isSelected = selectedPlan === plan.id;
          
          return (
            <Pressable
              key={plan.id}
              onPress={() => setSelectedPlan(plan.id)}
              style={{
                width: 210,
                marginRight: index < premiumPlans.length - 1 ? 14 : 0,
                backgroundColor: isSelected ? plan.bgColor : "#ffffff",
                borderRadius: 20,
                padding: 18,
                borderWidth: isSelected ? 2.5 : 1,
                borderColor: isSelected ? plan.tagColor : "#e5e7eb",
                shadowColor: isSelected ? plan.tagColor : "#000",
                shadowOpacity: isSelected ? 0.15 : 0.06,
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 16,
                elevation: isSelected ? 6 : 2,
              }}
            >
              {/* Popular badge for Scale */}
              {plan.id === "scale" && (
                <View style={{ position: "absolute", top: -10, alignSelf: "center", left: 0, right: 0, alignItems: "center" }}>
                  <View style={{ backgroundColor: "#dc2626", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: "800", color: "#fff", letterSpacing: 1 }}>MOST POPULAR</Text>
                  </View>
                </View>
              )}

              {/* Plan Icon + Name */}
              <View style={{ alignItems: "center", marginBottom: 14, marginTop: plan.id === "scale" ? 4 : 0 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: plan.tagColor + "15", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                  <Crown size={20} color={plan.tagColor} strokeWidth={2.5} />
                </View>
                <Text style={{ textAlign: "center", fontWeight: "900", fontSize: 16, color: plan.accentColor, letterSpacing: 2.5 }}>
                  {plan.name}
                </Text>
              </View>

              {/* Pricing */}
              {/* Monthly Price - only shown when monthly selected */}
              {billingPeriod === "monthly" && (
                <View style={{ backgroundColor: plan.tagColor + "10", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: plan.tagColor + "25" }}>
                  <Text style={{ textAlign: "center", fontSize: 22, fontWeight: "800", color: "#111827" }}>{plan.monthlyPrice}</Text>
                  <Text style={{ textAlign: "center", fontSize: 12, color: "#6b7280", marginTop: 2, fontWeight: "500" }}>per month</Text>
                </View>
              )}

              {/* Yearly Price - only shown when yearly selected */}
              {billingPeriod === "yearly" && (
                <View style={{ backgroundColor: plan.tagColor + "10", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: plan.tagColor + "25" }}>
                  <Text style={{ textAlign: "center", fontSize: 22, fontWeight: "800", color: "#111827" }}>{plan.monthlyYearlyPrice}</Text>
                  <Text style={{ textAlign: "center", fontSize: 12, color: "#6b7280", fontWeight: "500" }}>per year</Text>
                  <View style={{ backgroundColor: "#dc2626", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "center", marginTop: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff" }}>{plan.yearlySavings}</Text>
                  </View>
                </View>
              )}

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: "#e5e7eb", marginVertical: 10 }} />

              {/* Features */}
              <View style={{ gap: 10 }}>
                {plan.features.map((feature, idx) => (
                  <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#dc262615", alignItems: "center", justifyContent: "center" }}>
                      <Check size={13} color="#dc2626" strokeWidth={3} />
                    </View>
                    <Text style={{ fontSize: 13, color: "#1f2937", flex: 1, fontWeight: "500" }} numberOfLines={1}>
                      {feature.name}
                    </Text>
                  </View>
                ))}
              </View>
            </Pressable>
          );
        })}
        </ScrollView>
      </ScrollView>

      {/* Footer - Continue Button */}
      <View style={{ borderTopWidth: 1, borderTopColor: "#e5e7eb", backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 14 }}>
        <Pressable
          onPress={handleContinue}
          disabled={!selectedPlan || loading}
          style={{
            width: "100%",
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: selectedPlan && !loading ? "#dc2626" : "#e5e7eb",
            shadowColor: "#dc2626",
            shadowOpacity: selectedPlan && !loading ? 0.3 : 0,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 12,
            elevation: selectedPlan && !loading ? 4 : 0,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: selectedPlan ? "#fff" : "#9ca3af",
                letterSpacing: 0.5,
              }}
            >
              Continue with {premiumPlans.find(p => p.id === selectedPlan)?.name || "Premium"}
            </Text>
          )}
        </Pressable>
      </View>

      {/* Razorpay WebView fallback */}
      {razorpayOptions && (
        <RazorpayWebView
          visible={webViewVisible}
          options={razorpayOptions}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
          onError={handlePaymentError}
        />
      )}
    </View>
  );
};

export default PremiumPlanSelection;
