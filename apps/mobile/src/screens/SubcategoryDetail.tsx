import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle,
  Filter,
  Heart,
  MapPin,
  MessageCircle,
  Navigation as NavigationIcon,
  Phone,
  Search,
  X,
} from "lucide-react-native";
import { useFavorites } from "../contexts/FavoritesContext";
import { Button } from "../components/ui/button";
import BookAppointmentModal from "../components/BookAppointmentModal";
import { useDirectoryFeed, type DirectoryCard } from "../hooks/useDirectoryCards";
import { Skeleton } from "../components/ui/skeleton";
import { useUserLocation, getDistanceKm, formatDistance } from "../hooks/useUserLocation";
import { colors } from "../theme/colors";

type SortOption = "rating" | "newest";
type ServiceMode = "all" | "home" | "visit";

const SubcategoryDetail = () => {
  const { toggleFavorite, isFavorite } = useFavorites();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const subcategory = route.params?.subcategory as string ?? "";
  const categoryName = route.params?.categoryName as string ?? "Category";
  const categoryIcon = route.params?.categoryIcon as string ?? "📁";

  // [DEBUG-CATEGORY] Temporary log — remove after category investigation
  console.log('[FRONTEND-CATEGORY-SENT]', { subcategory, categoryName, categoryIcon });

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [serviceMode, setServiceMode] = useState<ServiceMode>("all");
  const [bookingCard, setBookingCard] = useState<DirectoryCard | null>(null);
  const userLocation = useUserLocation();

  const {
    data: allCards = [],
    isLoading,
    isFetching,
    hasMore,
    loadMore,
    refetch: refetchFeed,
  } = useDirectoryFeed({
    pageSize: 30,
    category: subcategory,
    lat: userLocation?.latitude,
    lng: userLocation?.longitude,
    radius: 10000,
  });

  const filteredCards = useMemo(() => {
    let cards = [...allCards].filter((c) => {
      const mode = c.service_mode || "both";
      if (serviceMode === "home") return mode === "home" || mode === "both";
      if (serviceMode === "visit") return mode === "visit" || mode === "both";
      return true;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      cards = cards.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          (c.services || []).some((s) => s.toLowerCase().includes(q)) ||
          (c.location?.toLowerCase().includes(q))
      );
    }

    cards.sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return 0;
    });

    return cards;
  }, [allCards, searchQuery, sortBy, serviceMode]);

  const handleScroll = (e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const paddingToBottom = 320;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      if (hasMore) loadMore();
    }
  };

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetchFeed(); } finally { setRefreshing(false); }
  }, [refetchFeed]);

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card">
        <View className="px-4 pb-2 pt-3">
          <View className="flex-row items-center gap-2">
            <Pressable onPress={() => navigation.goBack()}>
              <ArrowLeft size={20} color="#111827" />
            </Pressable>
            <Text className="text-2xl">{categoryIcon || "📁"}</Text>
            <View className="flex-1">
              <Text className="text-xs text-muted-foreground">{categoryName}</Text>
              <Text className="text-lg font-bold text-foreground">{subcategory}</Text>
            </View>
            <Pressable onPress={() => setShowFilters(!showFilters)}>
              <Filter size={20} color={colors.foreground} />
            </Pressable>
          </View>
        </View>

        <View className="px-4 pb-3 pt-2">
          <View className="relative">
            <Search size={16} color={colors.mutedForeground} style={{ position: "absolute", left: 12, top: 12 }} />
            <TextInput
              placeholder="Search businesses, services..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="w-full rounded-xl border border-border bg-muted/50 py-2.5 pl-10 pr-10 text-sm text-foreground"
              placeholderTextColor={colors.mutedForeground}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery("")} style={{ position: "absolute", right: 12, top: 12 }}>
                <X size={16} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      {showFilters && (
        <View className="border-b border-border bg-card px-4 py-3">
          <Text className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sort by</Text>
          <View className="flex-row gap-2">
            {[
              { key: "newest" as SortOption, label: "Newest" },
              { key: "rating" as SortOption, label: "Rating" },
            ].map(({ key, label }) => (
              <Pressable
                key={key}
                onPress={() => setSortBy(key)}
                className={`flex-1 rounded-lg border px-3 py-2 ${
                  sortBy === key ? "border-primary bg-primary/10" : "border-border bg-card"
                }`}
              >
                <Text
                  className={`text-center text-xs font-medium ${
                    sortBy === key ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text className="mb-2 mt-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Service Mode
          </Text>
          <View className="flex-row gap-2">
            {[
              { key: "all" as ServiceMode, label: "All", icon: "🔄" },
              { key: "home" as ServiceMode, label: "Home Service", icon: "🏠" },
              { key: "visit" as ServiceMode, label: "Visit Only", icon: "🏪" },
            ].map(({ key, label, icon }) => (
              <Pressable
                key={key}
                onPress={() => setServiceMode(key)}
                className={`flex-1 rounded-lg border px-2 py-2 ${
                  serviceMode === key ? "border-primary bg-primary/10" : "border-border bg-card"
                }`}
              >
                <Text className="text-center text-base mb-0.5">{icon}</Text>
                <Text
                  className={`text-center text-[10px] font-medium ${
                    serviceMode === key ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: 16 }}
        className="px-4 py-2"
        onScroll={handleScroll}
        scrollEventThrottle={200}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2463eb"]} tintColor="#2463eb" />
        }
      >
        {isLoading ? (
          <View className="gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </View>
        ) : (
          <>
            <Text className="text-xs text-muted-foreground mb-2 mt-1">
              {filteredCards.length > 0
                ? `${filteredCards.length} businesses found`
                : "No businesses in this category yet"}
            </Text>

            <View className="gap-2.5 mt-2">
              {filteredCards.length === 0 ? (
                <View className="items-center py-16">
                  <Text className="text-5xl mb-3">📭</Text>
                  <Text className="text-sm text-muted-foreground">No businesses found</Text>
                  {searchQuery ? (
                    <Button variant="outline" size="sm" className="mt-3" onPress={() => setSearchQuery("")}>
                      Clear search
                    </Button>
                  ) : null}
                </View>
              ) : (
                filteredCards.map((card) => (
                  <Pressable
                    key={card.id}
                    onPress={() => navigation.navigate("BusinessDetail", { id: card.id })}
                    className="rounded-2xl border border-border bg-card p-3.5"
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-row items-center gap-3 flex-1 min-w-0">
                        <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
                          {card.logo_url ? (
                            <Image source={{ uri: card.logo_url }} style={{ height: "100%", width: "100%" }} />
                          ) : (
                            <Text className="text-xl">🏢</Text>
                          )}
                        </View>
                        <View className="flex-1 min-w-0">
                          <View className="flex-row items-center gap-1">
                            <Text className="text-sm font-bold text-foreground" numberOfLines={1}>{card.full_name}</Text>
                            {card.is_verified && (
                              <CheckCircle size={14} color={colors.primary} />
                            )}
                          </View>
                          {card.company_name && card.company_name !== card.full_name && (
                            <Text className="text-xs text-muted-foreground" numberOfLines={1}>{card.company_name}</Text>
                          )}
                          {card.service_mode && (
                            <View className="flex-row items-center gap-1.5 mt-0.5">
                              <Text
                                className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${
                                  card.service_mode === "home"
                                    ? "bg-blue-100 text-blue-700"
                                    : card.service_mode === "both"
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {card.service_mode === "home"
                                  ? "🏠 Home Service"
                                  : card.service_mode === "both"
                                  ? "🔄 Home & Visit"
                                  : "🏪 Visit"}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Pressable onPress={() => toggleFavorite(card.id)} className="p-1">
                        <Heart
                          size={18}
                          color={isFavorite(card.id) ? colors.destructive : colors.mutedForeground}
                          fill={isFavorite(card.id) ? colors.destructive : "transparent"}
                        />
                      </Pressable>
                    </View>

                    {card.description && (
                      <Text className="mt-1.5 text-xs text-muted-foreground" numberOfLines={2}>
                        {card.description}
                      </Text>
                    )}

                    {card.location && (
                      <View className="mt-1.5 flex-row items-center gap-1.5">
                        <MapPin size={13} color={colors.mutedForeground} />
                        <Text className="text-[11px] text-muted-foreground flex-1" numberOfLines={1}>{card.location}</Text>
                        {userLocation && card.latitude && card.longitude && (
                          <View className="flex-row items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5">
                            <NavigationIcon size={10} color={colors.primary} />
                            <Text className="text-[9px] font-semibold text-primary">
                              {formatDistance(
                                getDistanceKm(
                                  userLocation.latitude,
                                  userLocation.longitude,
                                  card.latitude,
                                  card.longitude
                                )
                              )}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {card.offer && (
                      <View className="mt-1.5 rounded-lg bg-success/10 px-2.5 py-1">
                        <Text className="text-[11px] font-medium text-success">🎁 {card.offer}</Text>
                      </View>
                    )}

                    {card.services && card.services.length > 0 && (
                      <View className="mt-1.5 flex-row flex-wrap gap-1">
                        {card.services.slice(0, 4).map((s) => (
                          <Text
                            key={s}
                            className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                          >
                            {s}
                          </Text>
                        ))}
                        {card.services.length > 4 && (
                          <Text className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            +{card.services.length - 4} more
                          </Text>
                        )}
                      </View>
                    )}

                    <View className="mt-2.5 flex-row gap-1.5">
                      {card.phone ? (
                        <Button
                          size="sm"
                          className="flex-1 rounded-lg py-1.5"
                          onPress={() => Linking.openURL(`tel:${card.phone}`)}
                        >
                          <Phone size={11} color="#ffffff" /> Call
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 rounded-lg py-1.5"
                        onPress={() => navigation.navigate("Messaging")}
                      >
                        <MessageCircle size={11} color={colors.foreground} /> Chat
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 rounded-lg py-1.5"
                        onPress={() => setBookingCard(card)}
                      >
                        <CalendarCheck size={11} color={colors.foreground} /> Book
                      </Button>
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          </>
        )}
        
        {hasMore && (
          <View className="items-center pt-4 pb-6">
            {isFetching ? (
              <Text className="text-xs text-muted-foreground">Loading more...</Text>
            ) : null}
          </View>
        )}
      </ScrollView>

      <BookAppointmentModal
        open={!!bookingCard}
        onOpenChange={(open) => !open && setBookingCard(null)}
        businessName={bookingCard?.full_name || ""}
        businessLogo={bookingCard?.logo_url || "🏢"}
        businessId={bookingCard?.business_card_id || bookingCard?.id || ""}
      />
    </View>
  );
};

export default SubcategoryDetail;
