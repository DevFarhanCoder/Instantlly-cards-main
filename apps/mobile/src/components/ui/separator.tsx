import React from "react";
import { View, ViewProps } from "react-native";
import { cn } from "../../lib/utils";

export const Separator = ({ className, ...props }: ViewProps & { className?: string }) => {
  return <View className={cn("h-px w-full bg-border", className)} {...props} />;
};
