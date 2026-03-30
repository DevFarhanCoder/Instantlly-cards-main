import React from "react";
import { Text, View } from "react-native";
import { cn } from "../../lib/utils";
import { Label } from "./label";

export const Form = ({ children }: { children: React.ReactNode }) => (
  <View>{children}</View>
);

export const FormField = ({
  render,
}: {
  render: (props: { field: { value?: any; onChange?: (v: any) => void } }) => React.ReactNode;
}) => {
  return <>{render({ field: {} })}</>;
};

export const FormItem = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <View className={cn("gap-2", className)}>{children}</View>
);

export const FormLabel = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <Label className={cn(className)}>{children}</Label>
);

export const FormControl = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export const FormDescription = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <Text className={cn("text-xs text-muted-foreground", className)}>{children}</Text>
);

export const FormMessage = ({ className, children }: { className?: string; children?: React.ReactNode }) => {
  if (!children) return null;
  return <Text className={cn("text-xs font-medium text-destructive", className)}>{children}</Text>;
};

export const useFormField = () => ({});

