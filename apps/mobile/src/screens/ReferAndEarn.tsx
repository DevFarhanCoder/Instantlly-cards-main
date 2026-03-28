import { Share, Text, View, Pressable, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowLeft,
  Copy,
  Crown,
  Gift,
  Share2,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { useAuth } from "../hooks/useAuth";
import { useReferrals } from "../hooks/useReferrals";
import { useUserRole } from "../hooks/useUserRole";
import { useSubscription } from "../hooks/useSubscription";
import { toast } from "../lib/toast";

type Reward = {
  emoji: string;
  title: string;
  desc: string;
  target: number;
  highlight?: boolean;
};

const customerRewards: Reward[] = [
  { emoji: "🎁", title: "Refer a Friend", desc: "Get ₹50 credit when your friend signs up", target: 1 },
  { emoji: "⭐", title: "5 Referrals", desc: "Unlock Premium badge for 1 month", target: 5 },
  { emoji: "🎟️", title: "10 Referrals", desc: "Get ₹500 voucher for any service", target: 10 },
  { emoji: "🏆", title: "25 Referrals", desc: "Lifetime VIP status + exclusive deals", target: 25 },
];

const businessRewards: Reward[] = [
  { emoji: "🎁", title: "Refer 1 Business", desc: "Get ₹100 ad credit for your next campaign", target: 1 },
  { emoji: "🚀", title: "Refer 3 Businesses", desc: "Featured listing for 7 days", target: 3 },
  {
    emoji: "🎟️",
    title: "Refer 5 Businesses",
    desc: "Free Premium plan upgrade for 30 days!",
    target: 5,
    highlight: true,
  },
  { emoji: "🏆", title: "Refer 10 Businesses", desc: "Enterprise plan for 30 days + priority support", target: 10 },
];

const ReferAndEarn = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { referralCount, completedCount, totalEarnings } = useReferrals();
  const { isBusiness } = useUserRole();
  const { currentPlan } = useSubscription();

  const referralCode = user?.id ? `REF${String(user.id).slice(0, 6).toUpperCase()}` : "REF000000";
  const rewards = isBusiness ? businessRewards : customerRewards;
  const nextMilestone = rewards.find((r) => completedCount < r.target);
  const progressToNext = nextMilestone
    ? Math.min((completedCount / nextMilestone.target) * 100, 100)
    : 100;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(referralCode);
    toast.success("Referral code copied!");
  };

  const handleShare = async () => {
    const shareText = isBusiness
      ? `Join me on Instantly! Use my referral code ${referralCode} to list your business and get ₹100 ad credit!`
      : `Use my referral code ${referralCode} to get ₹50 off your first booking!`;
    try {
      await Share.share({
        title: "Join me on Instantly!",
        message: `${shareText}\nhttps://instantlly.lovable.app/auth?ref=${referralCode}`,
      });
    } catch {
      await Clipboard.setStringAsync(`https://instantlly.lovable.app/auth?ref=${referralCode}`);
      toast.success("Link copied to clipboard!");
    }
  };

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">Refer & Earn</Text>
        {isBusiness && (
          <View className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5">
            <Text className="text-[10px] font-semibold text-primary">Business</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 260 }} className="px-4 py-5">
        <View className="rounded-2xl bg-primary/10 p-5 items-center">
          <Text className="text-5xl">{isBusiness ? "🚀" : "🎉"}</Text>
          <Text className="mt-2 text-xl font-bold text-foreground">
            {isBusiness ? "Refer Businesses, Get Upgraded" : "Invite Friends, Earn Rewards"}
          </Text>
          <Text className="mt-1 text-sm text-muted-foreground text-center">
            {isBusiness
              ? "Refer 5 businesses and get a free Premium plan upgrade!"
              : "Share your code and earn ₹50 for every friend who joins"}
          </Text>
        </View>

        {isBusiness && completedCount < 5 && (
          <View className="mt-4 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Crown size={20} color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-foreground">
                  Unlock Premium Free{" "}
                  <Sparkles size={12} color="#f59e0b" />
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {5 - completedCount} more referral{5 - completedCount !== 1 ? "s" : ""} to go!
                </Text>
              </View>
              <Text className="text-2xl font-bold text-primary">{completedCount}/5</Text>
            </View>
            <Progress value={(completedCount / 5) * 100} className="mt-3 h-2.5" />
          </View>
        )}

        {isBusiness && completedCount >= 5 && currentPlan === "premium" && (
          <View className="mt-4 rounded-2xl border border-success/30 bg-success/5 p-4 items-center">
            <Text className="text-3xl">🎟️</Text>
            <Text className="text-sm font-bold text-foreground mt-1">Premium Plan Active!</Text>
            <Text className="text-xs text-muted-foreground text-center mt-1">
              You earned this by referring 5 businesses. Keep referring for more rewards!
            </Text>
          </View>
        )}

        <View className="mt-4 flex-row gap-3">
          {[
            { icon: Users, label: "Referrals", value: referralCount },
            { icon: Gift, label: "Earned", value: `₹${totalEarnings}` },
            { icon: Trophy, label: "Completed", value: completedCount },
          ].map((s, i) => (
            <View key={s.label} className="flex-1 rounded-xl border border-border bg-card p-3 items-center">
              <s.icon size={20} color="#2563eb" />
              <Text className="mt-1 text-lg font-bold text-foreground">{s.value}</Text>
              <Text className="text-[10px] text-muted-foreground">{s.label}</Text>
            </View>
          ))}
        </View>

        <View className="mt-4 rounded-2xl border border-border bg-card p-4">
          <Text className="text-xs font-medium text-muted-foreground mb-2">Your Referral Code</Text>
          <View className="flex-row items-center gap-2">
            <View className="flex-1 rounded-xl bg-muted px-4 py-3 items-center">
              <Text className="text-lg font-bold text-foreground">{referralCode}</Text>
            </View>
            <Button size="icon" variant="outline" onPress={handleCopy} className="rounded-xl">
              <Copy size={16} color="#111827" />
            </Button>
          </View>
          <Button className="mt-3 w-full rounded-xl" onPress={handleShare}>
            <Share2 size={16} color="#ffffff" />
            {isBusiness ? "Share with Business Owners" : "Share with Friends"}
          </Button>
        </View>

        {nextMilestone && (
          <View className="mt-4 rounded-xl border border-border bg-card p-3">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-semibold text-foreground">
                Next: {nextMilestone.title}
              </Text>
              <Text className="text-[10px] text-muted-foreground">
                {completedCount}/{nextMilestone.target}
              </Text>
            </View>
            <Progress value={progressToNext} className="h-1.5" />
          </View>
        )}

        <View className="mt-4">
          <Text className="text-sm font-semibold text-foreground mb-3">
            Reward Milestones
          </Text>
          <View className="space-y-3">
            {rewards.map((r) => {
              const achieved = completedCount >= r.target;
              const isHighlight = "highlight" in r && r.highlight;
              return (
                <View
                  key={r.title}
                  className={`flex-row items-center gap-3 rounded-xl border p-3 ${
                    achieved
                      ? "border-success/30 bg-success/5"
                      : isHighlight
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-card"
                  }`}
                >
                  <Text className="text-2xl">{r.emoji}</Text>
                  <View className="flex-1">
                    <Text className={`text-sm font-semibold ${isHighlight && !achieved ? "text-primary" : "text-foreground"}`}>
                      {r.title}
                      {isHighlight && !achieved && (
                        <Text className="ml-1.5 text-[9px] font-bold text-primary"> FREE UPGRADE</Text>
                      )}
                    </Text>
                    <Text className="text-xs text-muted-foreground">{r.desc}</Text>
                  </View>
                  {achieved ? (
                    <Text className="text-xs font-bold text-success">✓ Done</Text>
                  ) : (
                    <Text className="text-xs text-muted-foreground">{r.target} refs</Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default ReferAndEarn;

