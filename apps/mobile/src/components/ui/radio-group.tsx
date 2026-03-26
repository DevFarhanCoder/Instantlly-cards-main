import React, { createContext, useContext, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { cn } from "../../lib/utils";

type RadioGroupContextValue = {
  value?: string;
  onValueChange?: (v: string) => void;
};

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export const RadioGroup = ({
  value,
  onValueChange,
  className,
  children,
}: {
  value?: string;
  onValueChange?: (v: string) => void;
  className?: string;
  children: React.ReactNode;
}) => {
  const ctx = useMemo(() => ({ value, onValueChange }), [value, onValueChange]);
  return (
    <RadioGroupContext.Provider value={ctx}>
      <View className={cn("gap-2", className)}>{children}</View>
    </RadioGroupContext.Provider>
  );
};

export const RadioGroupItem = ({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children?: React.ReactNode;
}) => {
  const ctx = useContext(RadioGroupContext);
  const checked = ctx?.value === value;
  return (
    <Pressable
      onPress={() => ctx?.onValueChange?.(value)}
      className={cn("flex-row items-center gap-2", className)}
    >
      <View
        className={cn(
          "h-4 w-4 rounded-full border border-border items-center justify-center",
          checked && "border-primary"
        )}
      >
        {checked ? <View className="h-2 w-2 rounded-full bg-primary" /> : null}
      </View>
      {typeof children === "string" ? (
        <Text className="text-sm text-foreground">{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
};

