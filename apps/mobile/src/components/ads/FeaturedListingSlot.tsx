import { useMemo } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Star } from "lucide-react-native";
import { Badge } from "../ui/badge";
import { useActiveAds, useRecordImpression, useRecordClick } from "../../hooks/useActiveAds";

interface FeaturedListingSlotProps {
  limit?: number;
}

const FeaturedListingSlot = ({ limit = 2 }: FeaturedListingSlotProps) => {
  const { data: ads = [] } = useActiveAds("featured");
  const navigation = useNavigation<any>();
  const recordClick = useRecordClick();

  const visibleAds = useMemo(() => ads.slice(0, limit), [ads, limit]);

  useRecordImpression(visibleAds[0]?.id);

  if (visibleAds.length === 0) return null;

  return (
    <View className="px-4 mt-3 mb-1">
      <View className="flex-row items-center gap-1.5 mb-2">
        <Star size={14} color="#f59e0b" />
        <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Featured
        </Text>
      </View>
      <View className="gap-2">
        {visibleAds.map((ad) => {
          const imageUrl = ad.creative_url || ad.creative_urls?.[0];
          return (
            <Pressable
              key={ad.id}
              onPress={() => {
                recordClick(ad.id);
                if (ad.business_card_id) {
                  navigation.navigate("BusinessDetail", { id: String(ad.business_card_id) });
                }
              }}
              className="flex-row items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3"
            >
              <View className="h-10 w-10 items-center justify-center rounded-lg bg-white overflow-hidden">
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={{ height: "100%", width: "100%" }} />
                ) : (
                  <Text className="text-xl">⭐</Text>
                )}
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                  {ad.title}
                </Text>
                {ad.description && (
                  <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                    {ad.description}
                  </Text>
                )}
              </View>
              <Badge className="bg-primary/10 text-primary text-[9px] border-none">
                Ad
              </Badge>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

export default FeaturedListingSlot;
