import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft, Check, X } from "lucide-react-native";
import { Button } from "../components/ui/button";
import { useAuth } from "../hooks/useAuth";
import { useSubscription } from "../hooks/useSubscription";
import { toast } from "../lib/toast";
import { cn } from "../lib/utils";
import { useIconColor } from "../theme/colors";

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "forever",
    icon: "📋",
    highlight: false,
    features: ["Basic listing", "Up to 3 services", "Contact info display", "Standard search ranking"],
    missing: ["Analytics dashboard", "AI insights", "Featured position", "Ad campaigns", "Priority support"],
  },
  {
    id: "basic",
    name: "Basic",
    price: 499,
    period: "/month",
    icon: "⭐",
    highlight: false,
    features: ["Enhanced listing", "Up to 10 services", "Contact + chat", "Better ranking", "Basic analytics"],
    missing: ["AI insights", "Featured position", "Ad campaigns", "Priority support"],
  },
  {
    id: "premium",
    name: "Premium",
    price: 1999,
    period: "/month",
    icon: "👑",
    highlight: true,
    features: ["Premium listing", "Unlimited services", "Full analytics", "AI lead insights", "Featured position", "3 ad campaigns/month"],
    missing: ["Dedicated manager", "Custom branding"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 4999,
    period: "/month",
    icon: "🏆",
    highlight: false,
    features: ["Top-tier listing", "Unlimited everything", "Advanced AI analytics", "Unlimited ad campaigns", "Dedicated account manager", "Custom branding", "API access", "Priority support 24/7"],
    missing: [],
  },
];

const Subscription = () => {
  const iconColor = useIconColor();
  const navigation = useNavigation<any>();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const { user } = useAuth();
  const { currentPlan, subscribe } = useSubscription();

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      toast.error("Please sign in first");
      navigation.navigate("Auth");
      return;
    }
    if (planId === currentPlan) return;
    try {
      await subscribe.mutateAsync({ plan: planId, billing_cycle: billing });
      const planName = plans.find((p) => p.id === planId)?.name ?? "Plan";
      toast.success(`${planName} plan activated! 🎉`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to subscribe");
    }
  };

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={iconColor} />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">Subscription Plans</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} className="px-4 py-4 gap-5">
        <View className="flex-row items-center justify-center">
          <View className="flex-row rounded-xl bg-muted p-1">
            {(["monthly", "annual"] as const).map((b) => (
              <Pressable key={b} onPress={() => setBilling(b)}>
                <View
                  className={cn(
                    "rounded-lg px-4 py-2",
                    billing === b ? "bg-primary shadow-sm" : "bg-transparent"
                  )}
                >
                  <Text
                    className={cn(
                      "text-xs font-semibold",
                      billing === b ? "text-primary-foreground" : "text-muted-foreground"
                    )}
                  >
                    {b === "monthly" ? "Monthly" : "Annual (Save 20%)"}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="gap-4">
          {plans.map((plan) => {
            const price =
              billing === "annual" && plan.price > 0 ? Math.round(plan.price * 0.8) : plan.price;
            const isCurrent = currentPlan === plan.id;
            return (
              <View
                key={plan.id}
                className={cn(
                  "rounded-2xl border p-4 relative overflow-hidden",
                  plan.highlight ? "border-primary bg-primary/5" : "border-border bg-card",
                  isCurrent && "border-2 border-primary"
                )}
              >
                {plan.highlight && (
                  <View className="absolute top-0 right-0 rounded-bl-xl bg-primary px-3 py-1">
                    <Text className="text-[10px] font-bold text-primary-foreground">POPULAR</Text>
                  </View>
                )}

                <View className="flex-row items-center gap-3 mb-3">
                  <Text className="text-2xl">{plan.icon}</Text>
                  <View>
                    <Text className="text-base font-bold text-foreground">{plan.name}</Text>
                    <View className="flex-row items-baseline gap-1">
                      <Text className="text-xl font-bold text-foreground">
                        {price === 0 ? "Free" : `₹${price.toLocaleString("en-IN")}`}
                      </Text>
                      {price > 0 && (
                        <Text className="text-xs text-muted-foreground">{plan.period}</Text>
                      )}
                    </View>
                  </View>
                </View>

                <View className="gap-1.5 mb-4">
                  {plan.features.map((f) => (
                    <View key={f} className="flex-row items-center gap-2">
                      <Check size={14} color="#16a34a" />
                      <Text className="text-xs text-foreground">{f}</Text>
                    </View>
                  ))}
                  {plan.missing.map((f) => (
                    <View key={f} className="flex-row items-center gap-2">
                      <X size={14} color="#c0c4cc" />
                      <Text className="text-xs text-muted-foreground">{f}</Text>
                    </View>
                  ))}
                </View>

                <Button
                  className={cn(
                    "w-full rounded-xl",
                    plan.highlight && !isCurrent ? "" : "bg-muted"
                  )}
                  textClassName={cn(
                    plan.highlight && !isCurrent ? "text-primary-foreground" : "text-foreground"
                  )}
                  variant={plan.highlight && !isCurrent ? "default" : "secondary"}
                  onPress={() => handleSubscribe(plan.id)}
                  disabled={isCurrent || subscribe.isPending}
                >
                  {isCurrent
                    ? "Current Plan ✓"
                    : subscribe.isPending
                    ? "Processing..."
                    : `Choose ${plan.name}`}
                </Button>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

export default Subscription;

