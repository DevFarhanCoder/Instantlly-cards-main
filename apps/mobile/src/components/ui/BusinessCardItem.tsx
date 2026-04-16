import { ReactNode } from "react";
import { Image, Text, View } from "react-native";

type BadgeItem = {
  id: string;
  label: string;
  className?: string;
  style?: any;
};

type BusinessCardItemProps = {
  title: string;
  subtitle?: string;
  secondaryText?: string;
  category?: string;
  avatarUri?: string | null;
  fallbackAvatar?: string;
  topRight?: ReactNode;
  badges?: BadgeItem[];
  badgeFooter?: ReactNode;
  location?: string;
  offer?: string;
  services?: string[];
  actions?: ReactNode;
  minHeight?: number;
};

const splitBadges = (badges: BadgeItem[]) => {
  const rows: BadgeItem[][] = [];
  for (let i = 0; i < badges.length; i += 2) {
    rows.push(badges.slice(i, i + 2));
  }
  return rows;
};

export const BusinessCardItem = ({
  title,
  subtitle,
  secondaryText,
  category,
  avatarUri,
  fallbackAvatar = "🏢",
  topRight,
  badges = [],
  badgeFooter,
  location,
  offer,
  services = [],
  actions,
  minHeight = 212,
}: BusinessCardItemProps) => {
  const badgeRows = splitBadges(badges);

  return (
    <View className="rounded-2xl border border-border bg-card p-4 shadow-sm" style={{ minHeight }}>
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1 flex-row items-start gap-3 pr-1">
          <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <Text className="text-xl">{fallbackAvatar}</Text>
            )}
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-foreground" numberOfLines={1} ellipsizeMode="tail">
              {title}
            </Text>
            {subtitle ? (
              <Text className="text-xs font-medium text-primary" numberOfLines={1} ellipsizeMode="tail">
                {subtitle}
              </Text>
            ) : null}
            {secondaryText ? (
              <Text className="text-xs text-muted-foreground" numberOfLines={1} ellipsizeMode="tail">
                {secondaryText}
              </Text>
            ) : null}
            {category ? (
              <Text className="mt-1 text-[11px] font-medium text-primary" numberOfLines={1} ellipsizeMode="tail">
                {category}
              </Text>
            ) : null}
          </View>
        </View>

        <View className="min-w-[28px] items-end justify-start">
          {topRight}
        </View>
      </View>

      {(badges.length > 0 || badgeFooter) && (
        <View className="mt-3 gap-1.5">
          {badgeRows.map((row, index) => (
            <View key={`badge-row-${index}`} className="flex-row items-center gap-1.5">
              {row.map((badge) => (
                <Text
                  key={badge.id}
                  className={badge.className || "rounded-full px-2 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground"}
                  style={badge.style}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {badge.label}
                </Text>
              ))}
            </View>
          ))}
          {badgeFooter}
        </View>
      )}

      {location ? <Text className="mt-2 text-xs text-muted-foreground">📍 {location}</Text> : null}

      {offer ? (
        <View className="mt-2 rounded-lg bg-accent/50 px-3 py-1.5">
          <Text className="text-xs font-medium text-accent-foreground" numberOfLines={2} ellipsizeMode="tail">
            🎁 {offer}
          </Text>
        </View>
      ) : null}

      {services.length > 0 ? (
        <View className="mt-3 flex-row flex-wrap gap-1.5">
          {services.map((service) => (
            <Text
              key={service}
              className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {service}
            </Text>
          ))}
        </View>
      ) : null}

      {actions ? <View className="mt-3">{actions}</View> : null}
    </View>
  );
};
