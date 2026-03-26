import React from "react";
import { Pressable, Text } from "react-native";
import { cn } from "../../lib/utils";

export const Toggle = ({
  pressed,
  onPressedChange,
  className,
  children,
}: {
  pressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  className?: string;
  children: React.ReactNode;
}) => (
  <Pressable
    onPress={() => onPressedChange?.(!pressed)}
    className={cn(
      "rounded-lg border border-border px-3 py-2",
      pressed ? "bg-primary" : "bg-card",
      className
    )}
  >
    {typeof children === "string" ? (
      <Text className={cn("text-sm", pressed ? "text-primary-foreground" : "text-foreground")}>
        {children}
      </Text>
    ) : (
      children
    )}
  </Pressable>
);

