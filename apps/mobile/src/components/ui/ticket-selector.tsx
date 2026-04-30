import React, { memo, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { Minus, Plus, Ticket } from "lucide-react-native";
import { Badge } from "./badge";
import { useColors } from "../../theme/colors";
import type { AppTicketTier } from "../../store/api/eventsApi";

/**
 * TicketSelector — renders the list of ticket tiers and a quantity stepper
 * for the currently selected tier.
 *
 * Theme-aware via NativeWind utility classes + inline icon colors from
 * `useColors()`. Memoized list item to avoid re-renders.
 *
 * Selection model:
 *   • Tier id is `number | "virtual"` so callers can address the synthesized
 *     legacy tier without conflating it with real DB rows.
 *   • Selecting a sold-out / inactive tier is blocked at the press level
 *     (the card stays visible but grayed out).
 */
export type TierKey = number | "virtual";

export function tierKey(tier: AppTicketTier): TierKey {
  return tier.id ?? "virtual";
}

export interface TicketSelectorProps {
  tiers: AppTicketTier[];
  selectedTier: TierKey | null;
  onSelectTier: (key: TierKey) => void;
  quantity: number;
  onQuantityChange: (next: number) => void;
}

interface TierRowProps {
  tier: AppTicketTier;
  selected: boolean;
  onSelect: () => void;
}

const TierRow = memo(function TierRow({ tier, selected, onSelect }: TierRowProps) {
  const disabled =
    tier.is_sold_out || !tier.is_active || !tier.is_on_sale;
  const labelClass = selected
    ? "border-primary bg-primary/5"
    : "border-border bg-card";
  return (
    <Pressable
      onPress={onSelect}
      disabled={disabled}
      android_ripple={disabled ? undefined : { color: "#00000010" }}
      className={`rounded-xl border ${labelClass} px-4 py-3 mb-2 ${disabled ? "opacity-60" : ""}`}
    >
      <View className="flex-row items-start gap-3">
        <View className="flex-1">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text className="text-sm font-semibold text-foreground">
              {tier.name}
            </Text>
            {tier.is_free ? (
              <Badge className="bg-success/10 text-success border-none text-[10px]">
                FREE
              </Badge>
            ) : null}
            {tier.is_sold_out ? (
              <Badge className="bg-destructive/10 text-destructive border-none text-[10px]">
                SOLD OUT
              </Badge>
            ) : null}
            {!tier.is_active ? (
              <Badge className="bg-muted text-muted-foreground border-none text-[10px]">
                Inactive
              </Badge>
            ) : null}
            {tier.is_active && !tier.is_on_sale && !tier.is_sold_out ? (
              <Badge className="bg-warning/10 text-warning border-none text-[10px]">
                Not on sale
              </Badge>
            ) : null}
          </View>
          {tier.description ? (
            <Text className="text-xs text-muted-foreground mt-1">
              {tier.description}
            </Text>
          ) : null}
          {tier.quantity_total !== null ? (
            <Text className="text-[11px] text-muted-foreground mt-1">
              {tier.is_sold_out
                ? `Sold out (${tier.quantity_total} sold)`
                : `${tier.quantity_available ?? 0} of ${tier.quantity_total} available`}
            </Text>
          ) : null}
          {!tier.is_sold_out &&
          tier.is_active &&
          tier.is_on_sale &&
          tier.quantity_available !== null &&
          tier.quantity_available !== undefined &&
          tier.quantity_available > 0 &&
          tier.quantity_available <= 5 ? (
            <View className="flex-row items-center gap-1 mt-1">
              <Text className="text-[11px] font-semibold text-warning">
                {`\uD83D\uDD25 Only ${tier.quantity_available} left`}
              </Text>
            </View>
          ) : null}
        </View>
        <View className="items-end">
          <Text className="text-base font-bold text-foreground">
            {tier.is_free ? "FREE" : `\u20B9${tier.price}`}
          </Text>
          <View
            className={`mt-1 w-5 h-5 rounded-full border-2 items-center justify-center ${
              selected ? "border-primary bg-primary" : "border-border"
            }`}
          >
            {selected ? (
              <View className="w-2 h-2 rounded-full bg-primary-foreground" />
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const QuantityStepper = memo(function QuantityStepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const colors = useColors();
  const decDisabled = value <= min;
  const incDisabled = value >= max;
  return (
    <View className="flex-row items-center justify-center gap-4">
      <Pressable
        accessibilityLabel="Decrease quantity"
        onPress={() => !decDisabled && onChange(value - 1)}
        disabled={decDisabled}
        className={`w-10 h-10 rounded-full items-center justify-center border ${
          decDisabled ? "border-border opacity-40" : "border-primary"
        }`}
      >
        <Minus
          size={18}
          color={decDisabled ? colors.mutedForeground : colors.primary}
        />
      </Pressable>
      <Text className="text-lg font-bold text-foreground min-w-[32px] text-center">
        {value}
      </Text>
      <Pressable
        accessibilityLabel="Increase quantity"
        onPress={() => !incDisabled && onChange(value + 1)}
        disabled={incDisabled}
        className={`w-10 h-10 rounded-full items-center justify-center border ${
          incDisabled ? "border-border opacity-40" : "border-primary"
        }`}
      >
        <Plus
          size={18}
          color={incDisabled ? colors.mutedForeground : colors.primary}
        />
      </Pressable>
    </View>
  );
});

function TicketSelectorImpl({
  tiers,
  selectedTier,
  onSelectTier,
  quantity,
  onQuantityChange,
}: TicketSelectorProps) {
  const colors = useColors();
  const selected = useMemo(
    () =>
      tiers.find((t) => tierKey(t) === selectedTier) ?? null,
    [tiers, selectedTier],
  );
  const minQty = selected?.min_per_order ?? 1;
  const maxQty = Math.max(
    minQty,
    Math.min(
      selected?.max_per_order ?? 10,
      selected?.quantity_available ?? selected?.max_per_order ?? 10,
    ),
  );

  return (
    <View>
      <View className="flex-row items-center gap-2 mb-3">
        <Ticket size={16} color={colors.primary} />
        <Text className="text-base font-bold text-foreground">Tickets</Text>
      </View>

      {tiers.map((t) => (
        <TierRow
          key={String(tierKey(t))}
          tier={t}
          selected={tierKey(t) === selectedTier}
          onSelect={() => onSelectTier(tierKey(t))}
        />
      ))}

      {selected && !selected.is_sold_out && selected.is_active ? (
        <View className="mt-3 rounded-xl bg-muted/40 px-4 py-4">
          <Text className="text-xs text-muted-foreground text-center mb-2">
            Quantity
          </Text>
          <QuantityStepper
            value={quantity}
            min={minQty}
            max={maxQty}
            onChange={onQuantityChange}
          />
          {!selected.is_free ? (
            <Text className="text-center text-sm text-foreground mt-3">
              Total:{" "}
              <Text className="font-bold">
                {`\u20B9${selected.price * quantity}`}
              </Text>
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export const TicketSelector = memo(TicketSelectorImpl);
export default TicketSelector;
