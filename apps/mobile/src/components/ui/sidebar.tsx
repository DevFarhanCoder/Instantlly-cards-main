import React from "react";
import { View } from "react-native";
import { cn } from "../../lib/utils";

export const Sidebar = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <View className={cn("bg-card p-4", className)}>{children}</View>
);

export const SidebarHeader = ({ children }: { children: React.ReactNode }) => (
  <View className="mb-3">{children}</View>
);

export const SidebarContent = ({ children }: { children: React.ReactNode }) => (
  <View>{children}</View>
);

export const SidebarFooter = ({ children }: { children: React.ReactNode }) => (
  <View className="mt-3">{children}</View>
);

