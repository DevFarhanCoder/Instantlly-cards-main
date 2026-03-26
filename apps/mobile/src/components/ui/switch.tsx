import React from "react";
import { Pressable, View } from "react-native";
import { cn } from "../../lib/utils";

export const Switch = ({
  checked,
  onCheckedChange,
  className,
}: {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
}) => {
  return (
    <Pressable
      onPress={() => onCheckedChange?.(!checked)}
      className={cn(
        "h-6 w-11 rounded-full border border-border p-0.5",
        checked ? "bg-primary" : "bg-muted",
        className
      )}
    >
      <View
        className={cn(
          "h-5 w-5 rounded-full bg-white",
          checked ? "ml-auto" : "mr-auto"
        )}
      />
    </Pressable>
  );
};
