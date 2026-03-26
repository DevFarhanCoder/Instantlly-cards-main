import React from "react";
import RNSlider from "@react-native-community/slider";
import { View } from "react-native";
import { colors } from "../../theme/colors";

export const Slider = ({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
}: {
  value: number[];
  onValueChange: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
}) => {
  return (
    <View>
      <RNSlider
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value[0] ?? min}
        onValueChange={(v) => onValueChange([v])}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
      />
    </View>
  );
};
