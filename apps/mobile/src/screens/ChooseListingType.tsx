import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Rocket,
  Shield,
  Users,
} from "lucide-react-native";
import { cn } from "../lib/utils";
import { colors } from "../theme/colors";
import { useAuth } from "../hooks/useAuth";
import { toast } from "../lib/toast";
import { useIconColor } from "../theme/colors";

const listingPlans = [
  {
    id: "free",
    name: "Free Business Listing",
    subtitle: "Perfect for getting started",
    icon: Building2,
    recommended: false,
    features: [
      "Online business presence",
      "Trust building with customers",
      "Upload photos & details",
      "Organic discovery in listings",
    ],
    cta: "Continue with Free",
  },
  {
    id: "premium",
    name: "Premium Business Listing",
    subtitle: "Maximize your business growth",
    icon: Rocket,
    recommended: true,
    features: [
      "Higher ranking than competitors",
      "Increased customer visibility",
      "Direct customer leads (call / enquiry)",
      "Performance insights & analytics",
    ],
    cta: "Go Premium",
  },
];

const trustPoints = [
  {
    icon: Shield,
    title: "Secure & Trusted",
    desc: "Your business information is protected and verified",
  },
  {
    icon: Users,
    title: "Reach More Customers",
    desc: "Connect with thousands of potential customers actively searching",
  },
];

const ChooseListingType = () => {
  const iconColor = useIconColor();
  const navigation = useNavigation<any>();
  const [selected, setSelected] = useState<string | null>(null);
  const { user } = useAuth();

  const handleContinue = (planId: string) => {
    if (planId === "free") {
      // Show free plan confirmation screen
      navigation.navigate("FreePlanConfirmation");
      return;
    }

    // Check if user is authenticated before proceeding
    if (!user) {
      toast.info("Please sign in to create your business listing");
      // Navigate to Auth with redirect info
      navigation.navigate("Auth", { 
        redirect: "BusinessPromotionForm", 
        redirectParams: { plan: planId } 
      });
      return;
    }
    
    // User is authenticated, navigate to business promotion form
    navigation.navigate("BusinessPromotionForm", { plan: planId });
  };

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={iconColor} />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">Choose Listing Type</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} className="px-4 py-5 gap-4">
        {listingPlans.map((plan) => {
          const Icon = plan.icon;
          const isSelected = selected === plan.id;
          return (
            <Pressable
              key={plan.id}
              onPress={() => setSelected(plan.id)}
              className={cn(
                "relative w-full rounded-2xl border-2 p-5",
                isSelected
                  ? plan.id === "premium"
                    ? "border-primary bg-primary/5"
                    : "border-accent bg-accent/5"
                  : "border-border bg-card"
              )}
            >
              {plan.recommended && (
                <View className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1">
                  <Text className="text-[11px] font-bold text-primary-foreground">⭐ RECOMMENDED</Text>
                </View>
              )}
              <View className="flex-row items-start gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Icon size={26} color="#2563eb" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-foreground">{plan.name}</Text>
                  <Text className="text-sm text-muted-foreground">{plan.subtitle}</Text>
                </View>
                <View
                  className={cn(
                    "mt-1 h-5 w-5 rounded-full border-2",
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                  )}
                >
                  {isSelected && (
                    <View className="h-full w-full items-center justify-center">
                      <View className="h-2 w-2 rounded-full bg-primary-foreground" />
                    </View>
                  )}
                </View>
              </View>

              <View className="my-4 border-t border-border" />

              <View className="gap-3">
                {plan.features.map((f) => (
                  <View key={f} className="flex-row items-center gap-2.5">
                    <CheckCircle2
                      size={18}
                      color={plan.id === "premium" ? "#2563eb" : "#16a34a"}
                    />
                    <Text className="text-sm text-foreground">{f}</Text>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={() => {
                  setSelected(plan.id);
                  handleContinue(plan.id);
                }}
                className={cn(
                  "mt-5 w-full flex-row items-center justify-center gap-2 rounded-xl border-2 py-5",
                  plan.id === "premium" ? "border-primary" : "border-accent"
                )}
              >
                <Text
                  style={{
                    color: plan.id === "premium" ? colors.primary : colors.foreground,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  {plan.cta}
                </Text>
                <ArrowRight
                  size={16}
                  color={plan.id === "premium" ? colors.primary : colors.foreground}
                />
              </Pressable>
            </Pressable>
          );
        })}

        <View className="flex-row items-center gap-3 pt-6 pb-1">
          <View className="flex-1 h-px bg-border" />
          <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Boost with Ads
          </Text>
          <View className="flex-1 h-px bg-border" />
        </View>

        <View>
          <Text className="text-sm text-muted-foreground mb-3">Choose your ad format</Text>
          <View className="gap-3">
            {[
              { emoji: "🖼️", name: "Banner Ad", desc: "Display across Home, Events & Vouchers pages" },
              { emoji: "⭐", name: "Featured Listing", desc: "Appear at the top of category & search results" },
              { emoji: "💳", name: "Sponsored Card", desc: "Promoted business card in the directory" },
            ].map((ad) => (
              <Pressable
                key={ad.name}
                onPress={() => navigation.navigate("AdCreate")}
                className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-4"
              >
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-muted">
                  <Text className="text-2xl">{ad.emoji}</Text>
                </View>
                <View>
                  <Text className="text-sm font-bold text-foreground">{ad.name}</Text>
                  <Text className="text-xs text-muted-foreground">{ad.desc}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="gap-3 pt-2">
          {trustPoints.map((tp) => {
            const Icon = tp.icon;
            return (
              <View key={tp.title} className="flex-row items-start gap-3 rounded-xl border border-border bg-card p-4">
                <Icon size={28} color={tp.title.startsWith("Secure") ? "#10b981" : "#2563eb"} />
                <View>
                  <Text className="text-sm font-bold text-foreground">{tp.title}</Text>
                  <Text className="text-xs text-muted-foreground">{tp.desc}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {selected && (
        <View className="border-t border-border bg-card px-4 py-3">
          <Pressable
            className="w-full flex-row items-center justify-center gap-2 rounded-xl bg-primary py-6"
            onPress={() => handleContinue(selected)}
          >
            <Text style={{ color: colors.primaryForeground, fontSize: 16, fontWeight: "700" }}>
              Continue
            </Text>
            <ArrowRight size={16} color={colors.primaryForeground} />
          </Pressable>
        </View>
      )}
    </View>
  );
};

export default ChooseListingType;

