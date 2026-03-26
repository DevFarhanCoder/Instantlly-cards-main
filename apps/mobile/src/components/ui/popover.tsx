import React, { createContext, useContext, useMemo } from "react";
import { Modal, Pressable, View } from "react-native";
import { cn } from "../../lib/utils";

type PopoverContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const PopoverContext = createContext<PopoverContextValue | null>(null);

export const Popover = ({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) => {
  const value = useMemo(() => ({ open, onOpenChange }), [open, onOpenChange]);
  return <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>;
};

export const PopoverTrigger = ({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactElement;
}) => {
  const ctx = useContext(PopoverContext);
  if (!ctx) return children;
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onPress: (...args: any[]) => {
        const existing = (children as any).props?.onPress;
        if (existing) existing(...args);
        ctx.onOpenChange(true);
      },
    });
  }
  return <Pressable onPress={() => ctx.onOpenChange(true)}>{children}</Pressable>;
};

export const PopoverContent = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  const ctx = useContext(PopoverContext);
  if (!ctx) return null;
  return (
    <Modal visible={ctx.open} transparent animationType="fade" onRequestClose={() => ctx.onOpenChange(false)}>
      <View className="flex-1 items-center justify-center bg-black/30 px-4">
        <Pressable className="absolute inset-0" onPress={() => ctx.onOpenChange(false)} />
        <View className={cn("rounded-xl border border-border bg-card p-4", className)}>{children}</View>
      </View>
    </Modal>
  );
};

