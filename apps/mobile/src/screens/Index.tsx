import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowRight,
  CalendarDays,
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
  Zap,
} from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { categories } from "../data/categories";
import { useNetworkCards } from "../hooks/useContactSync";
import { useFavorites } from "../contexts/FavoritesContext";
import { useDirectoryCards } from "../hooks/useDirectoryCards";
import { useAuth } from "../hooks/useAuth";
import { useUserRole } from "../hooks/useUserRole";
import { useUserLocation, getDistanceKm, formatDistance } from "../hooks/useUserLocation";
import { useTrendingBusinesses } from "../hooks/useTrendingBusinesses";
import { useDealOfTheDay } from "../hooks/useDealOfTheDay";
import { supabase } from "../integrations/supabase/client";
import { colors } from "../theme/colors";

type ServiceMode = "all" | "home" | "visit";

const Index = () => {
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceMode, setServiceMode] = useState<ServiceMode>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [maxDistance, setMaxDistance] = useState(0);
  const searchRef = useRef<TextInput>(null);
  const navigation = useNavigation<any>();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { data: allCards = [], isLoading } = useDirectoryCards();
  const { data: networkCards = [], isLoading: isLoadingNetwork } = useNetworkCards();
  const userLocation = useUserLocation();
  const { user } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();

  useEffect(() => {
    if (!roleLoading && isAdmin) {
      navigation.replace("AdminDashboard");
    }
  }, [isAdmin, roleLoading, navigation]);

  const { data: sponsoredCampaigns = [] } = useQuery({
    queryKey: ["sponsored-ads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("*, business_cards!ad_campaigns_business_card_id_fkey(*)")
        .in("ad_type", ["featured", "sponsored"])
        .eq("status", "active")
        .eq("approval_status", "approved")
        .not("business_card_id", "is", null);
      if (error) throw error;
      return data || [];
    },
  });

  const displayedCategories = showAllCategories ? categories : categories.slice(0, 8);

  const suggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    const matches = new Set<string>();

    allCards.forEach((card: any) => {
      if (card.full_name?.toLowerCase().includes(q)) matches.add(card.full_name);
      if (card.company_name?.toLowerCase().includes(q)) matches.add(card.company_name);
      if (card.category?.toLowerCase().includes(q)) matches.add(card.category);
      if (card.location?.toLowerCase().includes(q)) matches.add(card.location);
      (card.services || []).forEach((s: string) => {
        if (s.toLowerCase().includes(q)) matches.add(s);
      });
    });

    return Array.from(matches).slice(0, 6);
  }, [searchQuery, allCards]);

  const isLikelyOpen = (hours: string | null): boolean | null => {
    if (!hours) return null;
    const now = new Date();
    const currentHour = now.getHours();
    if (hours.toLowerCase().includes("24 hours") || hours.toLowerCase().includes("24/7"))
      return true;
    if (hours.toLowerCase().includes("closed")) return false;
    return currentHour >= 9 && currentHour <= 21;
  };

  const filteredCards = useMemo(() => {
    let cards = allCards.filter((card: any) => {
      if (serviceMode === "home" && card.service_mode !== "home" && card.service_mode !== "both")
        return false;
      if (serviceMode === "visit" && card.service_mode !== "visit" && card.service_mode !== "both")
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          card.full_name.toLowerCase().includes(q) ||
          card.company_name?.toLowerCase().includes(q) ||
          card.category?.toLowerCase().includes(q) ||
          card.location?.toLowerCase().includes(q) ||
          (card.services || []).some((s: string) => s.toLowerCase().includes(q)) ||
          card.keywords?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (maxDistance > 0 && userLocation && card.latitude && card.longitude) {
        const dist = getDistanceKm(
          userLocation.latitude,
          userLocation.longitude,
          card.latitude,
          card.longitude
        );
        if (dist > maxDistance) return false;
      }
      return true;
    });

    return cards;
  }, [allCards, searchQuery, serviceMode, minRating, maxDistance, userLocation]);

  const displayCards = useMemo(() => {
    const networkIds = new Set(networkCards.map((c: any) => c.id));
    const directoryOnly = filteredCards.filter((c: any) => !networkIds.has(c.id));
    return [
      ...networkCards.map((c: any) => ({ ...c, _isNetwork: true })),
      ...directoryOnly,
    ];
  }, [filteredCards, networkCards]);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="bg-background"
        contentContainerStyle={{ paddingBottom: 260 }}
      >
      <View className="px-4 pt-4">
        <View className="flex-row gap-2">
          {([
            { value: "all" as ServiceMode, label: "All", icon: "🔍" },
            { value: "home" as ServiceMode, label: "Home Services", icon: "🏠" },
            { value: "visit" as ServiceMode, label: "Visit Business", icon: "🏪" },
          ]).map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setServiceMode(opt.value)}
              className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 ${
                serviceMode === opt.value
                  ? "bg-primary"
                  : "bg-muted/60"
              }`}
            >
              <Text className={`text-xs font-semibold ${serviceMode === opt.value ? "text-primary-foreground" : "text-muted-foreground"}`}>
                {opt.icon} {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="mt-3">
          <View className="relative">
            <Search size={16} color={colors.mutedForeground} style={{ position: "absolute", left: 12, top: 12 }} />
            <TextInput
              ref={searchRef}
              placeholder="Search businesses, services, location..."
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full rounded-xl border border-border bg-muted/50 py-2.5 pl-10 pr-20 text-sm text-foreground"
              placeholderTextColor={colors.mutedForeground}
            />
            <View style={{ position: "absolute", right: 8, top: 8, flexDirection: "row", gap: 6 }}>
              {searchQuery ? (
                <Pressable onPress={() => { setSearchQuery(""); setShowSuggestions(false); }}>
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

          {showSuggestions && suggestions.length > 0 && (
            <View className="mt-2 rounded-xl border border-border bg-card">
              {suggestions.map((s, i) => (
                <Pressable
                  key={i}
                  onPress={() => { setSearchQuery(s); setShowSuggestions(false); }}
                  className="flex-row items-center gap-2 px-4 py-2"
                >
                  <Search size={14} color={colors.mutedForeground} />
                  <Text className="text-sm text-foreground">{s}</Text>
                </Pressable>
              ))}
            </View>
          )}
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

      {user && allCards.length === 0 && !isLoading && (
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
          <Button size="sm" className="rounded-lg bg-accent px-4" onPress={() => navigation.navigate("ChooseListingType")}>
            Promote Business
          </Button>
        </View>

        <View className="flex-row flex-wrap justify-between gap-3">
          {displayedCategories.map((cat, i) => (
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
          ))}
        </View>

        {!showAllCategories && (
          <Pressable onPress={() => setShowAllCategories(true)} className="mt-3 items-center">
            <Text className="text-sm font-medium text-primary">Show all categories</Text>
          </Pressable>
        )}
      </View>


      <PromotedVouchers navigate={navigation} />
      <DealOfTheDaySection navigate={navigation} />
      <TrendingSection navigate={navigation} />
      {sponsoredCampaigns.length > 0 && (
        <View className="px-4 mt-4">
          <View className="flex-row items-center gap-2 mb-2">
            <Zap size={16} color="#f59e0b" />
            <Text className="text-sm font-bold text-foreground">Sponsored</Text>
          </View>
          {sponsoredCampaigns.map((campaign: any) => {
            const card = campaign.business_cards;
            if (!card) return null;
            return (
              <Pressable
                key={campaign.id}
                onPress={() => navigation.navigate("BusinessDetail", { id: card.id })}
                className="rounded-2xl border border-border bg-card p-4 mb-3"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-row items-start gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
                      {card.logo_url ? (
                        <Image source={{ uri: card.logo_url }} style={{ height: "100%", width: "100%" }} />
                      ) : (
                        <Text>🏢</Text>
                      )}
                    </View>
                    <View>
                      <Text className="text-base font-bold text-foreground">{card.full_name}</Text>
                      <View className="flex-row items-center gap-2 mt-1">
                        {card.category && <Text className="text-xs text-muted-foreground">{card.category}</Text>}
                        <View className="rounded-full bg-amber-100 px-2 py-0.5">
                          <Text className="text-[10px] font-semibold text-amber-700">Sponsored</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
                {campaign.description && (
                  <Text className="mt-2 text-xs text-muted-foreground">{campaign.description}</Text>
                )}
                {card.location && (
                  <View className="mt-2 flex-row items-center gap-2">
                    <MapPin size={14} color={colors.mutedForeground} />
                    <Text className="text-xs text-muted-foreground">{card.location}</Text>
                  </View>
                )}
                <View className="mt-3 flex-row gap-2">
                  <Button size="sm" className="flex-1 rounded-lg" onPress={() => Linking.openURL(`tel:${card.phone}`)}>
                    <Phone size={14} color="#fff" /> Call
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 rounded-lg" onPress={() => navigation.navigate("Messaging")}>
                    <MessageCircle size={14} color={colors.foreground} /> Message
                  </Button>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {user && (
        <AIRecommendations
          user={user}
          favoriteIds={allCards.filter((c: any) => isFavorite(c.id)).map((c: any) => c.id)}
          userLocation={userLocation}
          navigate={navigation}
        />
      )}

      <View className="my-5 flex-row items-center gap-3 px-4">
        <View className="h-px flex-1 bg-border" />
        <Text className="text-base font-bold text-foreground">My Network Business Cards</Text>
        <View className="h-px flex-1 bg-border" />
      </View>

      <View className="px-4 pb-6">
        {(isLoading || isLoadingNetwork) ? (
          <>
            <Skeleton className="h-40 w-full rounded-2xl mb-3" />
            <Skeleton className="h-40 w-full rounded-2xl mb-3" />
          </>
        ) : displayCards.length === 0 ? (
          <View className="items-center py-12">
            <Text className="text-4xl mb-2">📭</Text>
            <Text className="text-sm text-muted-foreground">
              {searchQuery ? "No businesses match your search" : "No business cards yet"}
            </Text>
          </View>
        ) : (
          displayCards.map((card: any) => {
            const openStatus = isLikelyOpen(card.business_hours);
            const isNetworkCard = card._isNetwork === true;
            return (
              <Pressable
                key={card.id}
                onPress={() => navigation.navigate("BusinessDetail", { id: card.id })}
                className="mb-3 rounded-2xl border border-border bg-card p-4"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-row items-start gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
                      {card.logo_url ? (
                        <Image source={{ uri: card.logo_url }} style={{ height: "100%", width: "100%" }} />
                      ) : (
                        <Text>🏢</Text>
                      )}
                    </View>
                    <View>
                      <View className="flex-row items-center gap-1">
                        <Text className="text-base font-bold text-foreground">{card.full_name}</Text>
                        {(card as any).is_verified && (
                          <ShieldCheck size={14} color={colors.primary} />
                        )}
                      </View>
                      <View className="flex-row flex-wrap items-center gap-2 mt-1">
                        {card.category && <Text className="text-xs text-muted-foreground">{card.category}</Text>}
                        {card.service_mode && (
                          <Text className="text-[10px] font-semibold text-muted-foreground">
                            {card.service_mode === "home" ? "🏠 Home Service" : card.service_mode === "both" ? "🔁 Home & Visit" : "🏪 Visit"}
                          </Text>
                        )}
                        {openStatus !== null && (
                          <Text className="text-[10px] font-semibold text-muted-foreground">
                            {openStatus ? "Open" : "Closed"}
                          </Text>
                        )}
                        {isNetworkCard && (
                          <Text className="text-[10px] font-semibold text-muted-foreground">👥 Friend</Text>
                        )}
                      </View>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => toggleFavorite(card.id)}
                    style={{ padding: 4 }}
                  >
                    <Heart
                      size={16}
                      color={isFavorite(card.id) ? colors.destructive : colors.mutedForeground}
                      fill={isFavorite(card.id) ? colors.destructive : "transparent"}
                    />
                  </Pressable>
                </View>

                {card.location && (
                  <View className="mt-2 flex-row items-center gap-2">
                    <MapPin size={14} color={colors.mutedForeground} />
                    <Text className="text-xs text-muted-foreground flex-1">{card.location}</Text>
                    {userLocation && card.latitude && card.longitude && (
                      <View className="rounded-full bg-primary/10 px-2 py-0.5">
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
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    {card.services.map((s: string) => (
                      <View key={s} className="rounded-md bg-muted px-2 py-1">
                        <Text className="text-[11px] font-medium text-muted-foreground">{s}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View className="mt-3 flex-row gap-2">
                  <Button
                    size="sm"
                    className="flex-1 rounded-lg"
                    onPress={() => Linking.openURL(`tel:${card.phone}`)}
                  >
                    <Phone size={14} color="#fff" /> Call
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 rounded-lg"
                    onPress={() => navigation.navigate("Messaging")}
                  >
                    <MessageCircle size={14} color={colors.foreground} /> Message
                  </Button>
                </View>
              </Pressable>
            );
          })
        )}
      </View>

      </ScrollView>

      <Pressable
        onPress={() => navigation.navigate("CardCreate")}
        style={{
          position: "absolute",
          right: 16,
          bottom: 140,
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
    enabled: !!user,
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
  const { data: vouchers = [], isLoading } = useQuery({
    queryKey: ["promoted-vouchers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .eq("status", "active")
        .eq("is_popular", true)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || vouchers.length === 0) return null;

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
          {vouchers.map((v: any) => (
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

