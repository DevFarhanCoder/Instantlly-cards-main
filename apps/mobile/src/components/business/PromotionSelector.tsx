import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { usePromotionContext } from '../../contexts/PromotionContext';
import { getTierLabel, getTierColor, type Tier, effectiveTier } from '../../utils/tierFeatures';

interface PromotionSelectorProps {
  /** Title shown above the list */
  title?: string;
}

export function PromotionSelector({ title = 'Select a Business Listing' }: PromotionSelectorProps) {
  const { promotions, selectedPromotionId, selectPromotion } = usePromotionContext();

  // Show ALL promotions (free + active + pending) — no filtering
  if (promotions.length <= 1) return null;

  return (
    <View className="px-4 py-3">
      <Text className="text-sm font-bold text-foreground mb-2">{title}</Text>
      <View className="gap-2">
        {promotions.map((promo: any) => {
          const isSelected = promo.id === selectedPromotionId;
          const tier = effectiveTier(promo.tier, promo.status) as Tier;
          const tierColor = getTierColor(tier);
          const statusLabel =
            promo.status === 'active' ? '✅ Active' :
            promo.status === 'pending_payment' ? '⏳ Pending Payment' :
            promo.status === 'draft' ? '📝 Draft' :
            promo.listing_type === 'free' ? '🆓 Free' :
            promo.status;
          return (
            <Pressable
              key={promo.id}
              onPress={() => selectPromotion(promo.id)}
              className={`flex-row items-center rounded-xl border p-3 ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
            >
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                  {promo.business_name || 'Business'}
                </Text>
                <View className="flex-row items-center gap-1.5 mt-0.5">
                  <Text
                    style={{ backgroundColor: tierColor + '20', color: tierColor }}
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  >
                    {getTierLabel(tier)}
                  </Text>
                  <Text className="text-[10px] text-muted-foreground">
                    {statusLabel}
                  </Text>
                </View>
              </View>
              {isSelected && <ChevronRight size={16} color="#2563eb" />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
