import React, { ReactNode } from "react";
import { Text, View } from "react-native";
import { Button } from "./button";

/**
 * Reusable empty-state UI. Pass an emoji or any ReactNode as the icon.
 * Theme-aware via NativeWind classes.
 */
export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Compact: skip the big top padding (use inside list footers etc.). */
  compact?: boolean;
}

export function EmptyState({
  icon = <Text className="text-5xl">📭</Text>,
  title,
  message,
  actionLabel,
  onAction,
  compact = false,
}: EmptyStateProps) {
  return (
    <View
      className={
        compact
          ? "items-center px-4 py-8"
          : "flex-1 items-center justify-center px-6 py-12 bg-background"
      }
    >
      <View className="mb-3">{icon}</View>
      <Text className="text-base font-semibold text-foreground text-center">
        {title}
      </Text>
      {message ? (
        <Text className="text-sm text-muted-foreground mt-1 text-center max-w-xs">
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button className="mt-4" onPress={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

export default EmptyState;
