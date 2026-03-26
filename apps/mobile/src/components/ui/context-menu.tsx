import React, { createContext, useContext, useMemo } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { cn } from "../../lib/utils";

type ContextMenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null);

export const ContextMenu = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false);
  const value = useMemo(() => ({ open, setOpen }), [open]);
  return <ContextMenuContext.Provider value={value}>{children}</ContextMenuContext.Provider>;
};

export const ContextMenuTrigger = ({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactElement;
}) => {
  const ctx = useContext(ContextMenuContext);
  if (!ctx) return children;
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onLongPress: (...args: any[]) => {
        const existing = (children as any).props?.onLongPress;
        if (existing) existing(...args);
        ctx.setOpen(true);
      },
    });
  }
  return <Pressable onLongPress={() => ctx.setOpen(true)}>{children}</Pressable>;
};

export const ContextMenuContent = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  const ctx = useContext(ContextMenuContext);
  if (!ctx) return null;
  return (
    <Modal visible={ctx.open} transparent animationType="fade" onRequestClose={() => ctx.setOpen(false)}>
      <View className="flex-1 justify-end bg-black/30">
        <Pressable className="absolute inset-0" onPress={() => ctx.setOpen(false)} />
        <View className={cn("mx-4 mb-6 rounded-2xl border border-border bg-card p-2", className)}>
          {children}
        </View>
      </View>
    </Modal>
  );
};

export const ContextMenuItem = ({
  onPress,
  className,
  children,
}: {
  onPress?: () => void;
  className?: string;
  children: React.ReactNode;
}) => {
  const ctx = useContext(ContextMenuContext);
  return (
    <Pressable
      onPress={() => {
        onPress?.();
        ctx?.setOpen(false);
      }}
      className={cn("px-3 py-2 rounded-lg", className)}
    >
      {typeof children === "string" ? (
        <Text className="text-sm text-foreground">{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
};

export const ContextMenuSeparator = () => <View className="my-1 h-px bg-border" />;

