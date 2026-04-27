import { useEffect } from "react";
import { Text, View, Pressable, ScrollView } from "react-native";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { ArrowLeft, Trophy, Gift, Users } from "lucide-react-native";
import { useGetCreditConfigQuery } from "../store/api/referralApi";
import { useIconColor } from "../theme/colors";

const PerReferralInfo = () => {
  const iconColor = useIconColor();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { data: config, refetch: refetchConfig } = useGetCreditConfigQuery();
  const rewardPerReferral = config?.referral_reward ?? 300;

  useEffect(() => {
    if (isFocused) refetchConfig();
  }, [isFocused]);

  return (
    <View className="flex-1 bg-white">
      <View className="border-b border-gray-200 bg-white px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={iconColor} />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900">Rewards Per Referral</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} className="px-4 py-5">
        {/* Hero */}
        <View className="rounded-2xl bg-orange-50 p-5 items-center">
          <Trophy size={32} color="#ea580c" />
          <Text className="mt-2 text-3xl font-bold text-gray-900">{rewardPerReferral}</Text>
          <Text className="text-sm text-gray-500">Credits per successful referral</Text>
        </View>

        {/* Breakdown */}
        <View className="mt-6 gap-4">
          <Text className="text-base font-bold text-gray-900">Reward Breakdown</Text>

          <View className="rounded-xl border border-gray-200 bg-white p-4 flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center">
              <Gift size={18} color="#ea580c" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-900">You Get</Text>
              <Text className="text-xs text-gray-500">When your friend signs up using your code</Text>
            </View>
            <Text className="text-lg font-bold text-orange-600">{rewardPerReferral}</Text>
          </View>

          <View className="rounded-xl border border-gray-200 bg-white p-4 flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center">
              <Users size={18} color="#16a34a" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-900">Your Friend Gets</Text>
              <Text className="text-xs text-gray-500">Bonus credits when they sign up with your code</Text>
            </View>
            <Text className="text-lg font-bold text-green-600">{rewardPerReferral}</Text>
          </View>
        </View>

        {/* How it works */}
        <View className="mt-6 gap-3">
          <Text className="text-base font-bold text-gray-900">How It Works</Text>

          {[
            { step: "1", text: "Share your referral link with friends" },
            { step: "2", text: "Your friend downloads the app and signs up" },
            { step: "3", text: `You both receive ${rewardPerReferral} credits instantly` },
            { step: "4", text: "No limit — refer as many friends as you want!" },
          ].map((item) => (
            <View key={item.step} className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-full bg-orange-500 items-center justify-center">
                <Text className="text-white font-bold text-sm">{item.step}</Text>
              </View>
              <Text className="flex-1 text-sm text-gray-700">{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Note */}
        <View className="mt-6 rounded-xl bg-gray-50 p-4">
          <Text className="text-xs text-gray-500 text-center">
            Rewards are credited instantly once your friend completes their signup.
            Credits can be used for ads, promotions, and other services on Instantlly.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default PerReferralInfo;
