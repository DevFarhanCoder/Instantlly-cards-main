import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft, Check } from "lucide-react-native";
import { cn } from "../lib/utils";
import { colors } from "../theme/colors";
import { useAuth } from "../hooks/useAuth";
import { useBusinessCards } from "../hooks/useBusinessCards";
import { toast } from "../lib/toast";

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
  
  // Get the form data passed from BusinessPromotionForm
  const formData = route?.params?.formData;
  
  const [selectedPlan, setSelectedPlan] = useState<string | null>("scale");

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

    try {
      // Here you would typically:
      // 1. Process payment
      // 2. Create the business card with premium status
      // 3. Navigate to success screen or MyCards
      
      // For now, create the card with the form data
      if (formData) {
        await createCard.mutateAsync(formData as any);
        toast.success("Premium business listing created successfully!");
        navigation.navigate("MyCards");
      } else {
        toast.error("Form data missing");
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error creating premium listing:", error);
      toast.error("Failed to create listing. Please try again.");
    }
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
              <View className="bg-white/90 rounded-lg p-3 mb-2">
                <Text className="text-center text-lg font-bold text-gray-800">{plan.monthlyPrice}/Mo</Text>
                <Text className="text-center text-xl font-bold text-gray-800">{plan.yearlyPrice}/Yr</Text>
                <Text className="text-center text-xs text-gray-600 mt-1">Monthly Plan</Text>
              </View>

              {/* Yearly Price */}
              <View className="bg-white/90 rounded-lg p-3 mb-2">
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
          disabled={!selectedPlan}
          className={cn(
            "w-full rounded-xl py-4 items-center justify-center",
            selectedPlan ? "bg-primary" : "bg-muted"
          )}
        >
          <Text
            className={cn(
              "text-base font-bold",
              selectedPlan ? "text-primary-foreground" : "text-muted-foreground"
            )}
          >
            Continue with {premiumPlans.find(p => p.id === selectedPlan)?.name || "Premium"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default PremiumPlanSelection;
