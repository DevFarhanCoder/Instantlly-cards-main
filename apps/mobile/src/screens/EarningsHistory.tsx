import { Text, View, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft, Gift, TrendingUp } from "lucide-react-native";
import { useGetEarningsHistoryQuery } from "../store/api/referralApi";
import { useState } from "react";

const EarningsHistory = () => {
  const navigation = useNavigation<any>();
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useGetEarningsHistoryQuery({ page, limit: 20 });

  const earnings = data?.earnings ?? [];
  const totalEarnings = data?.totalEarnings ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <View className="flex-1 bg-white">
      <View className="border-b border-gray-200 bg-white px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900">Referral Earnings</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} className="px-4 py-5">
        {/* Summary */}
        <View className="rounded-2xl bg-orange-50 p-5 items-center">
          <Gift size={32} color="#ea580c" />
          <Text className="mt-2 text-3xl font-bold text-gray-900">{totalEarnings}</Text>
          <Text className="text-sm text-gray-500">Total Credits Earned from Referrals</Text>
        </View>

        {/* List */}
        {isLoading ? (
          <ActivityIndicator className="mt-8" color="#ea580c" />
        ) : earnings.length === 0 ? (
          <View className="mt-8 items-center">
            <Text className="text-gray-400 text-sm">No referral earnings yet. Refer friends to start earning!</Text>
          </View>
        ) : (
          <View className="mt-4 gap-3">
            {earnings.map((e) => (
              <View key={e.id} className="flex-row items-center rounded-xl border border-gray-200 bg-white p-4 gap-3">
                <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center">
                  <TrendingUp size={18} color="#16a34a" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900">Referral Bonus</Text>
                  <Text className="text-xs text-gray-400">{formatDate(e.createdAt)}</Text>
                  {e.description && (
                    <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>{e.description}</Text>
                  )}
                </View>
                <Text className="text-sm font-bold text-green-600">+{e.amount}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <View className="mt-4 flex-row justify-center items-center gap-4">
            <Pressable
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`px-4 py-2 rounded-lg ${page === 1 ? "bg-gray-100" : "bg-orange-500"}`}
            >
              <Text className={page === 1 ? "text-gray-400" : "text-white"}>Previous</Text>
            </Pressable>
            <Text className="text-sm text-gray-500">
              {page} / {totalPages}
            </Text>
            <Pressable
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={`px-4 py-2 rounded-lg ${page === totalPages ? "bg-gray-100" : "bg-orange-500"}`}
            >
              <Text className={page === totalPages ? "text-gray-400" : "text-white"}>Next</Text>
            </Pressable>
          </View>
        )}

        {isFetching && !isLoading && (
          <ActivityIndicator className="mt-2" color="#ea580c" />
        )}
      </ScrollView>
    </View>
  );
};

export default EarningsHistory;
