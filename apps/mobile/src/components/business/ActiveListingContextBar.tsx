import React from "react";
import { Text, View } from "react-native";
import { usePromotionContext } from "../../contexts/PromotionContext";
import { getTierColor, getTierLabel } from "../../utils/tierFeatures";

const statusLabel: Record<string, string> = {
  active: "Active",
  pending_payment: "Pending",
  expired: "Expired",
};

const statusClassName: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  pending_payment: "bg-amber-100 text-amber-700",
  expired: "bg-red-100 text-red-700",
};

export function ActiveListingContextBar() {
  const { selectedPromotion } = usePromotionContext();

  if (!selectedPromotion) {
    return null;
  }

  const businessName = selectedPromotion.business_name || "Business";
  const rawTier = selectedPromotion.tier || "free";
  const tierLabel = getTierLabel(rawTier).toUpperCase();
  const tierColor = getTierColor(rawTier);
  const promoStatus = selectedPromotion.status || "active";

  return (
    <View className="mx-4 mt-3 rounded-xl border border-border bg-card px-3 py-2">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 text-sm font-semibold text-foreground" numberOfLines={1}>
          {businessName}
        </Text>
        <View className="flex-row items-center gap-1.5">
          <Text
            style={{ backgroundColor: `${tierColor}20`, color: tierColor }}
            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
          >
            {tierLabel}
          </Text>
          <Text
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              statusClassName[promoStatus] || "bg-muted text-muted-foreground"
            }`}
          >
            {statusLabel[promoStatus] || promoStatus}
          </Text>
        </View>
      </View>
    </View>
  );
}
