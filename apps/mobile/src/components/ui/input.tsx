import React from "react";
import { TextInput, TextInputProps } from "react-native";
import { cn } from "../../lib/utils";

export interface InputProps extends TextInputProps {
  className?: string;
}

const Input = React.forwardRef<TextInput, InputProps>(
  ({ className, placeholderTextColor = "#6a7181", ...props }, ref) => {
    return (
      <TextInput
        ref={ref}
        className={cn(
          "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground",
          className
        )}
        placeholderTextColor={placeholderTextColor}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
