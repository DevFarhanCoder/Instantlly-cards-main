import React from "react";
import { Pressable, Text, View } from "react-native";
import { cn } from "../../lib/utils";

export const Pagination = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <View className={cn("flex-row items-center gap-2", className)}>{children}</View>
);

export const PaginationContent = ({ children }: { children: React.ReactNode }) => (
  <View className="flex-row items-center gap-2">{children}</View>
);

export const PaginationItem = ({ children }: { children: React.ReactNode }) => <View>{children}</View>;

export const PaginationLink = ({
  isActive,
  onPress,
  className,
  children,
}: {
  isActive?: boolean;
  onPress?: () => void;
  className?: string;
  children: React.ReactNode;
}) => (
  <Pressable
    onPress={onPress}
    className={cn(
      "h-8 min-w-[32px] items-center justify-center rounded-md border border-border px-2",
      isActive && "bg-primary",
      className
    )}
  >
    <Text className={cn("text-xs", isActive ? "text-primary-foreground" : "text-foreground")}>
      {children}
    </Text>
  </Pressable>
);

export const PaginationPrevious = PaginationLink;
export const PaginationNext = PaginationLink;
export const PaginationEllipsis = () => <Text className="text-xs text-muted-foreground">...</Text>;

