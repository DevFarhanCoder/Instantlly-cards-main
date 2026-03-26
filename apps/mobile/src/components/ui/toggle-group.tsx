import React, { createContext, useContext, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { cn } from "../../lib/utils";

type ToggleGroupContextValue = {
  value?: string | string[];
  onValueChange?: (v: string | string[]) => void;
  type?: "single" | "multiple";
};

const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(null);

export const ToggleGroup = ({
  value,
  onValueChange,
  type = "single",
  className,
  children,
}: {
  value?: string | string[];
  onValueChange?: (v: string | string[]) => void;
  type?: "single" | "multiple";
  className?: string;
  children: React.ReactNode;
}) => {
  const ctx = useMemo(() => ({ value, onValueChange, type }), [value, onValueChange, type]);
  return (
    <ToggleGroupContext.Provider value={ctx}>
      <View className={cn("flex-row gap-2", className)}>{children}</View>
    </ToggleGroupContext.Provider>
  );
};

export const ToggleGroupItem = ({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) => {
  const ctx = useContext(ToggleGroupContext);
  const isActive =
    ctx?.type === "multiple"
      ? Array.isArray(ctx.value) && ctx.value.includes(value)
      : ctx?.value === value;

  const handlePress = () => {
    if (!ctx?.onValueChange) return;
    if (ctx.type === "multiple") {
      const current = Array.isArray(ctx.value) ? ctx.value : [];
      if (current.includes(value)) {
        ctx.onValueChange(current.filter((v) => v !== value));
      } else {
        ctx.onValueChange([...current, value]);
      }
    } else {
      ctx.onValueChange(value);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      className={cn(
        "rounded-lg border border-border px-3 py-2",
        isActive ? "bg-primary" : "bg-card",
        className
      )}
    >
      {typeof children === "string" ? (
        <Text className={cn("text-sm", isActive ? "text-primary-foreground" : "text-foreground")}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
};

