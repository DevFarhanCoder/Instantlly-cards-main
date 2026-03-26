import React from "react";
import { Pressable, Text, View } from "react-native";
import { cn } from "../../lib/utils";

export const ToastProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const ToastViewport = ({ className }: { className?: string }) => (
  <View className={cn("p-4", className)} />
);

export const Toast = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => <View className={cn("rounded-xl border border-border bg-card p-3", className)}>{children}</View>;

export const ToastTitle = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <Text className={cn("text-sm font-semibold text-foreground", className)}>{children}</Text>
);

export const ToastDescription = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <Text className={cn("text-xs text-muted-foreground", className)}>{children}</Text>
);

export const ToastClose = ({ onPress, className }: { onPress?: () => void; className?: string }) => (
  <Pressable onPress={onPress} className={cn("px-2 py-1", className)}>
    <Text className="text-xs text-muted-foreground">Close</Text>
  </Pressable>
);

export const ToastAction = ({
  onPress,
  className,
  children,
}: {
  onPress?: () => void;
  className?: string;
  children: React.ReactNode;
}) => (
  <Pressable onPress={onPress} className={cn("rounded-lg border border-border px-3 py-1", className)}>
    <Text className="text-xs text-foreground">{children}</Text>
  </Pressable>
);

export type ToastProps = React.ComponentProps<typeof Toast>;
export type ToastActionElement = React.ReactElement<typeof ToastAction>;

