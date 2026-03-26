import React, { createContext, useContext, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { cn } from "../../lib/utils";

type CollapsibleContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const CollapsibleContext = createContext<CollapsibleContextValue | null>(null);

export const Collapsible = ({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const value = controlledOpen ?? open;
  const setValue = (next: boolean) => {
    if (controlledOpen === undefined) setOpen(next);
    onOpenChange?.(next);
  };
  const ctx = useMemo(() => ({ open: value, setOpen: setValue }), [value]);
  return <CollapsibleContext.Provider value={ctx}>{children}</CollapsibleContext.Provider>;
};

export const CollapsibleTrigger = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  const ctx = useContext(CollapsibleContext);
  return (
    <Pressable onPress={() => ctx?.setOpen(!ctx.open)} className={cn(className)}>
      {children}
    </Pressable>
  );
};

export const CollapsibleContent = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  const ctx = useContext(CollapsibleContext);
  if (!ctx?.open) return null;
  return <View className={cn(className)}>{children}</View>;
};

