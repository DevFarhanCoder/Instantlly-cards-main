import React from "react";
import { ScrollView } from "react-native";
import { cn } from "../../lib/utils";

export const ScrollArea = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <ScrollView className={cn(className)}>{children}</ScrollView>
);

export const ScrollBar = () => null;

