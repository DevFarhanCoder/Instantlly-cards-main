import React, { createContext, useContext, useMemo } from "react";
import { Modal, Pressable, View } from "react-native";
import { cn } from "../../lib/utils";

type SheetContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SheetContext = createContext<SheetContextValue | null>(null);

export const Sheet = ({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) => {
  const value = useMemo(() => ({ open, onOpenChange }), [open, onOpenChange]);
  return <SheetContext.Provider value={value}>{children}</SheetContext.Provider>;
};

export const SheetTrigger = ({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactElement;
}) => {
  const ctx = useContext(SheetContext);
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

export const SheetContent = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  const ctx = useContext(SheetContext);
  if (!ctx) return null;
  return (
    <Modal visible={ctx.open} transparent animationType="slide" onRequestClose={() => ctx.onOpenChange(false)}>
      <View className="flex-1 justify-end bg-black/30">
        <Pressable className="absolute inset-0" onPress={() => ctx.onOpenChange(false)} />
        <View className={cn("rounded-t-2xl bg-card p-4", className)}>{children}</View>
      </View>
    </Modal>
  );
};

export const SheetHeader = ({ children }: { children: React.ReactNode }) => (
  <View className="mb-3">{children}</View>
);
export const SheetFooter = ({ children }: { children: React.ReactNode }) => (
  <View className="mt-3">{children}</View>
);

