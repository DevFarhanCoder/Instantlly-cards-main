import React from "react";
import { Pressable, Text, View } from "react-native";
import { cn } from "../../lib/utils";

export const NavigationMenu = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <View className={cn("flex-row items-center gap-2", className)}>{children}</View>
);

export const NavigationMenuList = ({ children }: { children: React.ReactNode }) => (
  <View className="flex-row items-center gap-2">{children}</View>
);

export const NavigationMenuItem = ({ children }: { children: React.ReactNode }) => (
  <View>{children}</View>
);

export const NavigationMenuTrigger = ({
  onPress,
  className,
  children,
}: {
  onPress?: () => void;
  className?: string;
  children: React.ReactNode;
}) => (
  <Pressable onPress={onPress} className={cn("px-2 py-1", className)}>
    {typeof children === "string" ? (
      <Text className="text-sm text-foreground">{children}</Text>
    ) : (
      children
    )}
  </Pressable>
);

export const NavigationMenuContent = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <View className={cn("rounded-xl border border-border bg-card p-2", className)}>{children}</View>
);

export const NavigationMenuLink = ({
  onPress,
  className,
  children,
}: {
  onPress?: () => void;
  className?: string;
  children: React.ReactNode;
}) => (
  <Pressable onPress={onPress} className={cn("px-2 py-1", className)}>
    {typeof children === "string" ? (
      <Text className="text-sm text-foreground">{children}</Text>
    ) : (
      children
    )}
  </Pressable>
);

export const NavigationMenuViewport = ({ children }: { children?: React.ReactNode }) => (
  <View>{children}</View>
);

