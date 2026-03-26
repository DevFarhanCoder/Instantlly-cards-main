import React from "react";
import { Pressable, Text, View } from "react-native";
import { cn } from "../../lib/utils";

export const Breadcrumb = ({ children }: { children: React.ReactNode }) => (
  <View className="flex-row items-center">{children}</View>
);

export const BreadcrumbList = ({ children }: { children: React.ReactNode }) => (
  <View className="flex-row items-center flex-wrap">{children}</View>
);

export const BreadcrumbItem = ({ children }: { children: React.ReactNode }) => (
  <View className="flex-row items-center">{children}</View>
);

export const BreadcrumbLink = ({
  onPress,
  className,
  children,
}: {
  onPress?: () => void;
  className?: string;
  children: React.ReactNode;
}) => (
  <Pressable onPress={onPress}>
    <Text className={cn("text-xs text-primary", className)}>{children}</Text>
  </Pressable>
);

export const BreadcrumbPage = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <Text className={cn("text-xs text-muted-foreground", className)}>{children}</Text>
);

export const BreadcrumbSeparator = ({ children }: { children?: React.ReactNode }) => (
  <Text className="mx-1 text-xs text-muted-foreground">{children ?? "/"}</Text>
);

