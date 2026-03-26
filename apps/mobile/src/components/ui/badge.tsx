import React from "react";
import { Text, View } from "react-native";
import { cn } from "../../lib/utils";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  textClassName?: string;
  children: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, { container: string; text: string }> = {
  default: {
    container: "bg-primary",
    text: "text-primary-foreground",
  },
  secondary: {
    container: "bg-secondary",
    text: "text-secondary-foreground",
  },
  destructive: {
    container: "bg-destructive",
    text: "text-destructive-foreground",
  },
  outline: {
    container: "border border-input",
    text: "text-foreground",
  },
};

const Badge = ({
  variant = "default",
  className,
  textClassName,
  children,
}: BadgeProps) => {
  const extractedTextClasses = (className || "")
    .split(" ")
    .filter((c) => c.startsWith("text-"))
    .join(" ");

  const renderedChildren = React.Children.map(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      return (
        <Text
          className={cn(
            "text-xs font-semibold",
            variantClasses[variant].text,
            extractedTextClasses,
            textClassName
          )}
        >
          {child}
        </Text>
      );
    }
    return child;
  });

  return (
    <View
      className={cn(
        "rounded-full px-2.5 py-0.5",
        variantClasses[variant].container,
        className
      )}
    >
      {renderedChildren}
    </View>
  );
};

export { Badge };
