import React, { createContext, useContext } from "react";
import { View } from "react-native";
import { cn } from "../../lib/utils";

export type ChartConfig = Record<string, { label?: React.ReactNode; icon?: React.ComponentType; color?: string }>;

const ChartContext = createContext<{ config: ChartConfig } | null>(null);

export const ChartContainer = ({
  config,
  className,
  children,
}: {
  config: ChartConfig;
  className?: string;
  children: React.ReactNode;
}) => (
  <ChartContext.Provider value={{ config }}>
    <View className={cn("w-full", className)}>{children}</View>
  </ChartContext.Provider>
);

export const ChartTooltip = () => null;
export const ChartTooltipContent = () => null;
export const ChartLegend = () => null;
export const ChartLegendContent = () => null;
export const ChartStyle = () => null;

export const useChart = () => {
  const ctx = useContext(ChartContext);
  if (!ctx) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return ctx;
};

