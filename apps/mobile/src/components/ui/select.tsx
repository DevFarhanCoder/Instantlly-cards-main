import React, { createContext, useContext, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { cn } from "../../lib/utils";

type SelectContextValue = {
  value: string;
  setValue: (value: string, label?: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  label: string | null;
};

const SelectContext = createContext<SelectContextValue | null>(null);

export const Select = ({
  value,
  onValueChange,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState<string | null>(null);

  const setValue = (next: string, nextLabel?: string) => {
    onValueChange(next);
    if (nextLabel) setLabel(nextLabel);
  };

  const ctx = useMemo(
    () => ({ value, setValue, open, setOpen, label }),
    [value, open, label]
  );

  return <SelectContext.Provider value={ctx}>{children}</SelectContext.Provider>;
};

export const SelectTrigger = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  const context = useContext(SelectContext);
  if (!context) return null;
  return (
    <Pressable
      onPress={() => context.setOpen(true)}
      className={cn(
        "h-10 w-full flex-row items-center justify-between rounded-md border border-input bg-background px-3",
        className
      )}
    >
      {children}
    </Pressable>
  );
};

export const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const context = useContext(SelectContext);
  if (!context) return null;
  const display = context.label || context.value || placeholder || "";
  return (
    <Text className={cn("text-sm", display ? "text-foreground" : "text-muted-foreground")}>
      {display || placeholder}
    </Text>
  );
};

export const SelectContent = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const context = useContext(SelectContext);
  if (!context) return null;
  return (
    <Modal
      visible={context.open}
      transparent
      animationType="fade"
      onRequestClose={() => context.setOpen(false)}
    >
      <View className="flex-1 justify-end bg-black/30">
        <Pressable className="absolute inset-0" onPress={() => context.setOpen(false)} />
        <View
          className="mx-4 mb-6 rounded-2xl border border-border bg-card shadow-lg"
          style={{ maxHeight: "60%" }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            bounces={false}
            style={{ padding: 8 }}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export const SelectItem = ({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) => {
  const context = useContext(SelectContext);
  if (!context) return null;
  const isSelected = context.value === value;
  const label =
    typeof children === "string" || typeof children === "number"
      ? String(children)
      : undefined;

  return (
    <Pressable
      onPress={() => {
        context.setValue(value, label);
        context.setOpen(false);
      }}
      className={cn(
        "rounded-lg px-3 py-2.5 flex-row items-center",
        isSelected ? "bg-primary/10" : "",
        className
      )}
    >
      <Text
        className={cn(
          "text-sm flex-1",
          isSelected ? "text-primary font-semibold" : "text-foreground"
        )}
      >
        {children}
      </Text>
      {isSelected && (
        <Text className="text-primary font-bold text-base ml-2">{"\u2713"}</Text>
      )}
    </Pressable>
  );
};
