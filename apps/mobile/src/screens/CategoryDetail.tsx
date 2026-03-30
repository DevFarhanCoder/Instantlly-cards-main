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

  const getSubcategoryIcon = (subcategory: string): string => {
    const name = subcategory.toLowerCase();
    
    // AC & Appliances
    if (name.includes('ac service') || name.includes('air condition')) return '❄️';
    if (name.includes('ac repair')) return '🛠️';
    if (name.includes('ac installation')) return '🔧';
    if (name.includes('ac amc') || name.includes('amc')) return '📋';
    if (name.includes('washing') || name.includes('washer')) return '🧺';
    if (name.includes('fridge') || name.includes('refrigerator')) return '🧊';
    if (name.includes('tv') || name.includes('television')) return '📺';
    if (name.includes('microwave')) return '🍳';
    if (name.includes('geyser') || name.includes('water heater')) return '♨️';
    if (name.includes('cooler') || name.includes('air cooler')) return '🌬️';
    if (name.includes('chimney')) return '💨';
    if (name.includes('oven')) return '🔥';
    if (name.includes('vending') || name.includes('machine')) return '🥤';
    if (name.includes('dealer') || name.includes('shop')) return '🏪';
    if (name.includes('24') || name.includes('hours') || name.includes('emergency')) return '🚨';
    
    // Construction & Renovation
    if (name.includes('carpenter') || name.includes('wood')) return '🪵';
    if (name.includes('plumb')) return '🚰';
    if (name.includes('electric') || name.includes('wiring')) return '💡';
    if (name.includes('paint') || name.includes('interior')) return '🎨';
    if (name.includes('tile') || name.includes('flooring')) return '🧱';
    if (name.includes('mason') || name.includes('brick')) return '🪨';
    if (name.includes('architect') || name.includes('design')) return '📐';
    if (name.includes('contractor')) return '👷';
    if (name.includes('waterproof') || name.includes('leak')) return '💧';
    if (name.includes('welding') || name.includes('fabrication')) return '⚙️';
    
    // Automotive
    if (name.includes('car wash') || name.includes('detailing')) return '🧼';
    if (name.includes('mechanic') || name.includes('auto repair')) return '🔧';
    if (name.includes('tyre') || name.includes('tire')) return '🛞';
    if (name.includes('battery')) return '🔋';
    if (name.includes('dent') || name.includes('paint')) return '🚗';
    if (name.includes('oil change') || name.includes('servicing')) return '🛢️';
    if (name.includes('towing')) return '🚙';
    if (name.includes('parking')) return '🅿️';
    if (name.includes('bike') || name.includes('motorcycle')) return '🏍️';
    
    // Food & Dining
    if (name.includes('restaurant') || name.includes('dining')) return '🍽️';
    if (name.includes('cafe') || name.includes('coffee')) return '☕';
    if (name.includes('bakery') || name.includes('cake')) return '🍰';
    if (name.includes('pizza')) return '🍕';
    if (name.includes('burger')) return '🍔';
    if (name.includes('chinese') || name.includes('noodle')) return '🍜';
    if (name.includes('indian') || name.includes('curry')) return '🍛';
    if (name.includes('sweet') || name.includes('dessert')) return '🍬';
    if (name.includes('ice cream')) return '🍦';
    if (name.includes('catering') || name.includes('tiffin')) return '🍱';
    if (name.includes('juice') || name.includes('smoothie')) return '🥤';
    if (name.includes('bar') || name.includes('pub')) return '🍺';
    
    // Health & Fitness
    if (name.includes('gym') || name.includes('fitness')) return '💪';
    if (name.includes('yoga')) return '🧘';
    if (name.includes('doctor') || name.includes('clinic')) return '🩺';
    if (name.includes('dental') || name.includes('dentist')) return '🦷';
    if (name.includes('physio') || name.includes('therapy')) return '🏥';
    if (name.includes('pharmacy') || name.includes('medicine')) return '💊';
    if (name.includes('hospital')) return '🏥';
    if (name.includes('lab') || name.includes('diagnostic')) return '🔬';
    if (name.includes('ayurved') || name.includes('homeopath')) return '🌿';
    if (name.includes('veterinary') || name.includes('pet')) return '🐾';
    if (name.includes('protein') || name.includes('supplement')) return '🥤';
    if (name.includes('cardio') || name.includes('aerobic')) return '🏃';
    if (name.includes('zumba') || name.includes('dance')) return '💃';
    if (name.includes('crossfit') || name.includes('strength')) return '🏋️';
    if (name.includes('personal train') || name.includes('pt')) return '🎯';
    
    // Beauty & Wellness
    if (name.includes('bridal') || name.includes('bride')) return '👰';
    if (name.includes('groom') || name.includes('dulha')) return '🤵';
    if (name.includes('salon') || name.includes('hair') || name.includes('barber')) return '💇';
    if (name.includes('spa') || name.includes('massage')) return '💆';
    if (name.includes('makeup') || name.includes('beauty parlour')) return '💄';
    if (name.includes('nail') || name.includes('manicure') || name.includes('pedicure')) return '💅';
    if (name.includes('tattoo')) return '🎨';
    if (name.includes('piercing')) return '💎';
    if (name.includes('facial') || name.includes('face')) return '🧖';
    if (name.includes('wax') || name.includes('threading')) return '✨';
    if (name.includes('skin') || name.includes('derma')) return '🧴';
    if (name.includes('hygien')) return '🧼';
    if (name.includes('steam') || name.includes('sauna')) return '♨️';
    if (name.includes('pool') || name.includes('swim')) return '🏊';
    if (name.includes('weight') || name.includes('diet') || name.includes('nutrition')) return '🥗';
    if (name.includes('train') || name.includes('coach') || name.includes('instructor')) return '🏋️';
    if (name.includes('clean') || name.includes('sanitize') || name.includes('sanit')) return '✨';
    if (name.includes('accessible') || name.includes('access')) return '♿';
    if (name.includes('restroom') || name.includes('toilet') || name.includes('washroom')) return '🚻';
    if (name.includes('unisex')) return '⚥';
    if (name.includes('men') || name.includes('male') || name.includes('gents')) return '♂️';
    if (name.includes('women') || name.includes('female') || name.includes('ladies')) return '♀️';
    
    // Education & Training
    if (name.includes('school') || name.includes('coaching')) return '📚';
    if (name.includes('tutor') || name.includes('tuition')) return '✏️';
    if (name.includes('music') || name.includes('dance')) return '🎵';
    if (name.includes('computer') || name.includes('coding')) return '💻';
    if (name.includes('language') || name.includes('english')) return '🗣️';
    if (name.includes('drawing') || name.includes('art')) return '🖼️';
    if (name.includes('sports') || name.includes('cricket')) return '🏏';
    if (name.includes('driving')) return '🚗';
    
    // Technology & Electronics
    if (name.includes('mobile') || name.includes('phone')) return '📱';
    if (name.includes('laptop') || name.includes('computer')) return '💻';
    if (name.includes('software') || name.includes('web')) return '🌐';
    if (name.includes('cctv') || name.includes('security')) return '📹';
    if (name.includes('printer')) return '🖨️';
    if (name.includes('data') || name.includes('recovery')) return '💾';
    
    // Real Estate
    if (name.includes('apartment') || name.includes('flat')) return '🏢';
    if (name.includes('villa') || name.includes('bungalow')) return '🏡';
    if (name.includes('plot') || name.includes('land')) return '🗺️';
    if (name.includes('commercial') || name.includes('office')) return '🏢';
    if (name.includes('pg') || name.includes('hostel')) return '🛏️';
    
    // Business Services
    if (name.includes('ipo') || name.includes('public offer')) return '📊';
    if (name.includes('tender')) return '�';
    if (name.includes('income tax') || name.includes('tax return') || name.includes('itr')) return '📝';
    if (name.includes('demat') || name.includes('trading')) return '💹';
    if (name.includes('lakh') || name.includes('crore') || name.includes('budget')) return '💰';
    if (name.includes('false ceiling') || name.includes('ceiling')) return '👷';
    if (name.includes('investment') || name.includes('advisory') || name.includes('finance')) return '💼';
    if (name.includes('housekeep') || name.includes('maid')) return '🧹';
    if (name.includes('company') || name.includes('incorporation') || name.includes('registration')) return '🏢';
    if (name.includes('gst') || name.includes('tax filing')) return '🧾';
    if (name.includes('call centre') || name.includes('bpo') || name.includes('customer')) return '📞';
    if (name.includes('licence') || name.includes('permit')) return '📜';
    if (name.includes('consultant') || name.includes('business advisor')) return '💡';
    if (name.includes('lawyer') || name.includes('legal') || name.includes('advocate')) return '⚖️';
    if (name.includes('accountant') || name.includes('ca') || name.includes('audit')) return '🧮';
    if (name.includes('marketing') || name.includes('advertising') || name.includes('branding')) return '📢';
    if (name.includes('printing') || name.includes('xerox') || name.includes('photocopy')) return '🖨️';
    if (name.includes('courier') || name.includes('logistics') || name.includes('shipping')) return '📦';
    if (name.includes('insurance')) return '🛡️';
    if (name.includes('bank')) return '🏦';
    
    // Lifestyle & Entertainment
    if (name.includes('cinema') || name.includes('movie')) return '🎬';
    if (name.includes('photography') || name.includes('photo')) return '📸';
    if (name.includes('video') || name.includes('shoot')) return '🎥';
    if (name.includes('event') || name.includes('wedding')) return '🎉';
    if (name.includes('decoration') || name.includes('decor')) return '🎈';
    if (name.includes('florist') || name.includes('flower')) return '💐';
    if (name.includes('gift')) return '🎁';
    if (name.includes('travel') || name.includes('tour')) return '✈️';
    if (name.includes('hotel') || name.includes('resort')) return '🏨';
    
    // Fashion & Shopping
    if (name.includes('cloth') || name.includes('garment')) return '👔';
    if (name.includes('tailor') || name.includes('stitch')) return '🧵';
    if (name.includes('jewel') || name.includes('gold')) return '💍';
    if (name.includes('shoe') || name.includes('footwear')) return '👟';
    if (name.includes('bag') || name.includes('accessory')) return '👜';
    if (name.includes('watch')) return '⌚';
    
    // Agriculture & Farming
    if (name.includes('seed') || name.includes('plant')) return '🌱';
    if (name.includes('fertilizer') || name.includes('pesticide')) return '🧪';
    if (name.includes('tractor') || name.includes('equipment')) return '🚜';
    if (name.includes('dairy') || name.includes('milk')) return '🥛';
    if (name.includes('poultry') || name.includes('chicken')) return '🐔';
    if (name.includes('organic') || name.includes('vegetable')) return '🥬';
    
    // Cleaning & Maintenance
    if (name.includes('clean') || name.includes('housekeep')) return '🧹';
    if (name.includes('pest') || name.includes('termite')) return '🐛';
    if (name.includes('laundry') || name.includes('dry clean')) return '👕';
    if (name.includes('maid')) return '🧽';
    
    // General Services
    if (name.includes('installation') || name.includes('install')) return '⚙️';
    if (name.includes('repair')) return '🔨';
    if (name.includes('service')) return '🛎️';
    if (name.includes('home')) return '🏠';
    if (name.includes('visit')) return '🚶';
    if (name.includes('all')) return '🔍';
    
    // Broader category matches as fallbacks
    if (name.includes('offer') || name.includes('deal') || name.includes('discount')) return '🎁';
    if (name.includes('premium') || name.includes('vip') || name.includes('exclusive')) return '⭐';
    if (name.includes('new') || name.includes('latest')) return '🆕';
    if (name.includes('popular') || name.includes('trending')) return '🔥';
    if (name.includes('certified') || name.includes('verified')) return '✅';
    if (name.includes('expert') || name.includes('specialist')) return '🎓';
    if (name.includes('support')) return '🤝';
    if (name.includes('program') || name.includes('programme')) return '📋';
    if (name.includes('area') || name.includes('zone') || name.includes('location')) return '📍';
    if (name.includes('business') || name.includes('corporate')) return '💼';
    if (name.includes('profession')) return '👔';
    if (name.includes('shop') || name.includes('store')) return '🏪';
    if (name.includes('work') || name.includes('job')) return '🔧';
    if (name.includes('center') || name.includes('centre')) return '🏢';
    if (name.includes('agency') || name.includes('firm')) return '🏛️';
    if (name.includes('provider') || name.includes('supplier')) return '📦';
    if (name.includes('partner') || name.includes('associate')) return '🤝';
    
    // Default fallback - use category icon or generic service icon
    return category?.icon || '🔷';
  };

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
        <View className="px-4 pb-2 pt-3">
          <View className="flex-row items-center gap-2">
            <Pressable onPress={() => navigation.goBack()}>
              <ArrowLeft size={20} color="#111827" />
            </Pressable>
            <Text className="text-2xl">{category?.icon || "📁"}</Text>
            <Text className="text-xl font-bold text-foreground">{category?.name || "Category"}</Text>
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

        {subcategories.length > 0 && (
          <ScrollView 
            className="px-4 pb-3" 
            style={{ maxHeight: 320 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="flex-row flex-wrap gap-2">
              {subcategories.map((sub, index) => {
                const bgColors = [
                  "bg-pink-50",
                  "bg-amber-50", 
                  "bg-emerald-50",
                  "bg-cyan-50",
                  "bg-purple-50",
                  "bg-rose-50",
                  "bg-orange-50",
                  "bg-teal-50"
                ];
                const selectedBgColors = [
                  "bg-pink-500",
                  "bg-amber-500", 
                  "bg-emerald-500",
                  "bg-cyan-500",
                  "bg-purple-500",
                  "bg-rose-500",
                  "bg-orange-500",
                  "bg-teal-500"
                ];
                const bgColor = bgColors[index % bgColors.length];
                const selectedBg = selectedBgColors[index % selectedBgColors.length];
                
                return (
                  <Pressable
                    key={sub}
                    onPress={() => setSelectedSubcategory(sub)}
                    style={{ width: '23%' }}
                    className={`rounded-xl px-1.5 py-2.5 items-center ${
                      selectedSubcategory === sub ? selectedBg : bgColor
                    }`}
                  >
                    <View className="w-14 h-14 rounded-lg items-center justify-center mb-1.5 bg-white/60">
                      <Text className="text-2xl">{getSubcategoryIcon(sub)}</Text>
                    </View>
                    <Text 
                      className={`text-[9px] text-center ${
                        selectedSubcategory === sub ? "text-white" : "text-gray-800"
                      }`}
                      numberOfLines={2}
                    >
                      {sub}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}
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
        contentContainerStyle={{ paddingBottom: 16 }}
        className="px-4 py-4"
        onScroll={handleScroll}
        scrollEventThrottle={200}
      >
        {isLoading ? (
          <View className="gap-3">
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

            <View className="gap-3">
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

