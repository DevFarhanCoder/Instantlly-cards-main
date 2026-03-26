import React from "react";
import { Image, Text, View } from "react-native";
import { cn } from "../../lib/utils";

export const Avatar = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <View className={cn("h-10 w-10 rounded-full overflow-hidden bg-muted items-center justify-center", className)}>
    {children}
  </View>
);

export const AvatarImage = ({
  src,
  className,
}: {
  src?: string;
  className?: string;
}) =>
  src ? (
    <Image source={{ uri: src }} style={{ height: "100%", width: "100%" }} className={className} />
  ) : null;

export const AvatarFallback = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <View className={cn("items-center justify-center", className)}>
    <Text className="text-sm font-semibold text-foreground">{children}</Text>
  </View>
);

