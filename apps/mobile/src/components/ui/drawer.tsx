import React, { createContext, useContext, useMemo } from "react";
import { Modal, Pressable, View } from "react-native";
import { cn } from "../../lib/utils";

type DrawerContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DrawerContext = createContext<DrawerContextValue | null>(null);

export const Drawer = ({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) => {
  const value = useMemo(() => ({ open, onOpenChange }), [open, onOpenChange]);
  return <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>;
};

export const DrawerContent = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  const ctx = useContext(DrawerContext);
  if (!ctx) return null;
  return (
    <Modal
      visible={ctx.open}
      transparent
      animationType="slide"
      onRequestClose={() => ctx.onOpenChange(false)}
    >
      <View className="flex-1 justify-end bg-black/30">
        <Pressable className="absolute inset-0" onPress={() => ctx.onOpenChange(false)} />
        <View className={cn("rounded-t-2xl bg-card p-4", className)}>{children}</View>
      </View>
    </Modal>
  );
};

export const DrawerHeader = ({ children }: { children: React.ReactNode }) => (
  <View className="mb-3">{children}</View>
);

export const DrawerFooter = ({ children }: { children: React.ReactNode }) => (
  <View className="mt-3">{children}</View>
);

