import React, { createContext, useContext, useMemo } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { cn } from "../../lib/utils";

type TooltipContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const TooltipContext = createContext<TooltipContextValue | null>(null);

export const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export const Tooltip = ({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) => {
  const value = useMemo(() => ({ open, onOpenChange }), [open, onOpenChange]);
  return <TooltipContext.Provider value={value}>{children}</TooltipContext.Provider>;
};

export const TooltipTrigger = ({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactElement<any>;
}) => {
  const ctx = useContext(TooltipContext);
  if (!ctx) return children;
  if (asChild && React.isValidElement<any>(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onLongPress: (...args: any[]) => {
        const existing = (children as any).props?.onLongPress;
        if (existing) existing(...args);
        ctx.onOpenChange(true);
      },
    });
  }
  return <Pressable onLongPress={() => ctx.onOpenChange(true)}>{children}</Pressable>;
};

export const TooltipContent = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  const ctx = useContext(TooltipContext);
  if (!ctx) return null;
  return (
    <Modal visible={ctx.open} transparent animationType="fade" onRequestClose={() => ctx.onOpenChange(false)}>
      <View className="flex-1 items-center justify-center bg-black/30 px-4">
        <Pressable className="absolute inset-0" onPress={() => ctx.onOpenChange(false)} />
        <View className={cn("rounded-lg bg-foreground px-3 py-2", className)}>
          <Text className="text-xs text-background">{children}</Text>
        </View>
      </View>
    </Modal>
  );
};
