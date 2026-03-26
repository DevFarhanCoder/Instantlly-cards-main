import React, { createContext, useContext, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { cn } from "../../lib/utils";

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

export const Tabs = ({
  value,
  defaultValue,
  onValueChange,
  className,
  children,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}) => {
  const [internal, setInternal] = useState(defaultValue ?? "");
  const current = value ?? internal;

  const setValue = (next: string) => {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  };

  const ctx = useMemo(() => ({ value: current, setValue }), [current]);

  return (
    <TabsContext.Provider value={ctx}>
      <View className={className}>{children}</View>
    </TabsContext.Provider>
  );
};

export const TabsList = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => <View className={cn("flex-row", className)}>{children}</View>;

export const TabsTrigger = ({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) => {
  const context = useContext(TabsContext);
  if (!context) return null;
  const active = context.value === value;
  return (
    <Pressable
      onPress={() => context.setValue(value)}
      className={cn(
        "rounded-lg px-3 py-2",
        active ? "bg-background" : "bg-transparent",
        className
      )}
    >
      <Text className={cn("text-xs", active ? "text-foreground" : "text-muted-foreground")}>
        {children}
      </Text>
    </Pressable>
  );
};

export const TabsContent = ({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) => {
  const context = useContext(TabsContext);
  if (!context || context.value !== value) return null;
  return <View className={className}>{children}</View>;
};
