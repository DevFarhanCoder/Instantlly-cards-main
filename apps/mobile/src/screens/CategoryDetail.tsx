import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  ArrowLeft,
  CalendarCheck,
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
import { useListMobileCategoriesQuery, useGetMobileSubcategoriesQuery } from "../store/api/categoriesApi";
import { useUserLocation, getDistanceKm, formatDistance } from "../hooks/useUserLocation";
import { colors } from "../theme/colors";

type SortOption = "rating" | "newest";
type ServiceMode = "all" | "home" | "visit";

const CategoryDetail = () => {
  const { toggleFavorite, isFavorite } = useFavorites();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id = route.params?.id as string | undefined;
  const categoryId = Number(id);
  const { data: categoryData = [] } = useListMobileCategoriesQuery();
  const category = categoryData.find((c) => String(c.id) === String(categoryId));
  const { data: subcategoryResponse } = useGetMobileSubcategoriesQuery(
    { id: categoryId, page: 1, limit: 200 },
    { skip: !categoryId }
  );
  const subcategories = subcategoryResponse?.data?.subcategories ?? [];

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [serviceMode, setServiceMode] = useState<ServiceMode>("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [bookingCard, setBookingCard] = useState<DirectoryCard | null>(null);
  const userLocation = useUserLocation();

  const {
    data: allCards = [],
    isLoading,
    isFetching,
    hasMore,
    loadMore,
  } = useDirectoryFeed({
    pageSize: 30,
    category: selectedSubcategory || category?.name,
    skip: !selectedSubcategory && !category?.name,
    lat: userLocation?.latitude,
    lng: userLocation?.longitude,
    radius: 10000,
  });


  useEffect(() => {
    setSelectedSubcategory(null);
  }, [categoryId]);

  const filteredCards = useMemo(() => {
    let cards = [...allCards].filter((c) => {
      if (serviceMode === "home") return c.service_mode === "home" || c.service_mode === "both";
      if (serviceMode === "visit") return c.service_mode === "visit" || c.service_mode === "both";
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

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card">
        <View className="flex-row items-center gap-3 px-4 py-3">
          <Pressable onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color="#111827" />
          </Pressable>
          <View className="flex-row items-center gap-2">
            <Text className="text-xl">{category?.icon || "📁"}</Text>
            <Text className="text-lg font-bold text-foreground">{category?.name || "Category"}</Text>
          </View>
          <View className="ml-auto">
            <Button
              variant={showFilters ? "default" : "ghost"}
              size="icon"
              onPress={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} color={showFilters ? "#ffffff" : "#111827"} />
            </Button>
          </View>
        </View>

        <View className="flex-row gap-2 px-4 pb-2">
          {[
            { value: "all" as ServiceMode, label: "All", icon: "🔍" },
            { value: "home" as ServiceMode, label: "Home Services", icon: "🏠" },
            { value: "visit" as ServiceMode, label: "Visit Business", icon: "🏪" },
          ].map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setServiceMode(opt.value)}
              className={`flex-1 flex-row items-center justify-center gap-1 rounded-lg py-2 ${
                serviceMode === opt.value
                  ? "bg-primary"
                  : "bg-muted/60"
              }`}
            >
              <Text className={`text-[11px] font-semibold ${
                serviceMode === opt.value ? "text-primary-foreground" : "text-muted-foreground"
              }`}>
                {opt.icon} {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {subcategories.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 pb-2">
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setSelectedSubcategory(null)}
                className={`rounded-full px-3 py-1.5 ${selectedSubcategory === null ? "bg-primary" : "bg-muted/60"}`}
              >
                <Text className={`text-[11px] font-semibold ${selectedSubcategory === null ? "text-primary-foreground" : "text-muted-foreground"}`}>
                  All
                </Text>
              </Pressable>
              {subcategories.map((sub) => (
                <Pressable
                  key={sub}
                  onPress={() => setSelectedSubcategory(sub)}
                  className={`rounded-full px-3 py-1.5 ${selectedSubcategory === sub ? "bg-primary" : "bg-muted/60"}`}
                >
                  <Text className={`text-[11px] font-semibold ${selectedSubcategory === sub ? "text-primary-foreground" : "text-muted-foreground"}`}>
                    {sub}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}

        <View className="px-4 pb-3">
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
                className={`rounded-lg px-3 py-2 ${
                  sortBy === key
                    ? "bg-accent"
                    : "border border-border"
                }`}
              >
                <Text className={`text-xs font-medium ${
                  sortBy === key ? "text-accent-foreground" : "text-muted-foreground"
                }`}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: 260 }}
        className="px-4 py-4"
        onScroll={handleScroll}
        scrollEventThrottle={200}
      >
        {isLoading ? (
          <View className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </View>
        ) : (
          <>
            <Text className="text-xs text-muted-foreground mb-3 mt-3">
              {filteredCards.length > 0
                ? `${filteredCards.length} businesses found`
                : "No businesses in this category yet"}
            </Text>

            <View className="space-y-3">
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
                    className="rounded-2xl border border-border bg-card p-4"
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-row items-start gap-3">
                        <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
                          {card.logo_url ? (
                            <Image source={{ uri: card.logo_url }} style={{ height: "100%", width: "100%" }} />
                          ) : (
                            <Text className="text-xl">🏢</Text>
                          )}
                        </View>
                        <View>
                          <Text className="text-base font-bold text-foreground">{card.full_name}</Text>
                          <View className="mt-0.5 flex-row items-center gap-1.5">
                            {card.category && <Text className="text-xs text-muted-foreground">{card.category}</Text>}
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
                        </View>
                      </View>
                      <Pressable onPress={() => toggleFavorite(card.id)} className="p-1">
                        <Heart
                          size={16}
                          color={isFavorite(card.id) ? colors.destructive : colors.mutedForeground}
                          fill={isFavorite(card.id) ? colors.destructive : "transparent"}
                        />
                      </Pressable>
                    </View>

                    {card.location && (
                      <View className="mt-2 flex-row items-center gap-1.5">
                        <MapPin size={14} color={colors.mutedForeground} />
                        <Text className="text-xs text-muted-foreground flex-1">{card.location}</Text>
                        {userLocation && card.latitude && card.longitude && (
                          <View className="flex-row items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5">
                            <NavigationIcon size={12} color={colors.primary} />
                            <Text className="text-[10px] font-semibold text-primary">
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
                      <View className="mt-2 rounded-lg bg-success/10 px-3 py-1.5">
                        <Text className="text-xs font-medium text-success">🎁 {card.offer}</Text>
                      </View>
                    )}

                    {card.services && card.services.length > 0 && (
                      <View className="mt-2 flex-row flex-wrap gap-1.5">
                        {card.services.map((s) => (
                          <Text
                            key={s}
                            className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground"
                          >
                            {s}
                          </Text>
                        ))}
                      </View>
                    )}

                    <View className="mt-3 flex-row gap-2">
                      <Button
                        size="sm"
                        className="flex-1 rounded-lg"
                        onPress={() => Linking.openURL(`tel:${card.phone}`)}
                      >
                        <Phone size={12} color="#ffffff" /> Call
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 rounded-lg"
                        onPress={() => navigation.navigate("Messaging")}
                      >
                        <MessageCircle size={12} color={colors.foreground} /> Chat
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 rounded-lg"
                        onPress={() => setBookingCard(card)}
                      >
                        <CalendarCheck size={12} color={colors.foreground} /> Book
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
        businessId={bookingCard?.id || ""}
      />
    </View>
  );
};

export default CategoryDetail;

