import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft, Check } from "lucide-react-native";
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

const premiumPlans = [
  {
    id: "growth",
    name: "GROWTH",
    monthlyPrice: "₹1,500",
    yearlyPrice: "₹18,000",
    monthlyYearlyPrice: "₹15,000",
    yearlySavings: "Save ₹3,000/Year",
    bgColor: "#D4A574",
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
    bgColor: "#C17B5A",
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
    bgColor: "#6B9BD1",
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
    bgColor: "#B89BC9",
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
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { createCard } = useBusinessCards();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  
  // Get the form data passed from BusinessPromotionForm
  const formData = route?.params?.formData;
  
  const [selectedPlan, setSelectedPlan] = useState<string | null>("scale");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [razorpayOptions, setRazorpayOptions] = useState<any>(null);
  const [pendingPromoId, setPendingPromoId] = useState<number | null>(null);

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

    console.log("[PremiumPlan] Payment verified:", result.success);

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

    if (!formData) {
      toast.error("Form data missing");
      navigation.goBack();
      return;
    }

    try {
      setLoading(true);

      // Step 1: Create the business card
      console.log("[PremiumPlan] Creating business card...");
      const card = await createCard.mutateAsync(formData as any);
      const cardId = typeof card.id === 'string' ? parseInt(card.id, 10) : card.id;
      console.log("[PremiumPlan] Card created:", cardId);

      // Step 2: Create a promotion linked to the card
      console.log("[PremiumPlan] Creating promotion...");
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
        listing_type: "premium",
        listing_intent: "premium",
        plan_type: "premium",
        status: "pending_payment",
      };

      const promo = await createPromotion(promoData).unwrap();
      const promoId = promo.id;
      setPendingPromoId(promoId);
      console.log("[PremiumPlan] Promotion created:", promoId);

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
          name: formData.full_name || user.name || "",
          email: formData.email || "",
          contact: formData.phone || "",
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
            <ArrowLeft size={20} color="#111827" />
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
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 20 }}
          nestedScrollEnabled
      >
        {premiumPlans.map((plan, index) => {
          const isSelected = selectedPlan === plan.id;
          
          return (
            <Pressable
              key={plan.id}
              onPress={() => setSelectedPlan(plan.id)}
              style={{
                width: 200,
                marginRight: index < premiumPlans.length - 1 ? 12 : 0,
                backgroundColor: plan.bgColor,
                borderRadius: 16,
                padding: 16,
                borderWidth: isSelected ? 3 : 0,
                borderColor: isSelected ? "#000" : "transparent",
              }}
            >
              {/* Plan Name */}
              <Text className="text-center text-white font-bold text-base mb-3" style={{ textShadowColor: "rgba(0,0,0,0.3)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
                {plan.name}
              </Text>

              {/* Pricing */}
              {/* Monthly Price */}
              <View className={cn("rounded-lg p-3 mb-2", billingPeriod === "monthly" ? "bg-white" : "bg-white/60")}>
                <Text className="text-center text-lg font-bold text-gray-800">{plan.monthlyPrice}/Mo</Text>
                <Text className="text-center text-xl font-bold text-gray-800">{plan.yearlyPrice}/Yr</Text>
                <Text className="text-center text-xs text-gray-600 mt-1">Monthly Plan</Text>
              </View>

              {/* Yearly Price */}
              <View className={cn("rounded-lg p-3 mb-2", billingPeriod === "yearly" ? "bg-white" : "bg-white/60")}>
                <Text className="text-center text-xl font-bold text-gray-800">{plan.monthlyYearlyPrice}/Yr</Text>
                <Text className="text-center text-xs text-gray-600">Yearly Plan</Text>
                <Text className="text-center text-xs font-bold text-green-600 mt-1">{plan.yearlySavings}</Text>
              </View>

              {/* Features */}
              <View className="gap-2 mt-2">
                {plan.features.map((feature, idx) => (
                  <View key={idx} className="flex-row items-center gap-2">
                    <Check size={16} color="#22c55e" strokeWidth={3} />
                    <Text className="text-xs text-white flex-1" numberOfLines={1}>
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
      <View className="border-t border-border bg-card px-4 py-3">
        <Pressable
          onPress={handleContinue}
          disabled={!selectedPlan || loading}
          className={cn(
            "w-full rounded-xl py-4 items-center justify-center",
            selectedPlan && !loading ? "bg-primary" : "bg-muted"
          )}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text
              className={cn(
                "text-base font-bold",
                selectedPlan ? "text-primary-foreground" : "text-muted-foreground"
              )}
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
