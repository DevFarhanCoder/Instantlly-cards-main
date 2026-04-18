import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/routes';
import { useGetReferralStatsQuery } from '../store/api/referralApi';
import { Gift } from 'lucide-react-native';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ReferralBanner() {
  const navigation = useNavigation<Nav>();
  const { data: stats } = useGetReferralStatsQuery();

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('ReferAndEarn')}
      className="mx-4 my-2 rounded-xl bg-orange-50 border border-orange-200 p-4 flex-row items-center"
      activeOpacity={0.7}
    >
      <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center mr-3">
        <Gift size={20} color="#ea580c" />
      </View>
      <View className="flex-1">
        <Text className="text-orange-800 font-bold text-sm">
          Refer & Earn Credits
        </Text>
        <Text className="text-orange-600 text-xs mt-0.5">
          {stats?.totalReferrals
            ? `${stats.totalReferrals} friend${stats.totalReferrals > 1 ? 's' : ''} joined · ${stats.totalCreditsEarned} credits earned`
            : 'Share your code and earn credits when friends join'}
        </Text>
      </View>
      <Text className="text-orange-500 text-lg">›</Text>
    </TouchableOpacity>
  );
}
