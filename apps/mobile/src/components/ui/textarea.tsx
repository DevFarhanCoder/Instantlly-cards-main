import React from "react";
import { TextInput, TextInputProps } from "react-native";
import { cn } from "../../lib/utils";

export interface TextareaProps extends TextInputProps {
  className?: string;
}

const Textarea = React.forwardRef<TextInput, TextareaProps>(
  ({ className, placeholderTextColor = "#6a7181", ...props }, ref) => {
    return (
      <TextInput
        ref={ref}
        multiline
        className={cn(
          "min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground",
          className
        )}
        placeholderTextColor={placeholderTextColor}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };
