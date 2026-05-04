import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Clock,
  Gift,
  Heart,
  Loader2,
  MapPin,
  MessageCircle,
  Navigation as NavigationIcon,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Ticket,
  TrendingUp,
  X,
} from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { categories as fallbackCategories } from "../data/categories";
import { useListMobileCategoriesQuery, useGetCategoryTreeQuery } from "../store/api/categoriesApi";
import { useFavorites } from "../contexts/FavoritesContext";
import { useAuth } from "../hooks/useAuth";
import { useUserRole } from "../hooks/useUserRole";
import { useGetMyCardsQuery } from "../store/api/businessCardsApi";
import { useUserLocation, getDistanceKm, formatDistance } from "../hooks/useUserLocation";
import { useTrendingBusinesses } from "../hooks/useTrendingBusinesses";
import { useDealOfTheDay } from "../hooks/useDealOfTheDay";
import { useVouchers } from "../hooks/useVouchers";
import { useCredits } from "../contexts/CreditsContext";
import { supabase, SUPABASE_CONFIG_OK } from "../integrations/supabase/client";
import { colors } from "../theme/colors";
import { useAppLocation } from "../contexts/LocationContext";
import { LocationPickerModal } from "../components/ui/LocationPickerModal";

type ServiceMode = "all" | "home" | "visit";

const Index = () => {
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceMode, setServiceMode] = useState<ServiceMode>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [maxDistance, setMaxDistance] = useState(0);
  const searchRef = useRef<TextInput>(null);
  const navigation = useNavigation<any>();
  const { toggleFavorite, isFavorite } = useFavorites();
  const userLocation = useUserLocation();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isBusiness, activeRole, isLoading: roleLoading } = useUserRole();
  const { credits } = useCredits();
  const { data: myCards = [], isLoading: isLoadingMyCards, refetch: refetchMyCards } = useGetMyCardsQuery(undefined, { skip: !user });
  const { data: categoryData = [], isLoading: isLoadingCategories, isFetching: isFetchingCategories, refetch: refetchCategories } = useListMobileCategoriesQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: categoryTree = [] } = useGetCategoryTreeQuery();

  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const { city: globalCity, state: globalState, isLoading: locationLoading, isManual, permissionDenied } = useAppLocation();
  const autoOpenedRef = useRef(false);

  // Auto-open the picker once when the app loads with no city (permission denied or geocoding failed)
  useEffect(() => {
    if (!locationLoading && !globalCity && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      setShowLocationPicker(true);
    }
  }, [locationLoading, globalCity]);

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchCategories(), refetchMyCards()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchCategories, refetchMyCards]);

  useEffect(() => {
    // Wait for auth hydration before checking admin role to avoid
    // firing replace() before the user's roles are loaded from SecureStore.
    // Only redirect if user has actively chosen admin role (not just has admin in roles)
    console.log(`[Index] Auth check — authLoading=${authLoading}, roleLoading=${roleLoading}, activeRole=${activeRole}`);
    if (!authLoading && !roleLoading && activeRole === 'admin') {
      console.log('[Index] Admin role active → redirecting to AdminDashboard');
      navigation.replace("AdminDashboard");
    }
  // navigation is a stable ref from useNavigation() — omitting it is intentional.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, activeRole, roleLoading]);

  const normalizedCategories = useMemo(() => {
    if (categoryData.length > 0) {
      return categoryData
        .filter((cat) => cat.icon !== '??' && !cat.name.match(/^(Root|LegacyRoot)\s+\d+$/))
        .map((cat) => ({
          id: String(cat.id),
          name: cat.name,
          emoji: cat.icon || "\u{1F4C1}",
          count: cat.child_count ?? 0,
        }));
    }
    return fallbackCategories;
  }, [categoryData]);

  const displayedCategories = showAllCategories
    ? normalizedCategories
    : normalizedCategories.slice(0, 8);

  const suggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    const results: { id: string; name: string; emoji: string; type: 'category' | 'subcategory'; parentId?: string; parentName?: string; categoryIcon?: string }[] = [];
    // Match top-level categories
    for (const cat of normalizedCategories) {
      if (cat.name.toLowerCase().includes(q)) {
        results.push({ id: cat.id, name: cat.name, emoji: cat.emoji, type: 'category' });
      }
    }
    // Match subcategories from category tree
    for (const parent of categoryTree) {
      const parentEmoji = parent.icon || '📁';
      for (const sub of parent.children ?? []) {
        if (sub.name.toLowerCase().includes(q)) {
          results.push({
            id: String(sub.id),
            name: sub.name,
            emoji: sub.icon || parentEmoji,
            type: 'subcategory',
            parentId: String(parent.id),
            parentName: parent.name,
            categoryIcon: parentEmoji,
          });
        }
      }
    }
    return results.slice(0, 20);
  }, [searchQuery, normalizedCategories, categoryTree]);

  const isLikelyOpen = (hours: string | null): boolean | null => {
    if (!hours) return null;
    const now = new Date();
    const currentHour = now.getHours();
    if (hours.toLowerCase().includes("24 hours") || hours.toLowerCase().includes("24/7"))
      return true;
    if (hours.toLowerCase().includes("closed")) return false;
    return currentHour >= 9 && currentHour <= 21;
  };

  const handleScroll = useCallback((e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const paddingToBottom = 320;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
    }
  }, []);

  return (
    <View className="flex-1 bg-background">
      {/* ── Zomato/Swiggy-style location header ── */}
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
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "#ef444415",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MapPin size={18} color="#ef4444" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: colors.mutedForeground, fontWeight: "500", marginBottom: 1 }}>
            {isManual ? "Selected city" : "Your location"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Text
              style={{ fontSize: 17, fontWeight: "800", color: permissionDenied && !globalCity ? colors.mutedForeground : colors.foreground, flexShrink: 1 }}
              numberOfLines={1}
            >
              {locationLoading ? "Detecting..." : (globalCity ?? (permissionDenied ? "Tap to set location" : "Select City"))}
            </Text>
            <ChevronDown size={16} color={colors.foreground} />
          </View>
        </View>
        {globalState && !locationLoading ? (
          <View
            style={{
              backgroundColor: colors.muted,
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 3,
              maxWidth: 100,
            }}
          >
            <Text style={{ fontSize: 10, color: colors.mutedForeground, fontWeight: "600" }} numberOfLines={1}>
              {globalState}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <LocationPickerModal
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
      />

      <ScrollView
        className="bg-background"
        contentContainerStyle={{ paddingBottom: 16 }}
        onScroll={handleScroll}
        scrollEventThrottle={200}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2463eb"]} tintColor="#2463eb" />
        }
      >
      <View className="px-4 pt-1">
        {/* Credits badge — always visible when logged in */}
        {user && (
          <Pressable
            onPress={() => navigation.navigate("Credits")}
            className="mt-1 rounded-xl border border-border bg-card px-4 py-3 flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-2"> 
              <Text className="text-lg">🪙</Text>
              <Text className="text-sm font-semibold text-foreground">Credits: {credits}</Text>
            </View>
            <Text className="text-xs text-primary font-medium">View →</Text>
          </Pressable>
        )}

        <View className="mt-3">
          <View className="relative">
            <Search size={16} color={colors.mutedForeground} style={{ position: "absolute", left: 12, top: 12 }} />
            <TextInput
              ref={searchRef}
              placeholder="Search categories & subcategories..."
              value={searchQuery}
              onChangeText={(text) => setSearchQuery(text)}
              className="w-full rounded-xl border border-border bg-muted/50 py-2.5 pl-10 pr-20 text-sm text-foreground"
              placeholderTextColor={colors.mutedForeground}
            />
            <View style={{ position: "absolute", right: 8, top: 8, flexDirection: "row", gap: 6 }}>
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery("")}>
                  <X size={16} color={colors.mutedForeground} />
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => setShowFilters(!showFilters)}
                style={{
                  padding: 6,
                  borderRadius: 8,
                  backgroundColor: showFilters ? colors.primary : "transparent",
                }}
              >
                <SlidersHorizontal size={16} color={showFilters ? "#fff" : colors.mutedForeground} />
              </Pressable>
            </View>
          </View>
        </View>

        {showFilters && (
          <View className="mt-3">
            <View className="flex-row flex-wrap gap-2">
              <Text className="text-[10px] font-semibold text-muted-foreground">Min Rating:</Text>
              {[0, 3, 4, 5].map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setMinRating(r)}
                  className={`rounded-lg px-2 py-1 ${
                    minRating === r ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <Text className={`text-[11px] font-medium ${minRating === r ? "text-primary-foreground" : "text-muted-foreground"}`}>
                    {r === 0 ? "Any" : `${r}+`}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View className="flex-row flex-wrap gap-2 mt-2">
              <Text className="text-[10px] font-semibold text-muted-foreground">Distance:</Text>
              {[0, 5, 10, 25, 50].map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setMaxDistance(d)}
                  className={`rounded-lg px-2 py-1 ${
                    maxDistance === d ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <Text className={`text-[11px] font-medium ${maxDistance === d ? "text-primary-foreground" : "text-muted-foreground"}`}>
                    {d === 0 ? "Any" : `${d}km`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>

      {user && (myCards as any[]).length === 0 && !isLoadingMyCards && (
        <View className="mx-4 mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <Text className="text-sm font-bold text-foreground">Welcome to Instantly! 👋</Text>
          <Text className="mt-1 text-xs text-muted-foreground">
            Create your first digital business card to appear in the directory.
          </Text>
          <Button size="sm" className="mt-3 rounded-lg" onPress={() => navigation.navigate("CardCreate")}>
            <Plus size={14} color="#fff" /> Create Your Card
          </Button>
        </View>
      )}


      <View className="px-4 pt-4">
        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text className="text-lg font-bold text-foreground">Categories</Text>
            <ArrowRight size={16} color={colors.mutedForeground} />
          </View>
          {isBusiness && (
            <Pressable
              onPress={() => navigation.navigate("ChooseListingType")}
              style={{ backgroundColor: "#84cc16", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>Promote Business</Text>
            </Pressable>
          )}
        </View>

        <View className="flex-row flex-wrap justify-between gap-3">
          {searchQuery.trim().length >= 2 ? (
            suggestions.length === 0 ? (
              <Text className="text-sm text-muted-foreground py-4 text-center w-full">No results found</Text>
            ) : (
              suggestions.map((s) => (
                <Pressable
                  key={s.type + s.id}
                  onPress={() => {
                    setSearchQuery("");
                    if (s.type === 'subcategory' && s.parentName) {
                      navigation.navigate("SubcategoryDetail", { subcategory: s.name, categoryName: s.parentName, categoryIcon: s.categoryIcon || '📁' });
                    } else {
                      navigation.navigate("CategoryDetail", { id: s.id });
                    }
                  }}
                  className="items-center gap-1.5"
                  style={{ width: "22%" }}
                >
                  <View className="h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
                    <Text className="text-2xl">{s.emoji}</Text>
                  </View>
                  <Text className="text-[11px] font-medium text-foreground text-center" numberOfLines={2}>{s.name}</Text>
                  {s.type === 'subcategory' && (
                    <Text className="text-[9px] text-muted-foreground text-center" numberOfLines={1}>{s.parentName}</Text>
                  )}
                </Pressable>
              ))
            )
          ) : (isLoadingCategories || isFetchingCategories) ? (
            Array.from({ length: 8 }).map((_, idx) => (
              <View key={`cat-skel-${idx}`} className="items-center gap-1.5" style={{ width: "22%" }}>
                <Skeleton className="h-16 w-16 rounded-2xl" />
                <Skeleton className="h-3 w-14 rounded" />
              </View>
            ))
          ) : (
            displayedCategories.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => navigation.navigate("CategoryDetail", { id: cat.id })}
                className="items-center gap-1.5"
                style={{ width: "22%" }}
              >
                <View className="h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
                  <Text className="text-2xl">{cat.emoji}</Text>
                </View>
                <Text className="text-[11px] font-medium text-foreground text-center">{cat.name}</Text>
              </Pressable>
            ))
          )}
        </View>

        {!showAllCategories && !searchQuery.trim() && (
          <Pressable onPress={() => setShowAllCategories(true)} className="mt-3 items-center">
            <Text className="text-sm font-medium text-primary">Show all categories</Text>
          </Pressable>
        )}
      </View>


      <PromotedVouchers navigate={navigation} />
      <DealOfTheDaySection navigate={navigation} />
      <TrendingSection navigate={navigation} />

      {user && (
        <AIRecommendations
          user={user}
          favoriteIds={[]}
          userLocation={userLocation}
          navigate={navigation}
        />
      )}

      </ScrollView>

      {user && (myCards as any[]).length === 0 && (
      <Pressable
        onPress={() => navigation.navigate("CardCreate")}
        style={{
          position: "absolute",
          right: 16,
          bottom: 20,
          height: 56,
          width: 56,
          borderRadius: 28,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: colors.primary,
          shadowOpacity: 0.3,
          shadowRadius: 10,
        }}
      >
        <Plus size={22} color="#fff" />
      </Pressable>
      )}
    </View>
  );
};

const DealOfTheDaySection = ({ navigate }: { navigate: any }) => {
  const { data: deal } = useDealOfTheDay();
  if (!deal) return null;

  const discountPct = Math.round(
    ((deal.original_price - deal.discounted_price) / deal.original_price) * 100
  );

  return (
    <View className="px-4 mt-5">
      <Pressable
        onPress={() => navigate.navigate("VoucherDetail", { id: deal.id })}
        className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4"
      >
        <View className="flex-row items-center gap-2 mb-2">
          <Gift size={18} color={colors.primary} />
          <Text className="text-sm font-bold text-foreground">Deal of the Day</Text>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <View className="rounded-full bg-destructive/10 px-2 py-0.5">
              <Text className="text-xs font-bold text-destructive">{discountPct}% OFF</Text>
            </View>
          </View>
        </View>
        <Text className="text-base font-bold text-foreground">{deal.title}</Text>
        {deal.subtitle && (
          <Text className="text-xs text-muted-foreground mt-1">{deal.subtitle}</Text>
        )}
        <View className="flex-row items-center gap-3 mt-2">
          <Text className="text-lg font-bold text-primary">₹{deal.discounted_price}</Text>
          <Text className="text-sm text-muted-foreground line-through">₹{deal.original_price}</Text>
        </View>
        <Button size="sm" className="mt-3 rounded-xl">
          <Gift size={14} color="#fff" /> Grab This Deal
        </Button>
      </Pressable>
    </View>
  );
};

const TrendingSection = ({ navigate }: { navigate: any }) => {
  const { data: trending = [], isLoading } = useTrendingBusinesses();
  if (isLoading || trending.length === 0) return null;

  return (
    <View className="px-4 mt-5">
      <View className="flex-row items-center gap-2 mb-3">
        <TrendingUp size={16} color={colors.primary} />
        <Text className="text-sm font-bold text-foreground">Trending Now</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-3">
          {trending.slice(0, 8).map((card: any, i: number) => (
            <Pressable
              key={card.id}
              onPress={() => navigate.navigate("BusinessDetail", { id: card.id })}
              className="w-44 rounded-xl border border-border bg-card p-3"
            >
              <View className="flex-row items-center gap-2 mb-2">
                <View className="h-8 w-8 items-center justify-center rounded-lg bg-primary/10 overflow-hidden">
                  {card.logo_url ? (
                    <Image source={{ uri: card.logo_url }} style={{ height: "100%", width: "100%" }} />
                  ) : (
                    <Text>🏢</Text>
                  )}
                </View>
                <View className="rounded-full bg-primary/10 px-2 py-0.5">
                  <Text className="text-[10px] font-bold text-primary">#{i + 1}</Text>
                </View>
              </View>
              <Text className="text-xs font-bold text-foreground" numberOfLines={1}>
                {card.full_name}
              </Text>
              <Text className="text-[10px] text-muted-foreground" numberOfLines={1}>
                {card.category}
              </Text>
              <Text className="text-[10px] text-muted-foreground mt-1">
                👁 {card.viewCount} views this week
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const AIRecommendations = ({
  user,
  favoriteIds,
  userLocation,
  navigate,
}: {
  user: any;
  favoriteIds: string[];
  userLocation: any;
  navigate: any;
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ai-recommendations", user?.id, favoriteIds.length],
    queryFn: async () => {
      if (!SUPABASE_CONFIG_OK) return [];
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        "ai-recommendations",
        {
          body: {
            userId: user.id,
            favoriteIds,
            location: userLocation
              ? { lat: userLocation.latitude, lng: userLocation.longitude }
              : null,
            recentCategories: [],
          },
        }
      );
      if (fnError) throw fnError;
      return fnData?.recommendations || [];
    },
    enabled: !!user && SUPABASE_CONFIG_OK,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <View className="px-4 mt-4">
        <View className="flex-row items-center gap-2 mb-3">
          <Sparkles size={16} color={colors.primary} />
          <Text className="text-sm font-bold text-foreground">AI Recommendations</Text>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <ActivityIndicator size="small" color={colors.mutedForeground} />
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-36 w-56 rounded-xl" />
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!data || data.length === 0 || error) return null;

  return (
    <View className="px-4 mt-4">
      <View className="flex-row items-center gap-2 mb-3">
        <Sparkles size={16} color={colors.primary} />
        <Text className="text-sm font-bold text-foreground">Recommended for You</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-3">
          {data.map((rec: any, i: number) => {
            const card = rec.card;
            if (!card) return null;
            return (
              <Pressable
                key={card.id}
                onPress={() => navigate.navigate("BusinessDetail", { id: card.id })}
                className="w-56 rounded-xl border border-primary/20 bg-primary/5 p-3.5"
              >
                <View className="flex-row items-center gap-2.5 mb-2">
                  <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary/10 overflow-hidden">
                    {card.logo_url ? (
                      <Image source={{ uri: card.logo_url }} style={{ height: "100%", width: "100%" }} />
                    ) : (
                      <Text className="text-lg">🏢</Text>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
                      {card.full_name}
                    </Text>
                    <Text className="text-[10px] text-muted-foreground" numberOfLines={1}>
                      {card.category}
                    </Text>
                  </View>
                </View>
                <Text className="text-[11px] text-muted-foreground" numberOfLines={2}>
                  {rec.reason}
                </Text>
                {card.location && (
                  <View className="mt-2 flex-row items-center gap-1">
                    <MapPin size={12} color={colors.mutedForeground} />
                    <Text className="text-[10px] text-muted-foreground">{card.location}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const PromotedVouchers = ({ navigate }: { navigate: any }) => {
  const { data: vouchers = [], isLoading } = useVouchers();
  const featured = vouchers.filter((v) => v.status === "active").slice(0, 6);

  if (isLoading || featured.length === 0) return null;

  return (
    <View className="px-4 mt-5">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Ticket size={16} color={colors.primary} />
          <Text className="text-sm font-bold text-foreground">Hot Deals & Vouchers</Text>
        </View>
        <Pressable onPress={() => navigate.navigate("Vouchers")}>
          <Text className="text-xs font-medium text-primary">View All</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-3">
          {featured.map((v: any) => (
            <Pressable
              key={v.id}
              onPress={() => navigate.navigate("VoucherDetail", { id: v.id })}
              className="w-48 rounded-xl border border-border bg-card p-3"
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-2xl">🎁</Text>
                {v.discount_label && (
                  <View className="rounded-full bg-destructive/10 px-2 py-0.5">
                    <Text className="text-[10px] font-bold text-destructive">
                      {v.discount_label}
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-xs font-bold text-foreground" numberOfLines={2}>
                {v.title}
              </Text>
              <View className="flex-row items-center gap-2 mt-2">
                <Text className="text-sm font-bold text-primary">₹{v.discounted_price}</Text>
                <Text className="text-[10px] text-muted-foreground line-through">₹{v.original_price}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default Index;

