import { Pressable, Text, View } from "react-native";
import { Rocket, Sparkles } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";

interface NoPromotionCTAProps {
  /** Headline shown above the illustration. */
  title?: string;
  /** Supporting description. */
  description?: string;
  /** Primary button label. */
  ctaLabel?: string;
  /** Feature icon emoji shown in the pill row. */
  featurePills?: string[];
}

/**
 * Empty-state CTA shown on screens that require a promoted business (Analytics, Ads, etc.)
 * when the user has no promotions yet. Deep-links to the promotion creation form.
 */
export const NoPromotionCTA = ({
  title = "Promote your business",
  description = "Create a promoted listing to unlock analytics, ads, bookings, and leads.",
  ctaLabel = "Promote Business",
  featurePills = ["📊 Analytics", "📣 Ads", "🎯 Leads", "⭐ Reviews"],
}: NoPromotionCTAProps) => {
  const navigation = useNavigation<any>();

  return (
    <View className="flex-1 items-center justify-center px-6">
      <View className="w-full max-w-sm rounded-3xl border border-primary/20 bg-primary/5 p-6 items-center">
        <View className="h-16 w-16 rounded-2xl bg-primary items-center justify-center mb-4">
          <Rocket size={28} color="#ffffff" />
        </View>

        <Text className="text-xl font-bold text-foreground text-center">{title}</Text>
        <Text className="text-sm text-muted-foreground text-center mt-2 leading-5">
          {description}
        </Text>

        <View className="flex-row flex-wrap justify-center gap-2 mt-5">
          {featurePills.map((pill) => (
            <View
              key={pill}
              className="rounded-full bg-background border border-border px-3 py-1"
            >
              <Text className="text-[11px] font-medium text-foreground">{pill}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => navigation.navigate("BusinessPromotionForm")}
          className="mt-6 w-full flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3.5 active:opacity-80"
        >
          <Sparkles size={16} color="#ffffff" />
          <Text className="text-sm font-bold text-primary-foreground">{ctaLabel}</Text>
        </Pressable>

        <Text className="text-[11px] text-muted-foreground text-center mt-3">
          Start free · Upgrade anytime
        </Text>
      </View>
    </View>
  );
};

export default NoPromotionCTA;
