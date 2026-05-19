import { useCallback, useMemo, useState } from "react";
import { Modal, Platform, Pressable, Image, RefreshControl, SafeAreaView, ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ChevronDown, ChevronRight, Clock, Filter, MapPin, Search, Ticket, Users, X } from "lucide-react-native";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { voucherCategories } from "../data/categories";
import { useVouchers, type Voucher } from "../hooks/useVouchers";
import { useAppLocation } from "../contexts/LocationContext";
import { cn, formatINR } from "../lib/utils";
import { colors } from "../theme/colors";
import { differenceInDays, isValid } from "date-fns";
import { useIconColor } from "../theme/colors";
import { LocationPickerModal } from "../components/ui/LocationPickerModal";

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
  const [tab, setTab] = useState<"near" | "all">("near");
  const { city: userCity, state: userState, isLoading: locationLoading, isManual, permissionDenied } = useAppLocation();
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const { data: vouchers = [], isLoading, isFetching, refetch: refetchVouchers } = useVouchers({ nearMe: tab === "near" });
  const [bannerVoucher, setBannerVoucher] = useState<Voucher | null>(null);

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

  const [selectedVoucher, setSelectedVoucher] = useState<(typeof filteredVouchers)[0] | null>(null);

  return (
    <View className="flex-1 bg-background">
      <Pressable
        onPress={() => setShowLocationPicker(true)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 10,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: 10,
        }}
      >
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#ef444415", alignItems: "center", justifyContent: "center" }}>
          <MapPin size={18} color="#ef4444" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: colors.mutedForeground, fontWeight: "500", marginBottom: 1 }}>
            {isManual ? "Selected city" : "Your location"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: permissionDenied && !userCity ? colors.mutedForeground : colors.foreground, flexShrink: 1 }} numberOfLines={1}>
              {locationLoading ? "Detecting..." : (userCity ?? (permissionDenied ? "Tap to set location" : "Select City"))}
            </Text>
            <ChevronDown size={16} color={colors.foreground} />
          </View>
        </View>
        {userState && !locationLoading ? (
          <View style={{ backgroundColor: colors.muted, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, maxWidth: 100 }}>
            <Text style={{ fontSize: 10, color: colors.mutedForeground, fontWeight: "600" }} numberOfLines={1}>{userState}</Text>
          </View>
        ) : null}
        <Button size="sm" variant="outline" className="gap-1" onPress={() => navigation.navigate("MyVouchers")}>
          <Ticket size={14} color={iconColor} />
          <Text style={{ fontSize: 12, fontWeight: "600" }}>My Vouchers</Text>
        </Button>
      </Pressable>
      <LocationPickerModal visible={showLocationPicker} onClose={() => setShowLocationPicker(false)} />

      {/* Near Me / All tabs */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: "#ffffff",
          borderBottomWidth: 1,
          borderBottomColor: "#e5e7eb",
        }}
      >
        <Pressable
          onPress={() => setTab("near")}
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 12,
            borderBottomWidth: tab === "near" ? 2 : 0,
            borderBottomColor: "#2563eb",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: tab === "near" ? "#2563eb" : "#6b7280",
            }}
          >
            Near Me{userCity ? ` (${userCity})` : ""}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("all")}
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 12,
            borderBottomWidth: tab === "all" ? 2 : 0,
            borderBottomColor: "#2563eb",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: tab === "all" ? "#2563eb" : "#6b7280",
            }}
          >
            All
          </Text>
        </Pressable>
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
                        {/* show logo (image_url) on the card; banner shows in the preview modal */}
                        {(v as any).image_url ? (
                          <Image source={{ uri: (v as any).image_url }} style={{ position: "absolute", width: "100%", height: "100%" }} resizeMode="cover" />
                        ) : (v as any).banner_url ? (
                          <Image source={{ uri: (v as any).banner_url }} style={{ position: "absolute", width: "100%", height: "100%" }} resizeMode="cover" />
                        ) : (
                          <Text className="text-6xl">{emojiImages[v.category] || "🎁"}</Text>
                        )}
                        {v.discount_label && (
                          <Badge className="absolute left-2 top-2 bg-primary text-primary-foreground border-none text-xs">
                            <Text className="text-[11px] font-semibold text-primary-foreground" numberOfLines={1}>
                              {v.discount_label} with code
                            </Text>
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
                              ₹{formatINR(v.original_price)}
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
                    onPress={() => setSelectedVoucher(d)}
                  >
                    <View className="h-24 w-24 items-center justify-center bg-muted overflow-hidden rounded-l-xl">
                      {/* show logo (image_url) on the card; banner shows in the preview modal */}
                      {(d as any).image_url ? (
                        <Image source={{ uri: (d as any).image_url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                      ) : (d as any).banner_url ? (
                        <Image source={{ uri: (d as any).banner_url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                      ) : (
                        <Text className="text-4xl">{emojiImages[d.category] || "🎁"}</Text>
                      )}
                    </View>
                    <View className="flex-1 py-3 pr-4">
                      <View className="mb-1 flex-row items-center gap-1.5">
                        {d.discount_label && (
                          <Badge className="bg-primary/10 text-primary border-none text-[10px]">
                            <Text className="text-[10px] font-semibold text-primary" numberOfLines={1}>
                              {d.discount_label} with code
                            </Text>
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
                          ₹{formatINR(d.original_price)}
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

      {/* Full-screen banner preview modal */}
      <Modal
        visible={!!selectedVoucher}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSelectedVoucher(null)}
      >
        {selectedVoucher && (
          <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            {/* Image area (top half — flexible) */}
            <View style={{ flex: 1, backgroundColor: "#000", paddingTop: Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0 }}>
              {(selectedVoucher as any).banner_url || (selectedVoucher as any).image_url ? (
                <Image
                  source={{ uri: (selectedVoucher as any).banner_url || (selectedVoucher as any).image_url }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="contain"
                />
              ) : (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 96 }}>{emojiImages[selectedVoucher.category] || "🎁"}</Text>
                </View>
              )}

              {/* Close button top-left */}
              <Pressable
                onPress={() => setSelectedVoucher(null)}
                style={{ position: "absolute", top: 12, left: 16, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 20, width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: "#fff", fontSize: 18, lineHeight: 20 }}>✕</Text>
              </Pressable>
            </View>

            {/* Bottom info + button (own area, no overlap) */}
            <View style={{ backgroundColor: "#0b1220", padding: 20, gap: 10, paddingBottom: 28 }}>
              {selectedVoucher.discount_label && (
                <View style={{ alignSelf: "flex-start", backgroundColor: "#2463eb", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 }}>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>{selectedVoucher.discount_label} with code</Text>
                </View>
              )}
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800" }} numberOfLines={2}>
                {selectedVoucher.title}
              </Text>
              {selectedVoucher.subtitle ? (
                <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 14 }} numberOfLines={2}>{selectedVoucher.subtitle}</Text>
              ) : null}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700" }}>₹{Number(selectedVoucher.original_price).toLocaleString("en-IN")}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setSelectedVoucher(null);
                  navigation.navigate("VoucherDetail", { id: selectedVoucher.id });
                }}
                style={{ backgroundColor: "#fff", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 4 }}
              >
                <Text style={{ color: "#2463eb", fontWeight: "700", fontSize: 16 }}>View Details</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        )}
      </Modal>
    </View>
  );
};

export default Vouchers;

