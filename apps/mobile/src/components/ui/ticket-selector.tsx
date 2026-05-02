import React, { memo } from "react";
import { Pressable, Text, View } from "react-native";
import { Minus, Plus, Ticket } from "lucide-react-native";
import { Badge } from "./badge";
import { useColors } from "../../theme/colors";

import type { AppTicketTier } from "../../store/api/eventsApi";

/**
 * TicketSelector — renders the list of ticket tiers with per-tier quantity
 * steppers so the user can add multiple tiers to a single cart
 * (e.g. 4 VIP + 2 General).
 *
 * Selection model:
 *   • `cartItems` maps String(tier.id ?? "virtual") → quantity
 *   • qty 0 = not in cart; qty > 0 = in cart
 *   • Sold-out / inactive tiers are visible but disabled
 */
export type TierKey = number | "virtual";

export function tierKey(tier: AppTicketTier): TierKey {
  return tier.id ?? "virtual";
}

export function tierKeyStr(tier: AppTicketTier): string {
  return String(tierKey(tier));
}

export interface TicketSelectorProps {
  tiers: AppTicketTier[];
  cartItems: Record<string, number>; // String(tier.id ?? "virtual") → quantity
  onCartChange: (tierKeyStr: string, qty: number) => void;
}

interface TierRowProps {
  tier: AppTicketTier;
  qty: number;
  onInc: () => void;
  onDec: () => void;
}

const TierRow = memo(function TierRow({ tier, qty, onInc, onDec }: TierRowProps) {
  const colors = useColors();
  const disabled = tier.is_sold_out || !tier.is_active || !tier.is_on_sale;
  const inCart = qty > 0;
  const max = Math.min(
    tier.max_per_order ?? 10,
    tier.quantity_available ?? tier.max_per_order ?? 10,
  );
  const min = 0;

  return (
    <View
      className={`rounded-xl border px-4 py-3 mb-2 ${
        disabled
          ? "border-border bg-card opacity-60"
          : inCart
            ? "border-primary bg-primary/5"
            : "border-border bg-card"
      }`}
    >
      <View className="flex-row items-center gap-3">
        {/* Left: tier info */}
        <View className="flex-1">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text className="text-sm font-semibold text-foreground">{tier.name}</Text>
            {tier.is_free ? (
              <Badge className="bg-success/10 text-success border-none text-[10px]">FREE</Badge>
            ) : null}
            {tier.is_sold_out ? (
              <Badge className="bg-destructive/10 text-destructive border-none text-[10px]">SOLD OUT</Badge>
            ) : null}
            {!tier.is_active ? (
              <Badge className="bg-muted text-muted-foreground border-none text-[10px]">Inactive</Badge>
            ) : null}
            {tier.is_active && !tier.is_on_sale && !tier.is_sold_out ? (
              <Badge className="bg-warning/10 text-warning border-none text-[10px]">Not on sale</Badge>
            ) : null}
          </View>
          {tier.description ? (
            <Text className="text-xs text-muted-foreground mt-0.5">{tier.description}</Text>
          ) : null}
          {tier.quantity_total !== null ? (
            <Text className="text-[11px] text-muted-foreground mt-0.5">
              {tier.is_sold_out
                ? `Sold out`
                : `${tier.quantity_available ?? 0} of ${tier.quantity_total} left`}
            </Text>
          ) : null}
          {!tier.is_sold_out && tier.is_active && tier.quantity_available !== null &&
           tier.quantity_available !== undefined && tier.quantity_available <= 5 ? (
            <Text className="text-[11px] font-semibold text-warning mt-0.5">
              🔥 Only {tier.quantity_available} left
            </Text>
          ) : null}
        </View>

        {/* Right: price + quantity stepper */}
        <View className="items-end gap-2">
          <Text className="text-base font-bold text-foreground">
            {tier.is_free ? "FREE" : `₹${tier.price}`}
          </Text>
          {!disabled ? (
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={onDec}
                disabled={qty <= min}
                className={`w-7 h-7 rounded-full border items-center justify-center ${
                  qty <= min ? "border-border opacity-40" : "border-primary"
                }`}
              >
                <Minus size={14} color={qty <= min ? colors.mutedForeground : colors.primary} />
              </Pressable>
              <Text className="text-sm font-bold text-foreground min-w-[20px] text-center">{qty}</Text>
              <Pressable
                onPress={onInc}
                disabled={qty >= max}
                className={`w-7 h-7 rounded-full border items-center justify-center ${
                  qty >= max ? "border-border opacity-40" : "border-primary"
                }`}
              >
                <Plus size={14} color={qty >= max ? colors.mutedForeground : colors.primary} />
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
});

function TicketSelectorImpl({ tiers, cartItems, onCartChange }: TicketSelectorProps) {
  const colors = useColors();

  const cartTotal = tiers.reduce((sum, t) => {
    const qty = cartItems[tierKeyStr(t)] ?? 0;
    return sum + (t.is_free ? 0 : t.price * qty);
  }, 0);

  const cartLineItems = tiers
    .map((t) => ({ tier: t, qty: cartItems[tierKeyStr(t)] ?? 0 }))
    .filter((x) => x.qty > 0);

  return (
    <View>
      <View className="flex-row items-center gap-2 mb-3">
        <Ticket size={16} color={colors.primary} />
        <Text className="text-base font-bold text-foreground">Tickets</Text>
        <Text className="text-xs text-muted-foreground ml-auto">Tap +/- to add</Text>
      </View>

      {tiers.map((t) => {
        const key = tierKeyStr(t);
        const qty = cartItems[key] ?? 0;
        const max = Math.min(t.max_per_order ?? 10, t.quantity_available ?? t.max_per_order ?? 10);
        return (
          <TierRow
            key={key}
            tier={t}
            qty={qty}
            onInc={() => onCartChange(key, Math.min(qty + 1, max))}
            onDec={() => onCartChange(key, Math.max(qty - 1, 0))}
          />
        );
      })}

      {cartLineItems.length > 0 ? (
        <View className="mt-2 rounded-xl bg-muted/40 px-4 py-3 gap-1">
          {cartLineItems.map(({ tier, qty }) => (
            <View key={tierKeyStr(tier)} className="flex-row justify-between">
              <Text className="text-xs text-muted-foreground">{tier.name} × {qty}</Text>
              <Text className="text-xs font-semibold text-foreground">
                {tier.is_free ? "FREE" : `₹${tier.price * qty}`}
              </Text>
            </View>
          ))}
          {cartTotal > 0 ? (
            <View className="flex-row justify-between border-t border-border mt-1 pt-1">
              <Text className="text-sm font-bold text-foreground">Total</Text>
              <Text className="text-sm font-bold text-primary">₹{cartTotal}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export const TicketSelector = memo(TicketSelectorImpl);
export default TicketSelector;

