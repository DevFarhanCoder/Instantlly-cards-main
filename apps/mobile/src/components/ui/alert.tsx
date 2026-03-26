import React from "react";
import { Text, View } from "react-native";
import { cn } from "../../lib/utils";

type AlertVariant = "default" | "destructive";

export const Alert = ({
  variant = "default",
  className,
  children,
}: {
  variant?: AlertVariant;
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <View
      className={cn(
        "rounded-xl border border-border bg-card p-4",
        variant === "destructive" && "border-destructive/40 bg-destructive/10",
        className
      )}
    >
      {children}
    </View>
  );
};

export const AlertTitle = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <Text className={cn("text-sm font-semibold text-foreground", className)}>
    {children}
  </Text>
);

export const AlertDescription = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <Text className={cn("mt-1 text-xs text-muted-foreground", className)}>
    {children}
  </Text>
);

