import React from "react";
import { Pressable, Text, View } from "react-native";
import { cn } from "../../lib/utils";

export const Menubar = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <View className={cn("flex-row items-center gap-2", className)}>{children}</View>
);

export const MenubarMenu = ({ children }: { children: React.ReactNode }) => <View>{children}</View>;

export const MenubarTrigger = ({
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

export const MenubarContent = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <View className={cn("rounded-xl border border-border bg-card p-2", className)}>{children}</View>
);

export const MenubarItem = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <View className={cn("px-3 py-2", className)}>
    {typeof children === "string" ? <Text className="text-sm text-foreground">{children}</Text> : children}
  </View>
);

export const MenubarSeparator = () => <View className="my-1 h-px bg-border" />;

