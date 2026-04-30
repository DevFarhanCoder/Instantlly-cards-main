import React, { memo } from "react";
import { Pressable, Text, View } from "react-native";
import { Calendar, MapPin, Users } from "lucide-react-native";
import { Badge } from "./badge";
import { Skeleton } from "./skeleton";
import { useMutedIconColor } from "../../theme/colors";
import type { AppEvent } from "../../store/api/eventsApi";

/**
 * Theme-aware event list card.
 *
 * Backward compatibility:
 *   • Reads `ticket_price` only as a fallback display when no real tiers exist.
 *   • Reads `ticket_tiers` (decorated by backend) to find the cheapest visible
 *     price for new tier-based events.
 *   • A missing `ticket_tiers` array is treated as `[]` so older cached
 *     responses still render.
 */
export interface EventCardProps {
  event: AppEvent;
  onPress: () => void;
}

function getDisplayPrice(event: AppEvent): {
  isFree: boolean;
  label: string;
} {
  // Defensive: ticket_tiers may be undefined for old cached payloads.
  const tiers = Array.isArray(event.ticket_tiers) ? event.ticket_tiers : [];
  const realTiers = tiers.filter((t) => !t.is_virtual);
  if (event.is_legacy === true || realTiers.length === 0) {
    const price = event.ticket_price ?? 0;
    if (!price || price <= 0) return { isFree: true, label: "FREE" };
    return { isFree: false, label: `\u20B9${price}` };
  }
  // Real tiers: show "from ₹X" with the cheapest active tier price.
  const activePrices = realTiers
    .filter((t) => t.is_active)
    .map((t) => t.price);
  if (activePrices.length === 0) {
    return { isFree: false, label: "Sold out" };
  }
  const min = Math.min(...activePrices);
  if (min <= 0) return { isFree: true, label: "FREE" };
  return { isFree: false, label: `From \u20B9${min}` };
}

function EventCardImpl({ event, onPress }: EventCardProps) {
  const muted = useMutedIconColor();
  const { isFree, label } = getDisplayPrice(event);
  const registered = event._count?.registrations ?? event.attendee_count ?? 0;
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "#00000010" }}
      className="flex-row gap-3 bg-card border border-border rounded-xl overflow-hidden mb-3"
    >
      <View className="w-24 h-28 bg-primary/10 items-center justify-center">
        <Text className="text-4xl">{"\uD83C\uDF89"}</Text>
      </View>
      <View className="py-3 pr-4 flex-1">
        <View className="flex-row items-center gap-1.5 mb-1 flex-wrap">
          {isFree ? (
            <Badge className="bg-success/10 text-success border-none text-[10px]">
              FREE
            </Badge>
          ) : (
            <Badge className="bg-accent/10 text-accent border-none text-[10px]">
              {label}
            </Badge>
          )}
          {event.city ? (
            <Badge className="bg-muted text-muted-foreground border-none text-[10px]">
              {event.city}
            </Badge>
          ) : null}
        </View>
        <Text
          className="text-sm font-semibold text-foreground"
          numberOfLines={1}
        >
          {event.title}
        </Text>
        <View className="flex-row items-center gap-1.5 mt-1">
          <Calendar size={12} color={muted} />
          <Text className="text-[11px] text-muted-foreground">
            {new Date(event.date).toLocaleDateString()} {"\u2022"} {event.time}
          </Text>
        </View>
        {event.venue || event.location ? (
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <MapPin size={12} color={muted} />
            <Text
              className="text-[11px] text-muted-foreground"
              numberOfLines={1}
            >
              {event.venue || event.location}
            </Text>
          </View>
        ) : null}
        <View className="flex-row items-center gap-1 mt-0.5">
          <Users size={12} color={muted} />
          <Text className="text-[11px] text-muted-foreground">
            {registered} registered
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/** Memoized to avoid re-renders inside long FlatLists. */
export const EventCard = memo(EventCardImpl);

/** Skeleton placeholder matching EventCard's footprint. */
export function EventCardSkeleton() {
  return (
    <View className="flex-row gap-3 bg-card border border-border rounded-xl overflow-hidden mb-3">
      <Skeleton style={{ width: 96, height: 112 }} />
      <View className="py-3 pr-4 flex-1 gap-2">
        <Skeleton style={{ height: 12, width: 80 }} />
        <Skeleton style={{ height: 14, width: "80%" }} />
        <Skeleton style={{ height: 10, width: "60%" }} />
        <Skeleton style={{ height: 10, width: "50%" }} />
      </View>
    </View>
  );
}

export default EventCard;
