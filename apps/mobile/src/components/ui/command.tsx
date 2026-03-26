import React from "react";
import { Text, TextInput, View } from "react-native";
import { cn } from "../../lib/utils";
import { colors } from "../../theme/colors";

export const Command = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <View className={cn("rounded-xl border border-border bg-card", className)}>{children}</View>
);

export const CommandInput = ({
  placeholder,
  className,
  value,
  onChangeText,
}: {
  placeholder?: string;
  className?: string;
  value?: string;
  onChangeText?: (v: string) => void;
}) => (
  <TextInput
    placeholder={placeholder}
    value={value}
    onChangeText={onChangeText}
    placeholderTextColor={colors.mutedForeground}
    className={cn("px-3 py-2 text-sm text-foreground", className)}
  />
);

export const CommandList = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <View className={cn("py-2", className)}>{children}</View>
);

export const CommandEmpty = ({ children }: { children: React.ReactNode }) => (
  <Text className="px-3 py-2 text-xs text-muted-foreground">{children}</Text>
);

export const CommandGroup = ({
  heading,
  children,
}: {
  heading?: string;
  children: React.ReactNode;
}) => (
  <View className="mt-2">
    {heading ? <Text className="px-3 text-[10px] uppercase text-muted-foreground">{heading}</Text> : null}
    <View className="mt-1">{children}</View>
  </View>
);

export const CommandItem = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <View className={cn("px-3 py-2", className)}>
    {typeof children === "string" ? (
      <Text className="text-sm text-foreground">{children}</Text>
    ) : (
      children
    )}
  </View>
);

export const CommandSeparator = () => <View className="my-1 h-px bg-border" />;

export const CommandShortcut = ({ children }: { children: React.ReactNode }) => (
  <Text className="ml-auto text-[10px] text-muted-foreground">{children}</Text>
);

