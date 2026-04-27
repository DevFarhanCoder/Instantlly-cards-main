import React from "react";
import { Pressable, Text, View, PressableProps } from "react-native";
import { cn } from "../../lib/utils";
import { useColors } from "../../theme/colors";

type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps extends PressableProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  textClassName?: string;
  asChild?: boolean;
}

const baseClasses =
  "flex-row items-center justify-center gap-2 rounded-md";

const variantClasses: Record<ButtonVariant, { container: string; text: string }> = {
  default: {
    container: "bg-primary",
    text: "text-primary-foreground",
  },
  destructive: {
    container: "bg-destructive",
    text: "text-destructive-foreground",
  },
  outline: {
    container: "border border-input bg-background",
    text: "text-foreground",
  },
  secondary: {
    container: "bg-secondary",
    text: "text-secondary-foreground",
  },
  ghost: {
    container: "bg-transparent",
    text: "text-foreground",
  },
  link: {
    container: "bg-transparent",
    text: "text-primary underline",
  },
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "px-5 py-3",
  sm: "px-4 py-2",
  lg: "px-8 py-4",
  icon: "h-10 w-10",
};

const Button = React.forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  (
    {
      className,
      textClassName,
      variant = "default",
      size = "default",
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const colors = useColors();
    const classes = cn(
      baseClasses,
      variantClasses[variant].container,
      sizeClasses[size],
      className
    );

    const extractedTextClasses = (className || "")
      .split(" ")
      .filter((c) => c.startsWith("text-"))
      .join(" ");

    const textClasses = cn(
      "text-sm font-medium",
      variantClasses[variant].text,
      extractedTextClasses,
      textClassName
    );

    const resolveTextColor = () => {
      const merged = `${textClassName || ""} ${extractedTextClasses}`.trim();
      if (merged.includes("text-primary-foreground")) return colors.primaryForeground;
      if (merged.includes("text-primary")) return colors.primary;
      if (merged.includes("text-accent-foreground")) return colors.accentForeground;
      if (merged.includes("text-accent")) return colors.accent;
      if (merged.includes("text-muted-foreground")) return colors.mutedForeground;
      if (merged.includes("text-foreground")) return colors.foreground;
      if (merged.includes("text-destructive-foreground")) return colors.destructiveForeground;
      if (merged.includes("text-destructive")) return colors.destructive;
      if (merged.includes("text-success")) return colors.success;
      if (merged.includes("text-warning")) return colors.warning;
      if (merged.includes("text-white")) return "#ffffff";
      if (merged.includes("text-black")) return "#000000";
      switch (variant) {
        case "default":
          return colors.primaryForeground;
        case "destructive":
          return colors.destructiveForeground;
        case "secondary":
          return colors.secondaryForeground;
        case "outline":
        case "ghost":
          return colors.foreground;
        case "link":
          return colors.primary;
        default:
          return colors.foreground;
      }
    };

    const resolveTextStyle = () => {
      const merged = `${textClassName || ""} ${extractedTextClasses}`.trim();
      const style: any = { color: resolveTextColor() };
      if (merged.includes("text-lg")) style.fontSize = 18;
      else if (merged.includes("text-base")) style.fontSize = 16;
      else if (merged.includes("text-sm")) style.fontSize = 14;
      else if (merged.includes("text-xs")) style.fontSize = 12;
      if (merged.includes("font-extrabold")) style.fontWeight = "800";
      else if (merged.includes("font-bold")) style.fontWeight = "700";
      else if (merged.includes("font-semibold")) style.fontWeight = "600";
      else if (merged.includes("font-medium")) style.fontWeight = "500";
      return style;
    };

    const textStyle = resolveTextStyle();

    const wrapTextNodes = (child: React.ReactNode): React.ReactNode => {
      if (typeof child === "string" || typeof child === "number") {
        return (
          <Text className={textClasses} style={textStyle}>
            {child}
          </Text>
        );
      }
      if (!React.isValidElement(child)) return child;
      if (child.type === Text) return child;
      // Only recurse into View and Fragment — leave SVG icons and other elements untouched
      if (child.type !== View && child.type !== React.Fragment) return child;
      const childProps: any = child.props ?? {};
      if (childProps.children == null) return child;
      const wrappedChildren = React.Children.map(childProps.children, wrapTextNodes);
      if (child.type === React.Fragment) {
        return <React.Fragment>{wrappedChildren}</React.Fragment>;
      }
      return React.cloneElement(child, { ...childProps, children: wrappedChildren });
    };

    const renderedChildren =
      typeof children === "function" ? children : React.Children.map(children, wrapTextNodes);

    return (
      <Pressable ref={ref} className={classes} disabled={disabled} {...props}>
        {renderedChildren}
      </Pressable>
    );
  }
);

Button.displayName = "Button";

export { Button };
