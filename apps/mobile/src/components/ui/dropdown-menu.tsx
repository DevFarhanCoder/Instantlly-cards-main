import React, { createContext, useContext, useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { cn } from "../../lib/utils";

type DropdownContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DropdownContext = createContext<DropdownContextValue | null>(null);

export const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open, setOpen }), [open]);
  return <DropdownContext.Provider value={value}>{children}</DropdownContext.Provider>;
};

export const DropdownMenuTrigger = ({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactElement<any>;
}) => {
  const context = useContext(DropdownContext);
  if (!context) return children;
  const { setOpen } = context;

  if (asChild && React.isValidElement<any>(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onPress: (...args: any[]) => {
        const existing = (children as any).props?.onPress;
        if (existing) existing(...args);
        setOpen(true);
      },
    });
  }

  return (
    <Pressable onPress={() => setOpen(true)}>{children}</Pressable>
  );
};

export const DropdownMenuContent = ({
  align = "end",
  className,
  children,
}: {
  align?: "start" | "center" | "end";
  className?: string;
  children: React.ReactNode;
}) => {
  const context = useContext(DropdownContext);
  if (!context) return null;
  const { open, setOpen } = context;

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => setOpen(false)}
    >
      <View className="flex-1 justify-end bg-black/30">
        <Pressable className="absolute inset-0" onPress={() => setOpen(false)} />
        <View
          className={cn(
            "mx-4 mb-6 rounded-2xl border border-border bg-card p-2 shadow-lg",
            align === "start" && "self-start",
            align === "center" && "self-center",
            align === "end" && "self-end",
            className
          )}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
};

export const DropdownMenuItem = ({
  onPress,
  className,
  children,
}: {
  onPress?: () => void;
  className?: string;
  children: React.ReactNode;
}) => {
  const context = useContext(DropdownContext);
  if (!context) return null;
  const { setOpen } = context;

  const extractedTextClasses = (className || "")
    .split(" ")
    .filter((c) => c.startsWith("text-"))
    .join(" ");

  const renderedChildren = React.Children.map(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      return (
        <Text className={cn("text-sm text-foreground", extractedTextClasses)}>
          {child}
        </Text>
      );
    }
    return child;
  });

  return (
    <Pressable
      onPress={() => {
        onPress?.();
        setOpen(false);
      }}
      className={cn(
        "flex-row items-center gap-2 rounded-lg px-3 py-2",
        className
      )}
    >
      {renderedChildren}
    </Pressable>
  );
};

export const DropdownMenuSeparator = () => (
  <View className="my-1 h-px bg-border" />
);
