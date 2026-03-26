import React, { createContext, useContext } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { cn } from "../../lib/utils";

type DialogContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export const Dialog = ({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) => {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
};

export const DialogContent = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  const context = useContext(DialogContext);
  if (!context) return null;
  const { open, onOpenChange } = context;

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-4">
        <Pressable className="absolute inset-0" onPress={() => onOpenChange(false)} />
        <View className={cn("w-full max-w-md rounded-2xl bg-card p-4", className)}>
          {children}
        </View>
      </View>
    </Modal>
  );
};

export const DialogHeader = ({ children }: { children: React.ReactNode }) => (
  <View className="mb-3">{children}</View>
);

export const DialogTitle = ({ children }: { children: React.ReactNode }) => (
  <Text className="text-base font-bold text-foreground">{children}</Text>
);

export const DialogDescription = ({
  children,
}: {
  children: React.ReactNode;
}) => <Text className="mt-2 text-xs text-muted-foreground">{children}</Text>;

export const DialogFooter = ({ children }: { children: React.ReactNode }) => (
  <View className="mt-3">{children}</View>
);
