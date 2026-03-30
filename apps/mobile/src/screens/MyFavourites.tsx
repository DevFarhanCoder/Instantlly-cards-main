import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Heart, MapPin } from "lucide-react-native";
import { useFavorites } from "../contexts/FavoritesContext";
import { supabase } from "../integrations/supabase/client";

const MyFavourites = () => {
  const navigation = useNavigation<any>();
  const { favorites, toggleFavorite } = useFavorites();

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["favorite-cards", favorites],
    queryFn: async () => {
      if (favorites.length === 0) return [];
      const { data, error } = await supabase
        .from("business_cards")
        .select("*")
        .in("id", favorites);
      if (error) throw error;
      return data as any[];
    },
    enabled: favorites.length > 0,
  });

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">My Favourites</Text>
        <Text className="ml-auto text-xs text-muted-foreground">{favorites.length} saved</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} className="px-4 py-4">
        {isLoading ? (
          <View className="gap-3">
            {[1, 2, 3].map((i) => (
              <View key={i} className="h-20 rounded-xl bg-muted" />
            ))}
          </View>
        ) : cards.length === 0 ? (
          <View className="items-center justify-center py-16">
            <Text className="text-5xl mb-3">❤️</Text>
            <Text className="text-base font-semibold text-foreground">No favourites yet</Text>
            <Text className="text-sm text-muted-foreground mt-1 text-center">
              Tap the heart icon on any business card to save it here
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {cards.map((card) => (
              <View
                key={card.id}
                className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <Pressable
                  className="h-12 w-12 items-center justify-center rounded-xl bg-primary/10 overflow-hidden"
                  onPress={() => navigation.navigate("BusinessDetail", { id: card.id })}
                >
                  {card.logo_url ? (
                    <Image source={{ uri: card.logo_url }} style={{ height: "100%", width: "100%" }} />
                  ) : (
                    <Text className="text-xl">🏢</Text>
                  )}
                </Pressable>
                <Pressable
                  className="flex-1 min-w-0"
                  onPress={() => navigation.navigate("BusinessDetail", { id: card.id })}
                >
                  <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                    {card.company_name || card.full_name}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    {card.category && (
                      <Text className="text-xs text-muted-foreground">{card.category}</Text>
                    )}
                    {card.location && (
                      <View className="flex-row items-center gap-1">
                        <MapPin size={12} color="#9aa2b1" />
                        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                          {card.location}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => toggleFavorite(card.id)}
                  className="p-1.5 rounded-lg"
                >
                  <Heart size={20} color="#ef4444" fill="#ef4444" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default MyFavourites;

