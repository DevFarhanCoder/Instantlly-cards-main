import { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { ArrowLeft, ChevronDown } from "lucide-react-native";
import { useIconColor } from "../../theme/colors";

type AppHeaderProps = {
  title: string;
  onBack?: () => void;
  rightAction?: ReactNode;
  rightWidth?: number;
  leftWidth?: number;
  className?: string;
  titleClassName?: string;
  switchLabel?: string;
  onSwitchPress?: () => void;
  switchIcon?: ReactNode;
  switchClassName?: string;
};

export const AppHeader = ({
  title,
  onBack,
  rightAction,
  rightWidth = 44,
  leftWidth = 44,
  className = "border-b border-border bg-card",
  titleClassName = "text-lg font-bold text-foreground",
  switchLabel,
  onSwitchPress,
  switchIcon,
  switchClassName,
}: AppHeaderProps) => {
  const iconColor = useIconColor();
  return (
    <View className={className}>
      <View className="flex-row items-center px-4 py-3">
        <View style={{ width: leftWidth }} className="h-11 justify-center">
          {onBack ? (
            <Pressable
              onPress={onBack}
              className="h-11 w-11 items-start justify-center"
              hitSlop={8}
            >
              <ArrowLeft size={20} color={iconColor} />
            </Pressable>
          ) : (
            <View className="h-11 w-11" />
          )}
        </View>

        <View className="flex-1 px-2">
          <Text className={`${titleClassName} text-center`} numberOfLines={1} ellipsizeMode="tail">
            {title}
          </Text>
        </View>

        <View style={{ width: rightWidth }} className="h-11 justify-center items-end">
          {rightAction ? rightAction : <View className="h-11 w-full" />}
        </View>
      </View>

      {switchLabel && onSwitchPress ? (
        <View className="px-4 pb-3">
          <Pressable
            onPress={onSwitchPress}
            className={
              switchClassName ||
              "min-h-[44px] w-full flex-row items-center rounded-xl border border-border bg-muted px-3 py-2"
            }
          >
            <Text
              className="flex-1 text-sm font-semibold text-foreground"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {switchLabel}
            </Text>
            {switchIcon || <ChevronDown size={16} color="#2563eb" />}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};
