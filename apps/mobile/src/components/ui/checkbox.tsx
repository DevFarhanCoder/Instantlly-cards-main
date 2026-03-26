import React from "react";
import { Pressable, View } from "react-native";
import { Check } from "lucide-react-native";
import { cn } from "../../lib/utils";
import { colors } from "../../theme/colors";

export const Checkbox = ({
  checked,
  onCheckedChange,
  className,
}: {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
}) => {
  return (
    <Pressable
      onPress={() => onCheckedChange?.(!checked)}
      className={cn(
        "h-5 w-5 rounded-md border border-border items-center justify-center",
        checked ? "bg-primary" : "bg-background",
        className
      )}
    >
      {checked ? <Check size={12} color={colors.primaryForeground} /> : null}
    </Pressable>
  );
};

