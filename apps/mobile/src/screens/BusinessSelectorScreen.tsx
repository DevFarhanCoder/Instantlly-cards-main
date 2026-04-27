import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft, Search, RefreshCw } from "lucide-react-native";
import { usePromotionContext } from "../contexts/PromotionContext";
import { effectiveTier, getTierColor, getTierLabel, type Tier } from "../utils/tierFeatures";
import { useIconColor } from "../theme/colors";

const statusLabel: Record<string, string> = {
  active: "Active",
  pending_payment: "Pending",
  expired: "Expired",
  draft: "Draft",
};

const statusClassName: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  pending_payment: "bg-amber-100 text-amber-700",
  expired: "bg-red-100 text-red-700",
  draft: "bg-muted text-muted-foreground",
};

const BusinessSelectorScreen = () => {
  const iconColor = useIconColor();
  const navigation = useNavigation<any>();
  const { promotions, selectedPromotionId, selectPromotion } = usePromotionContext();
  const [query, setQuery] = useState("");

  const filteredPromotions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return promotions as any[];
    return (promotions as any[]).filter((p: any) =>
      (p.business_name || "Business").toLowerCase().includes(normalized),
    );
  }, [promotions, query]);

  return (
    <View className="flex-1 bg-background px-4 py-4">
      <View className="mb-3 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()} className="rounded-lg border border-border p-2">
          <ArrowLeft size={18} color={iconColor} />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">Switch Business</Text>
      </View>

      <View className="mb-3 flex-row items-center rounded-xl border border-border bg-card px-3 py-2">
        <Search size={16} color="#6a7181" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search businesses"
          placeholderTextColor="#9aa2b1"
          className="ml-2 flex-1 text-sm text-foreground"
        />
      </View>

      <FlatList
        data={filteredPromotions}
        keyExtractor={(item: any) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => {
          const isSelected = item.id === selectedPromotionId;
          const tier = effectiveTier(item.tier, item.status) as Tier;
          const tierColor = getTierColor(tier);
          const status = item.status || "active";

          return (
            <Pressable
              onPress={() => {
                selectPromotion(item.id);
                navigation.navigate("BusinessDashboard");
              }}
              className={`mb-2 rounded-2xl border p-3 ${isSelected ? "border-primary bg-primary/5" : "border-border bg-card"}`}
            >
              <View className="flex-row items-center justify-between gap-2">
                <Text className="flex-1 text-sm font-semibold text-foreground" numberOfLines={1}>
                  {item.business_name || "Business"}
                </Text>
                {isSelected && (
                  <View className="flex-row items-center gap-1">
                    <RefreshCw size={12} color="#2563eb" />
                    <Text className="text-[10px] font-semibold text-primary">Active</Text>
                  </View>
                )}
              </View>

              <View className="mt-1 flex-row items-center gap-1.5">
                <Text
                  style={{ backgroundColor: `${tierColor}20`, color: tierColor }}
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                >
                  {getTierLabel(tier).toUpperCase()}
                </Text>
                <Text className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClassName[status] || "bg-muted text-muted-foreground"}`}>
                  {statusLabel[status] || status}
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View className="items-center py-10">
            <Text className="text-sm text-muted-foreground">No businesses found.</Text>
          </View>
        }
      />
    </View>
  );
};

export default BusinessSelectorScreen;
