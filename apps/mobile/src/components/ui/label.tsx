import React from "react";
import { Text } from "react-native";
import { cn } from "../../lib/utils";

export const Label = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <Text className={cn("text-sm font-medium text-foreground", className)}>
      {children}
    </Text>
  );
};
