import React from "react";
import { View, ViewProps } from "react-native";
import { cn } from "../../lib/utils";

const Skeleton = ({ className, ...props }: ViewProps & { className?: string }) => {
  return (
    <View
      className={cn("rounded-md bg-muted opacity-80", className)}
      {...props}
    />
  );
};

export { Skeleton };
