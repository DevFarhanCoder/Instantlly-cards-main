import React from "react";
import { View } from "react-native";
import { cn } from "../../lib/utils";

export const ResizablePanelGroup = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <View className={cn("flex-1", className)}>{children}</View>
);

export const ResizablePanel = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <View className={cn("flex-1", className)}>{children}</View>
);

export const ResizableHandle = ({ className }: { className?: string }) => (
  <View className={cn("h-px bg-border my-2", className)} />
);

