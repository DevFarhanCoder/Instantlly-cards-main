import React, { createContext, useContext, useMemo } from "react";
import { Modal, Pressable, View } from "react-native";
import { cn } from "../../lib/utils";

type HoverCardContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const HoverCardContext = createContext<HoverCardContextValue | null>(null);

export const HoverCard = ({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) => {
  const value = useMemo(() => ({ open, onOpenChange }), [open, onOpenChange]);
  return <HoverCardContext.Provider value={value}>{children}</HoverCardContext.Provider>;
};

export const HoverCardTrigger = ({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactElement<any>;
}) => {
  const ctx = useContext(HoverCardContext);
  if (!ctx) return children;
  if (asChild && React.isValidElement<any>(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onPress: (...args: any[]) => {
        const existing = (children as any).props?.onPress;
        if (existing) existing(...args);
        ctx.onOpenChange(true);
      },
    });
  }
  return <Pressable onPress={() => ctx.onOpenChange(true)}>{children}</Pressable>;
};

export const HoverCardContent = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  const ctx = useContext(HoverCardContext);
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
