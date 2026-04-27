import { Share, Text, View, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { useEffect } from "react";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/routes";
import {
  ArrowLeft,
  Copy,
  Gift,
  Share2,
  Trophy,
  Users,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useGetReferralStatsQuery, useGetCreditConfigQuery } from "../store/api/referralApi";
import { useAuth } from "../hooks/useAuth";
import { toast } from "../lib/toast";
import { useIconColor } from "../theme/colors";

/** Generate a stable 6-char code from a user id (fallback when backend hasn't assigned one yet) */
function fallbackCode(userId: number | string | undefined): string {
  if (!userId) return '------';
  const base = String(userId);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    const seed = (parseInt(base, 10) * (i + 7) + i * 13) % chars.length;
    code += chars[Math.abs(seed)];
  }
  return code;
}

const ReferAndEarn = () => {
  const iconColor = useIconColor();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetReferralStatsQuery();
  const { data: config, refetch: refetchConfig } = useGetCreditConfigQuery();

  // Refetch from server every time screen is focused so admin changes reflect immediately
  useEffect(() => {
    if (isFocused) {
      refetchStats();
      refetchConfig();
    }
  }, [isFocused]);

  // Use backend code if available, otherwise generate a deterministic fallback
  const referralCode = stats?.referralCode || fallbackCode(user?.id);
  const totalReferrals = stats?.totalReferrals ?? 0;
  const totalCreditsEarned = stats?.totalCreditsEarned ?? 0;
  const rewardPerReferral = config?.referral_reward ?? 300;

  const handleCopy = async () => {
    if (referralCode === '------') {
      toast.error("Please log in to get your referral code.");
      return;
    }
    await Clipboard.setStringAsync(referralCode);
    toast.success("Referral code copied!");
  };

  const handleShare = async () => {
    if (referralCode === '------') {
      toast.error("Please log in to get your referral code.");
      return;
    }
    const playStoreUrl = `https://play.google.com/store/apps/details?id=com.instantllycards.www.twa&referrer=utm_source%3Dreferral%26utm_campaign%3D${referralCode}`;
    const shareText = `Earn ₹1200 to ₹6000+ per day Without Investment\n▪️ Save Rs 10000 Printing Cost Use this Free App & Save per year visiting Card Printing Cost\n▪️ *I Got ₹300 Credit* On Self Download\n▪️ *Referral Bonus ₹300* On your Download you will get ₹300 Bonus\n\n📲 *Download from Play Store:*\n${playStoreUrl}`;
    try {
      await Share.share({
        title: "Join me on Instantlly!",
        message: shareText,
      });
    } catch {
      await Clipboard.setStringAsync(referralCode);
      toast.success("Referral code copied to clipboard!");
    }
  };

  return (
    <View className="flex-1 bg-white">
      <View className="border-b border-gray-200 bg-white px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={iconColor} />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900">Refer & Earn</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} className="px-4 py-5">
        {/* Hero */}
        <View className="rounded-2xl bg-orange-50 p-5 items-center">
          <Text className="text-5xl">🎉</Text>
          <Text className="mt-2 text-xl font-bold text-gray-900">
            Invite Friends, Earn Credits
          </Text>
          <Text className="mt-1 text-sm text-gray-500 text-center">
            Share your code — you both get {rewardPerReferral} credits when a friend joins!
          </Text>
        </View>

        {/* Stats */}
        {statsLoading ? (
          <ActivityIndicator className="mt-6" color="#ea580c" />
        ) : (
          <View className="mt-4 flex-row gap-3">
            {[
              { icon: Users, label: "Referrals", value: totalReferrals, screen: "ReferralHistory" as const },
              { icon: Gift, label: "Earned", value: `${totalCreditsEarned}`, screen: "EarningsHistory" as const },
              { icon: Trophy, label: "Per Referral", value: `${rewardPerReferral}`, screen: "PerReferralInfo" as const },
            ].map((s) => (
              <Pressable
                key={s.label}
                onPress={() => navigation.navigate(s.screen)}
                className="flex-1 rounded-xl border border-gray-200 bg-white p-3 items-center"
              >
                <s.icon size={20} color="#ea580c" />
                <Text className="mt-1 text-lg font-bold text-gray-900">{s.value}</Text>
                <Text className="text-[10px] text-gray-500">{s.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Share Button */}
        <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
          <Pressable
            onPress={handleShare}
            className="w-full rounded-xl bg-orange-500 flex-row items-center justify-center py-3 gap-2"
          >
            <Share2 size={16} color="#ffffff" />
            <Text className="text-white font-semibold text-sm">Share with Friends</Text>
          </Pressable>
        </View>

        {/* How it works */}
        <View className="mt-6">
          <Text className="text-sm font-semibold text-gray-900 mb-3">How It Works</Text>
          <View className="gap-3">
            {[
              { step: "1", title: "Share your code", desc: "Send your referral link to friends via WhatsApp, SMS, etc." },
              { step: "2", title: "Friend downloads & signs up", desc: "They install from Play Store and create an account" },
              { step: "3", title: "You both earn credits", desc: `Both of you get ${rewardPerReferral} credits as a bonus!` },
            ].map((item) => (
              <View key={item.step} className="flex-row items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
                <View className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center">
                  <Text className="text-orange-600 font-bold text-sm">{item.step}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900">{item.title}</Text>
                  <Text className="text-xs text-gray-500">{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default ReferAndEarn;

