import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowLeft,
  Award,
  Gift,
  ShoppingBag,
  Sparkles,
  TrendingUp,
} from "lucide-react-native";
import { Button } from "../components/ui/button";
import { useAuth } from "../hooks/useAuth";
import { useLoyaltyPoints, useRedeemPoints } from "../hooks/useLoyaltyPoints";
import { toast } from "../lib/toast";
import { cn } from "../lib/utils";

const pointsRewards = [
  { id: 1, name: "₹50 Off Voucher", points: 200, emoji: "🎫", desc: "Get ₹50 off any service" },
  { id: 2, name: "₹100 Off Voucher", points: 400, emoji: "🎟️", desc: "Get ₹100 off any service" },
  { id: 3, name: "Free Consultation", points: 500, emoji: "💼", desc: "Free 30-min consultation" },
  { id: 4, name: "Premium Badge (7 days)", points: 750, emoji: "👑", desc: "Premium profile badge" },
  { id: 5, name: "₹500 Off Voucher", points: 1000, emoji: "🏆", desc: "Get ₹500 off any service" },
];

const earningRules = [
  { action: "Book an appointment", points: 50, emoji: "📅" },
  { action: "Write a review", points: 25, emoji: "⭐" },
  { action: "Successful referral", points: 100, emoji: "🤝" },
];

const LoyaltyPoints = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { points, transactions, isLoading } = useLoyaltyPoints();
  const redeemMutation = useRedeemPoints();
  const [redeeming, setRedeeming] = useState<number | null>(null);

  const currentPoints = points?.points ?? 0;
  const lifetimePoints = points?.lifetime_points ?? 0;

  const handleRedeem = async (reward: typeof pointsRewards[0]) => {
    if (currentPoints < reward.points) {
      toast.error("Not enough points");
      return;
    }
    setRedeeming(reward.id);
    try {
      const success = await redeemMutation.mutateAsync({
        points: reward.points,
        description: reward.name,
      });
      if (success) {
        toast.success(`Redeemed ${reward.name}!`);
      } else {
        toast.error("Not enough points");
      }
    } catch {
      toast.error("Redemption failed");
    }
    setRedeeming(null);
  };

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-sm text-muted-foreground mb-4">
          Sign in to view your loyalty points
        </Text>
        <Button onPress={() => navigation.navigate("Auth")} className="rounded-xl">
          Sign In
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">Loyalty Points</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} className="px-4 py-4 gap-5">
        {/* Points card — solid background; absolute inset-0 collapses in RN without explicit height */}
        <View style={{ backgroundColor: '#d97706', borderRadius: 16, overflow: 'hidden' }}>
          <View className="p-6">
            <View className="absolute top-2 right-2 opacity-20">
              <Sparkles size={96} color="#ffffff" />
            </View>
            <Text className="text-sm font-medium text-white/80">Available Points</Text>
            <Text className="text-4xl font-black text-white mt-1">
              {currentPoints.toLocaleString("en-IN")}
            </Text>
            <View className="flex-row items-center gap-4 mt-4">
              <View>
                <Text className="text-[10px] text-white/70">Lifetime Earned</Text>
                <Text className="text-sm font-bold text-white">
                  {lifetimePoints.toLocaleString("en-IN")}
                </Text>
              </View>
              <View>
                <Text className="text-[10px] text-white/70">Tier</Text>
                <Text className="text-sm font-bold text-white">
                  {lifetimePoints >= 1000 ? "🏆 Gold" : lifetimePoints >= 500 ? "🥈 Silver" : "🥉 Bronze"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View>
          <View className="flex-row items-center gap-2 mb-3">
            <TrendingUp size={16} color="#2563eb" />
            <Text className="text-sm font-bold text-foreground">How to Earn Points</Text>
          </View>
          <View className="flex-row gap-2">
            {earningRules.map((rule) => (
              <View key={rule.action} className="flex-1 rounded-xl border border-border bg-card p-3 items-center">
                <Text className="text-2xl">{rule.emoji}</Text>
                <Text className="text-xs font-semibold text-foreground mt-1">+{rule.points}</Text>
                <Text className="text-[10px] text-muted-foreground mt-0.5 text-center">
                  {rule.action}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View>
          <View className="flex-row items-center gap-2 mb-3">
            <Gift size={16} color="#2563eb" />
            <Text className="text-sm font-bold text-foreground">Redeem Rewards</Text>
          </View>
          <View className="gap-2">
            {pointsRewards.map((reward) => (
              <View key={reward.id} className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3">
                <Text className="text-2xl">{reward.emoji}</Text>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-semibold text-foreground">{reward.name}</Text>
                  <Text className="text-[10px] text-muted-foreground">{reward.desc}</Text>
                </View>
                <Button
                  size="sm"
                  variant={currentPoints >= reward.points ? "default" : "outline"}
                  className="rounded-lg"
                  textClassName="text-xs"
                  disabled={currentPoints < reward.points || redeeming === reward.id}
                  onPress={() => handleRedeem(reward)}
                >
                  {reward.points} pts
                </Button>
              </View>
            ))}
          </View>
        </View>

        <View>
          <View className="flex-row items-center gap-2 mb-3">
            <Award size={16} color="#2563eb" />
            <Text className="text-sm font-bold text-foreground">Recent Activity</Text>
          </View>
          {isLoading ? (
            <View className="items-center py-6">
              <Text className="text-xs text-muted-foreground">Loading...</Text>
            </View>
          ) : transactions.length === 0 ? (
            <View className="rounded-xl border border-dashed border-border p-8 items-center">
              <ShoppingBag size={32} color="#9aa2b1" />
              <Text className="text-sm text-muted-foreground mt-2">No points activity yet</Text>
              <Text className="text-xs text-muted-foreground mt-1 text-center">
                Book services, leave reviews, or refer friends to earn!
              </Text>
            </View>
          ) : (
            <View className="gap-1.5">
              {transactions.map((tx) => (
                <View key={tx.id} className="flex-row items-center gap-3 rounded-xl bg-muted/30 px-3 py-2.5">
                  <View
                    className={cn(
                      "h-8 w-8 items-center justify-center rounded-full",
                      tx.type === "earn" ? "bg-green-100" : "bg-orange-100"
                    )}
                  >
                    <Text
                      className={cn(
                        "text-xs font-bold",
                        tx.type === "earn" ? "text-green-700" : "text-orange-700"
                      )}
                    >
                      {tx.type === "earn" ? "+" : "-"}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-xs font-semibold text-foreground" numberOfLines={1}>
                      {tx.description || tx.source}
                    </Text>
                    <Text className="text-[10px] text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <Text
                    className={cn(
                      "text-sm font-bold",
                      tx.type === "earn" ? "text-green-600" : "text-orange-600"
                    )}
                  >
                    {tx.type === "earn" ? "+" : ""}
                    {tx.points}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default LoyaltyPoints;

