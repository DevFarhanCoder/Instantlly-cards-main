import React from "react";
import { Text, View } from "react-native";
import { cn } from "../../lib/utils";

export const Table = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <View className={cn("w-full", className)}>{children}</View>
);

export const TableHeader = ({ children }: { children: React.ReactNode }) => <View>{children}</View>;
export const TableBody = ({ children }: { children: React.ReactNode }) => <View>{children}</View>;
export const TableFooter = ({ children }: { children: React.ReactNode }) => <View>{children}</View>;
export const TableRow = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <View className={cn("flex-row items-center border-b border-border py-2", className)}>{children}</View>
);

export const TableHead = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <Text className={cn("text-xs font-semibold text-muted-foreground flex-1", className)}>{children}</Text>
);

export const TableCell = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <Text className={cn("text-xs text-foreground flex-1", className)}>{children}</Text>
);

export const TableCaption = ({ children }: { children: React.ReactNode }) => (
  <Text className="text-[10px] text-muted-foreground mt-2">{children}</Text>
);

