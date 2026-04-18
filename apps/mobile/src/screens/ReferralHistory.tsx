import { Text, View, Pressable, ScrollView, ActivityIndicator, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft, Users, User } from "lucide-react-native";
import { useGetReferralHistoryQuery } from "../store/api/referralApi";
import { useState } from "react";

const ReferralHistory = () => {
  const navigation = useNavigation<any>();
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useGetReferralHistoryQuery({ page, limit: 20 });

  const referrals = data?.referrals ?? [];
  const totalReferrals = data?.totalReferrals ?? 0;
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
        <Text className="text-lg font-bold text-gray-900">My Referrals</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} className="px-4 py-5">
        {/* Summary */}
        <View className="rounded-2xl bg-orange-50 p-5 items-center">
          <Users size={32} color="#ea580c" />
          <Text className="mt-2 text-3xl font-bold text-gray-900">{totalReferrals}</Text>
          <Text className="text-sm text-gray-500">Total People Referred</Text>
        </View>

        {/* List */}
        {isLoading ? (
          <ActivityIndicator className="mt-8" color="#ea580c" />
        ) : referrals.length === 0 ? (
          <View className="mt-8 items-center">
            <Text className="text-gray-400 text-sm">No referrals yet. Share your code to get started!</Text>
          </View>
        ) : (
          <View className="mt-4 gap-3">
            {referrals.map((r) => (
              <View key={r.id} className="flex-row items-center rounded-xl border border-gray-200 bg-white p-4 gap-3">
                {r.referredUser.profilePicture ? (
                  <Image
                    source={{ uri: r.referredUser.profilePicture }}
                    className="w-10 h-10 rounded-full bg-gray-200"
                  />
                ) : (
                  <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center">
                    <User size={18} color="#ea580c" />
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900">
                    {r.referredUser.name || "User"}
                  </Text>
                  <Text className="text-xs text-gray-400">{formatDate(r.createdAt)}</Text>
                </View>
                <View className="items-end">
                  <Text className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    r.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {r.status === "completed" ? "Completed" : "Pending"}
                  </Text>
                  {r.rewardGiven && (
                    <Text className="text-xs text-green-600 mt-1">+{r.creditsEarned} credits</Text>
                  )}
                </View>
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

export default ReferralHistory;
