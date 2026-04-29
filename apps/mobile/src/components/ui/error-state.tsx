import React from "react";
import { Text, View } from "react-native";
import { AlertCircle } from "lucide-react-native";
import { Button } from "./button";
import { useMutedIconColor } from "../../theme/colors";

/**
 * Reusable inline error UI with optional Retry CTA.
 * Theme-aware via NativeWind utility classes (`bg-background`, `text-foreground`,
 * `text-muted-foreground`).
 */
export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** Compact mode: skips the icon + uses tighter padding. */
  compact?: boolean;
}

export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this. Please try again.",
  onRetry,
  retryLabel = "Try again",
  compact = false,
}: ErrorStateProps) {
  const mutedIcon = useMutedIconColor();
  return (
    <View
      className={
        compact
          ? "items-center px-4 py-6"
          : "flex-1 items-center justify-center px-6 py-10 bg-background"
      }
    >
      {!compact && <AlertCircle size={48} color={mutedIcon} />}
      <Text className="text-base font-semibold text-foreground mt-3 text-center">
        {title}
      </Text>
      <Text className="text-sm text-muted-foreground mt-1 text-center">
        {message}
      </Text>
      {onRetry && (
        <Button variant="outline" className="mt-4" onPress={onRetry}>
          {retryLabel}
        </Button>
      )}
    </View>
  );
}

export default ErrorState;
