import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft } from "lucide-react-native";
import { Skeleton } from "../components/ui/skeleton";
import { useListMobileCategoriesQuery, useGetMobileSubcategoriesQuery } from "../store/api/categoriesApi";
import type { MobileSubcategoryItem } from "../store/api/categoriesApi";

const CategoryDetail = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id = route.params?.id as string | undefined;
  const categoryId = Number(id);
  const categoryName = route.params?.name as string | undefined;
  const categoryIcon = route.params?.icon as string | undefined;

  const { data: categoryData = [], refetch: refetchCats } = useListMobileCategoriesQuery();
  const category = categoryData.find((c) => String(c.id) === String(categoryId));

  const displayName = categoryName || category?.name || "Category";
  const displayIcon = categoryIcon || category?.icon || "📁";

  const { data: subcategoryResponse, isLoading: isLoadingSubs, refetch: refetchSubs } = useGetMobileSubcategoriesQuery(
    { id: categoryId, page: 1, limit: 200 },
    { skip: !categoryId }
  );

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await Promise.all([refetchCats(), refetchSubs()]); } finally { setRefreshing(false); }
  }, [refetchCats, refetchSubs]);
  const subcategories: MobileSubcategoryItem[] = subcategoryResponse?.data?.subcategories ?? [];

  const handleSubcategoryPress = (sub: MobileSubcategoryItem) => {
    if (sub.child_count > 0 && sub.id) {
      // Has children — drill deeper into another CategoryDetail
      navigation.push("CategoryDetail", {
        id: String(sub.id),
        name: sub.name,
        icon: sub.icon || displayIcon,
      });
    } else {
      // Leaf node — show business cards
      navigation.navigate("SubcategoryDetail", {
        subcategory: sub.name,
        categoryName: displayName,
        categoryIcon: displayIcon,
      });
    }
  };

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

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card">
        <View className="px-4 pb-3 pt-3">
          <View className="flex-row items-center gap-2">
            <Pressable onPress={() => navigation.goBack()}>
              <ArrowLeft size={20} color="#111827" />
            </Pressable>
            <Text className="text-2xl">{displayIcon}</Text>
            <Text className="text-xl font-bold text-foreground">{displayName}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 16 }}
        className="px-4 py-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2463eb"]} tintColor="#2463eb" />
        }
      >
        <Text className="text-sm font-semibold text-foreground mb-3">
          Select a Subcategory
        </Text>

        {isLoadingSubs ? (
          <View className="flex-row flex-wrap gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <View key={`sub-skel-${i}`} style={{ width: '23%' }} className="items-center py-2">
                <Skeleton className="h-11 w-11 rounded-lg mb-1" />
                <Skeleton className="h-2 w-12 rounded" />
              </View>
            ))}
          </View>
        ) : subcategories.length > 0 ? (
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
              const bgColor = bgColors[index % bgColors.length];

              return (
                <Pressable
                  key={sub.id ?? sub.name}
                  onPress={() => handleSubcategoryPress(sub)}
                  style={{ width: '23%' }}
                  className={`rounded-xl px-1 py-2 items-center ${bgColor}`}
                >
                  <View className="w-11 h-11 rounded-lg items-center justify-center mb-1 bg-white/60">
                    <Text className="text-xl">{sub.icon || getSubcategoryIcon(sub.name)}</Text>
                  </View>
                  <Text
                    className="text-[11px] text-center text-gray-800 font-medium"
                    numberOfLines={2}
                  >
                    {sub.name}
                  </Text>
                  {sub.child_count > 0 && (
                    <Text className="text-[9px] text-gray-400 mt-0.5">{sub.child_count} sub</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View className="items-center py-16">
            <Text className="text-5xl mb-3">📭</Text>
            <Text className="text-base font-semibold text-foreground mb-1">No Subcategories</Text>
            <Text className="text-sm text-muted-foreground text-center px-8">
              This category doesn't have any subcategories yet
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default CategoryDetail;

