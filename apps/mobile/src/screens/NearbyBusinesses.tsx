import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MapPin, MessageCircle, Navigation, Phone } from "lucide-react-native";
import { useDirectoryCards } from "../hooks/useDirectoryCards";
import { useUserLocation, getDistanceKm, formatDistance } from "../hooks/useUserLocation";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { colors } from "../theme/colors";
import { Linking } from "react-native";

const NearbyBusinesses = () => {
  const navigation = useNavigation<any>();
  const userLocation = useUserLocation();
  const { data: cards = [], isLoading } = useDirectoryCards();
  const [maxKm, setMaxKm] = useState(50);

  const sorted = useMemo(() => {
    if (!userLocation) return cards.filter((c) => c.latitude && c.longitude);
    return cards
      .filter((c) => c.latitude && c.longitude)
      .map((c) => ({
        ...c,
        distance: getDistanceKm(
          userLocation.latitude,
          userLocation.longitude,
          c.latitude!,
          c.longitude!
        ),
      }))
      .filter((c) => (c as any).distance <= maxKm)
      .sort((a, b) => (a as any).distance - (b as any).distance);
  }, [cards, userLocation, maxKm]);

  return (
    <View className="flex-1 bg-background">
      <View className="bg-card border-b border-border px-4 py-4">
        <View className="flex-row items-center gap-2">
          <Navigation size={18} color={colors.primary} />
          <Text className="text-lg font-bold text-foreground">Nearby Businesses</Text>
        </View>
        {!userLocation && (
          <Text className="text-xs text-muted-foreground mt-1">
            Enable location to see distances
          </Text>
        )}
      </View>

      <View className="px-4 py-3 flex-row gap-2">
        {[5, 10, 25, 50].map((km) => (
          <Button
            key={km}
            size="sm"
            variant={maxKm === km ? "default" : "outline"}
            onPress={() => setMaxKm(km)}
            className="text-xs"
          >
            {km} km
          </Button>
        ))}
      </View>

      {isLoading ? (
        <View className="items-center py-16">
          <Text className="text-sm text-muted-foreground">Loading...</Text>
        </View>
      ) : sorted.length === 0 ? (
        <View className="items-center py-16 px-4">
          <MapPin size={48} color={colors.mutedForeground} />
          <Text className="text-muted-foreground text-sm mt-3">
            No businesses found within {maxKm} km
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 260 }} className="px-4">
          <View className="space-y-3">
            {sorted.map((card: any) => (
              <Pressable
                key={card.id}
                onPress={() => navigation.navigate("BusinessDetail", { id: card.id })}
                className="bg-card border border-border rounded-xl p-4 flex-row gap-3"
              >
                <View className="h-12 w-12 rounded-full bg-primary/10 items-center justify-center overflow-hidden">
                  {card.logo_url ? (
                    <Image source={{ uri: card.logo_url }} style={{ height: 48, width: 48, borderRadius: 24 }} />
                  ) : (
                    <Text className="text-lg">🏢</Text>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-sm text-foreground" numberOfLines={1}>
                    {card.company_name || card.full_name}
                  </Text>
                  <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                    {card.category}
                  </Text>
                  <View className="flex-row items-center gap-2 mt-1.5">
                    {"distance" in card && (
                      <Badge variant="secondary" className="text-[10px]">
                        <MapPin size={12} color={colors.mutedForeground} />{" "}
                        {formatDistance((card as any).distance)}
                      </Badge>
                    )}
                    <Badge
                      className={`text-[10px] border ${
                        card.service_mode === "home"
                          ? "bg-blue-500/10 text-blue-600 border-blue-200"
                          : card.service_mode === "both"
                          ? "bg-purple-500/10 text-purple-600 border-purple-200"
                          : "bg-amber-500/10 text-amber-600 border-amber-200"
                      }`}
                    >
                      {card.service_mode === "home"
                        ? "🏠 Home Service"
                        : card.service_mode === "both"
                        ? "🔄 Home & Visit"
                        : "🏪 Visit"}
                    </Badge>
                  </View>
                </View>
                <View className="items-center gap-2">
                  <Pressable
                    className="h-8 w-8 items-center justify-center"
                    onPress={(e) => {
                      e.stopPropagation();
                      Linking.openURL(`tel:${card.phone}`);
                    }}
                  >
                    <Phone size={16} color={colors.foreground} />
                  </Pressable>
                  <Pressable
                    className="h-8 w-8 items-center justify-center"
                    onPress={(e) => {
                      e.stopPropagation();
                      navigation.navigate("Messaging");
                    }}
                  >
                    <MessageCircle size={16} color={colors.foreground} />
                  </Pressable>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

export default NearbyBusinesses;

