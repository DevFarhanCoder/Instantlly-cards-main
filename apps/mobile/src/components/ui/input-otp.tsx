import React from "react";
import { Text, TextInput, View } from "react-native";
import { cn } from "../../lib/utils";
import { colors } from "../../theme/colors";

export const InputOTP = ({
  value,
  onChange,
  length = 6,
  className,
}: {
  value?: string;
  onChange?: (v: string) => void;
  length?: number;
  className?: string;
}) => {
  return (
    <TextInput
      value={value}
      onChangeText={(v) => onChange?.(v.slice(0, length))}
      keyboardType="number-pad"
      placeholder="••••••"
      placeholderTextColor={colors.mutedForeground}
      className={cn("rounded-lg border border-border px-3 py-2 text-sm text-foreground", className)}
    />
  );
};

export const InputOTPGroup = ({ children }: { children: React.ReactNode }) => (
  <View className="flex-row gap-2">{children}</View>
);

export const InputOTPSlot = ({
  value,
  className,
}: {
  value?: string;
  className?: string;
}) => (
  <View className={cn("h-10 w-10 items-center justify-center rounded-lg border border-border bg-card", className)}>
    <Text className="text-base font-semibold text-foreground">{value || ""}</Text>
  </View>
);

export const InputOTPSeparator = () => <Text className="text-sm text-muted-foreground">-</Text>;

