import React, { createContext, useContext, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { cn } from "../../lib/utils";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "./dialog";

type AlertDialogContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const AlertDialogContext = createContext<AlertDialogContextValue | null>(null);

export const AlertDialog = ({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) => {
  const value = useMemo(() => ({ open, onOpenChange }), [open, onOpenChange]);
  return <AlertDialogContext.Provider value={value}>{children}</AlertDialogContext.Provider>;
};

export const AlertDialogTrigger = ({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactElement<any>;
}) => {
  const ctx = useContext(AlertDialogContext);
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

export const AlertDialogContent = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  const ctx = useContext(AlertDialogContext);
  if (!ctx) return null;
  return (
    <Dialog open={ctx.open} onOpenChange={ctx.onOpenChange}>
      <DialogContent className={cn("max-w-sm", className)}>{children}</DialogContent>
    </Dialog>
  );
};

export const AlertDialogHeader = DialogHeader;
export const AlertDialogFooter = DialogFooter;
export const AlertDialogTitle = DialogTitle;
export const AlertDialogDescription = DialogDescription;

export const AlertDialogAction = ({
  onPress,
  className,
  children,
}: {
  onPress?: () => void;
  className?: string;
  children: React.ReactNode;
}) => {
  const ctx = useContext(AlertDialogContext);
  return (
    <Pressable
      onPress={() => {
        onPress?.();
        ctx?.onOpenChange(false);
      }}
      className={cn("rounded-lg bg-primary px-4 py-2", className)}
    >
      <Text className="text-sm font-semibold text-primary-foreground">{children}</Text>
    </Pressable>
  );
};

export const AlertDialogCancel = ({
  onPress,
  className,
  children,
}: {
  onPress?: () => void;
  className?: string;
  children: React.ReactNode;
}) => {
  const ctx = useContext(AlertDialogContext);
  return (
    <Pressable
      onPress={() => {
        onPress?.();
        ctx?.onOpenChange(false);
      }}
      className={cn("rounded-lg border border-border px-4 py-2", className)}
    >
      <Text className="text-sm font-semibold text-foreground">{children}</Text>
    </Pressable>
  );
};
