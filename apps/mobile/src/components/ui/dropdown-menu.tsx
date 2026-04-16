import React, { createContext, useContext, useRef, useMemo, useState, useCallback } from "react";
import { Dimensions, Modal, Pressable, Text, View } from "react-native";
import { cn } from "../../lib/utils";

type TriggerLayout = { x: number; y: number; width: number; height: number };

type DropdownContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerLayout: TriggerLayout | null;
  setTriggerLayout: (layout: TriggerLayout | null) => void;
};

const DropdownContext = createContext<DropdownContextValue | null>(null);

export const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [triggerLayout, setTriggerLayout] = useState<TriggerLayout | null>(null);
  const value = useMemo(() => ({ open, setOpen, triggerLayout, setTriggerLayout }), [open, triggerLayout]);
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
  const triggerRef = useRef<View>(null);
  if (!context) return children;
  const { setOpen, setTriggerLayout } = context;

  const handlePress = useCallback((...args: any[]) => {
    const existing = (children as any).props?.onPress;
    if (existing) existing(...args);
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setTriggerLayout({ x, y, width, height });
      setOpen(true);
    });
  }, [children, setOpen, setTriggerLayout]);

  if (asChild && React.isValidElement<any>(children)) {
    return (
      <View ref={triggerRef} collapsable={false}>
        {React.cloneElement(children as React.ReactElement<any>, {
          onPress: handlePress,
        })}
      </View>
    );
  }

  return (
    <View ref={triggerRef} collapsable={false}>
      <Pressable onPress={handlePress}>{children}</Pressable>
    </View>
  );
};

const MENU_WIDTH = 220;

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
  const { open, setOpen, triggerLayout } = context;

  const screen = Dimensions.get("window");

  // Position the menu below the trigger, aligned to the right edge by default
  let menuTop = 0;
  let menuLeft = 0;

  if (triggerLayout) {
    menuTop = triggerLayout.y + triggerLayout.height + 4;

    if (align === "end") {
      menuLeft = triggerLayout.x + triggerLayout.width - MENU_WIDTH;
    } else if (align === "start") {
      menuLeft = triggerLayout.x;
    } else {
      menuLeft = triggerLayout.x + triggerLayout.width / 2 - MENU_WIDTH / 2;
    }

    // Clamp so it doesn't overflow off screen
    if (menuLeft < 8) menuLeft = 8;
    if (menuLeft + MENU_WIDTH > screen.width - 8) menuLeft = screen.width - 8 - MENU_WIDTH;

    // If menu would go below the screen, show it above the trigger instead
    // (estimate max menu height ~350)
    if (menuTop + 350 > screen.height) {
      menuTop = triggerLayout.y - 350 - 4;
      if (menuTop < 8) menuTop = 8;
    }
  }

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => setOpen(false)}
    >
      <View className="flex-1 bg-black/30">
        <Pressable className="absolute inset-0" onPress={() => setOpen(false)} />
        <View
          style={{
            position: "absolute",
            top: menuTop,
            left: menuLeft,
            width: MENU_WIDTH,
          }}
          className={cn(
            "rounded-2xl border border-border bg-card p-2 shadow-lg",
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
