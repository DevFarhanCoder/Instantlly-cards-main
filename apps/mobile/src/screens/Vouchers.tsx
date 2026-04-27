import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Clock, Filter, Search, Ticket, Users } from "lucide-react-native";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { voucherCategories } from "../data/categories";
import { useVouchers, type Voucher } from "../hooks/useVouchers";
import { cn } from "../lib/utils";
import { colors } from "../theme/colors";
import { differenceInDays, isValid } from "date-fns";
import { useIconColor } from "../theme/colors";

const emojiImages: Record<string, string> = {
  travel: "🏖️",
  beauty: "💆",
  food: "🍽️",
  health: "💪",
  shopping: "🛍️",
  entertainment: "🎬",
  activities: "🏄",
  education: "📚",
  general: "🎁",
};

const getExpiryLabel = (expiresAt: string | null) => {
  if (!expiresAt) return "No expiry";
  const d = new Date(expiresAt);
  if (!isValid(d)) return "No expiry";
  const days = differenceInDays(d, new Date());
  if (days < 0) return "Expired";
  if (days === 0) return "Expires today";
  return `${days} days left`;
};

const Vouchers = () => {
  const iconColor = useIconColor();
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { data: vouchers = [], isLoading, isFetching, refetch: refetchVouchers } = useVouchers();

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetchVouchers(); } finally { setRefreshing(false); }
  }, [refetchVouchers]);

  const filteredVouchers = useMemo(
    () =>
      vouchers.filter((v) => {
        const matchesSearch =
          !searchQuery ||
          v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (v.subtitle || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = !selectedCategory || v.category === selectedCategory;
        return matchesSearch && matchesCategory;
      }),
    [vouchers, searchQuery, selectedCategory]
  );

  const featuredVouchers = filteredVouchers.filter((v) => v.is_popular);

  return (
    <View className="flex-1 bg-background">
      <View className="bg-primary px-4 py-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text className="text-xl">💎</Text>
            <Text className="text-xl font-bold text-primary-foreground">
              Vouchers Market
            </Text>
          </View>
          <Button
            size="sm"
            variant="secondary"
            className="gap-1"
            onPress={() => navigation.navigate("MyVouchers")}
          >
            <Ticket size={14} color={iconColor} /> My Vouchers
          </Button>
        </View>
        <Text className="mt-1 text-xs text-primary-foreground/70">
          Best deals & discounts near you
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 16 }} refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2463eb"]} tintColor="#2463eb" />
        }>
        <View className="px-4 py-4 gap-5">
          <View className="relative">
            <View className="absolute left-3 top-1/2 -translate-y-1/2">
              <Search size={16} color="#6a7181" />
            </View>
            <Input
              placeholder="Search vouchers, merchants..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="pl-10 pr-10 bg-card"
            />
            <Pressable className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 items-center justify-center rounded-full">
              <Filter size={16} color="#6a7181" />
            </Pressable>
          </View>

          <Card className="overflow-hidden bg-primary">
            <CardContent className="p-6">
              <View className="items-center mb-4">
                <Badge className="bg-primary-foreground/20 text-primary-foreground border-none mb-2">
                  Most Trusted Platform
                </Badge>
                <Text className="text-2xl font-bold text-primary-foreground mb-1">
                  India's #1 Voucher Marketplace
                </Text>
                <Text className="text-sm text-primary-foreground/80 mb-4">
                  Trusted by 1M+ Happy Customers
                </Text>
              </View>
              <View className="flex-row justify-between mb-4">
                {[
                  ["1M+", "Happy Customers"],
                  ["5000+", "Partners"],
                  ["50+", "Cities"],
                ].map(([val, lbl]) => (
                  <View key={lbl} className="items-center flex-1">
                    <Text className="text-xl font-bold text-primary-foreground">
                      {val}
                    </Text>
                    <Text className="text-[11px] text-primary-foreground/80">
                      {lbl}
                    </Text>
                  </View>
                ))}
              </View>
              <Pressable className="w-full items-center justify-center rounded-xl bg-primary-foreground py-3">
                <Text style={{ color: colors.primary, fontWeight: "600" }}>
                  Start Shopping →
                </Text>
              </Pressable>
            </CardContent>
          </Card>


          <View>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-semibold text-foreground">
                Browse Categories
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-3">
              {voucherCategories.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() =>
                    setSelectedCategory(selectedCategory === cat.id ? null : cat.id)
                  }
                  className={cn(
                    "w-[22%] items-center gap-1.5 rounded-xl bg-card p-3 shadow-sm",
                    selectedCategory === cat.id && "ring-2 ring-primary"
                  )}
                >
                  <Text className="text-2xl">{cat.icon}</Text>
                  <Text className="text-xs font-medium text-foreground">
                    {cat.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {featuredVouchers.length > 0 && (
            <View>
              <Text className="mb-3 text-lg font-semibold text-foreground">
                Featured Vouchers
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-3">
                  {featuredVouchers.map((v) => (
                    <Pressable
                      key={v.id}
                      className="w-64 overflow-hidden rounded-xl bg-card shadow-sm"
                      onPress={() => navigation.navigate("VoucherDetail", { id: v.id })}
                    >
                      <View className="relative h-36 items-center justify-center bg-muted">
                        <Text className="text-6xl">{emojiImages[v.category] || "🎁"}</Text>
                        {v.discount_label && (
                          <Badge className="absolute left-2 top-2 bg-primary text-primary-foreground border-none text-xs">
                            {v.discount_label}
                          </Badge>
                        )}
                        <View className="absolute bottom-2 left-2 flex-row items-center gap-1 rounded-full bg-background/80 px-2 py-0.5">
                          <Clock size={12} color={iconColor} />
                          <Text className="text-[10px] font-medium text-foreground">
                            {getExpiryLabel(v.expires_at)}
                          </Text>
                        </View>
                      </View>
                      <View className="p-3">
                        <Text className="text-sm font-semibold text-foreground">
                          {v.title}
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          {v.subtitle}
                        </Text>
                        <View className="mt-1.5 flex-row items-center justify-between">
                          <View className="flex-row items-center gap-2">
                            <Text className="text-sm font-bold text-primary">
                              ₹{v.discounted_price.toLocaleString()}
                            </Text>
                            <Text className="text-xs text-muted-foreground line-through">
                              ₹{v.original_price.toLocaleString()}
                            </Text>
                          </View>
                          <View className="flex-row items-center gap-1">
                            <Users size={12} color="#6a7181" />
                            <Text className="text-[10px] text-muted-foreground">
                              {v.claimed_count || 0} bought
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <View>
            <Text className="mb-3 text-lg font-semibold text-foreground">
              {(isLoading || isFetching)
                ? "Loading..."
                : filteredVouchers.length === 0
                ? "No vouchers found"
                : "Trending Deals 🔥"}
            </Text>
            {(isLoading || isFetching) ? (
              <View className="gap-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </View>
            ) : filteredVouchers.length === 0 ? (
              <View className="items-center py-16">
                <Text className="text-5xl mb-3">📭</Text>
                <Text className="text-sm text-muted-foreground">
                  No vouchers available yet
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {filteredVouchers.map((d) => (
                  <Pressable
                    key={d.id}
                    className="relative flex-row gap-3 overflow-hidden rounded-xl bg-card shadow-sm"
                    onPress={() => navigation.navigate("VoucherDetail", { id: d.id })}
                  >
                    <View className="h-24 w-24 items-center justify-center bg-muted">
                      <Text className="text-4xl">{emojiImages[d.category] || "🎁"}</Text>
                    </View>
                    <View className="flex-1 py-3 pr-4">
                      <View className="mb-1 flex-row items-center gap-1.5">
                        {d.discount_label && (
                          <Badge className="bg-primary/10 text-primary border-none text-[10px]">
                            {d.discount_label}
                          </Badge>
                        )}
                        <View className="ml-auto flex-row items-center gap-1">
                          <Users size={12} color="#6a7181" />
                          <Text className="text-[10px] text-muted-foreground">
                            {d.claimed_count || 0} bought
                          </Text>
                        </View>
                      </View>
                      <Text className="text-sm font-semibold text-foreground">
                        {d.title}
                      </Text>
                      <View className="mt-1 flex-row items-center gap-2">
                        <Text className="text-sm font-bold text-primary">
                          ₹{d.discounted_price.toLocaleString()}
                        </Text>
                        <Text className="text-xs text-muted-foreground line-through">
                          ₹{d.original_price.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                    <View className="absolute bottom-2 right-2 flex-row items-center gap-1">
                      <Clock size={12} color="#6a7181" />
                      <Text className="text-[10px] text-muted-foreground">
                        {getExpiryLabel(d.expires_at)}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default Vouchers;

