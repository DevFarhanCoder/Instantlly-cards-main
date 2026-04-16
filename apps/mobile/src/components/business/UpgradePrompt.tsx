import { Pressable, Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { type Feature, FEATURE_MIN_TIER, getTierColor, getTierLabel, upgradeMessage } from '../../utils/tierFeatures';
import { Button } from '../ui/button';

interface UpgradePromptProps {
  feature: Feature;
  /** Override the default message */
  message?: string;
  promotionId?: number | null;
  businessName?: string;
  ctaLabel?: string;
}

export function UpgradePrompt({ feature, message, promotionId, businessName, ctaLabel }: UpgradePromptProps) {
  const navigation = useNavigation<any>();
  const minTier = FEATURE_MIN_TIER[feature];
  const color = getTierColor(minTier);
  const buttonLabel = ctaLabel || `Upgrade ${businessName || 'this business'} to ${getTierLabel(minTier)}`;

  return (
    <View className="flex-1 items-center justify-center px-6">
      <View className="rounded-2xl border border-border bg-card p-6 items-center w-full max-w-sm">
        <View
          className="h-16 w-16 rounded-full items-center justify-center mb-4"
          style={{ backgroundColor: `${color}20` }}
        >
          <Lock size={28} color={color} />
        </View>
        <Text className="text-lg font-bold text-foreground text-center">
          {getTierLabel(minTier)} Plan Required
        </Text>
        <Text className="text-sm text-muted-foreground text-center mt-2">
          {message || upgradeMessage(feature)}
        </Text>
        <Button
          className="mt-4 rounded-xl w-full"
          onPress={() => navigation.navigate('PremiumPlanSelection', { promotionId })}
        >
          <Text className="text-sm font-semibold text-primary-foreground">
            {buttonLabel}
          </Text>
        </Button>
      </View>
    </View>
  );
}
