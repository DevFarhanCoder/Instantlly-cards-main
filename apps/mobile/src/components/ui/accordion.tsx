import React, { createContext, useContext, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { cn } from "../../lib/utils";

type AccordionContextValue = {
  value: string | null;
  setValue: (val: string | null) => void;
  collapsible?: boolean;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);

export const Accordion = ({
  value,
  defaultValue,
  onValueChange,
  collapsible = true,
  children,
}: {
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (val: string | null) => void;
  collapsible?: boolean;
  children: React.ReactNode;
}) => {
  const [internalValue, setInternalValue] = useState<string | null>(
    defaultValue ?? null
  );
  const currentValue = value !== undefined ? value : internalValue;
  const setValue = (val: string | null) => {
    if (value === undefined) setInternalValue(val);
    onValueChange?.(val);
  };
  const ctx = useMemo(
    () => ({ value: currentValue ?? null, setValue, collapsible }),
    [currentValue, collapsible]
  );
  return <AccordionContext.Provider value={ctx}>{children}</AccordionContext.Provider>;
};

export const AccordionItem = ({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) => {
  return <View className={cn("rounded-xl border border-border", className)}>{children}</View>;
};

export const AccordionTrigger = ({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) => {
  const ctx = useContext(AccordionContext);
  const open = ctx?.value === value;
  return (
    <Pressable
      onPress={() => {
        if (!ctx) return;
        if (open && ctx.collapsible) ctx.setValue(null);
        else ctx.setValue(value);
      }}
      className={cn("flex-row items-center justify-between p-3", className)}
    >
      {typeof children === "string" ? (
        <Text className="text-sm font-semibold text-foreground">{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
};

export const AccordionContent = ({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) => {
  const ctx = useContext(AccordionContext);
  if (!ctx || ctx.value !== value) return null;
  return <View className={cn("px-3 pb-3", className)}>{children}</View>;
};

