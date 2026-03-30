import { useEffect, useMemo } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Badge } from "../ui/badge";
import { colors } from "../../theme/colors";
import { useActiveAds, useRecordImpression, useRecordClick } from "../../hooks/useActiveAds";

interface SponsoredCardSlotProps {
  /** Max number of sponsored cards to show */
  limit?: number;
}

const SponsoredCardSlot = ({ limit = 2 }: SponsoredCardSlotProps) => {
  const { data: ads = [] } = useActiveAds("sponsored");
  const navigation = useNavigation<any>();
  const recordClick = useRecordClick();

  const visibleAds = useMemo(() => ads.slice(0, limit), [ads, limit]);

  // Track impression for first visible ad
  useRecordImpression(visibleAds[0]?.id);

  if (visibleAds.length === 0) return null;

  return (
    <View className="px-4 mt-2 gap-3">
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
            className="rounded-2xl border border-border bg-card p-4"
          >
            <View className="flex-row items-start gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={{ height: "100%", width: "100%" }} />
                ) : (
                  <Text className="text-2xl">💳</Text>
                )}
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
                  {ad.title}
                </Text>
                {ad.description && (
                  <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={2}>
                    {ad.description}
                  </Text>
                )}
              </View>
              <Badge className="bg-muted text-muted-foreground text-[9px] border-none">
                Sponsored
              </Badge>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

export default SponsoredCardSlot;
