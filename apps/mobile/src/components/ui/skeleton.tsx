import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewProps } from "react-native";
import { cn } from "../../lib/utils";
import { useColors } from "../../theme/colors";

const Skeleton = ({ className, style, ...props }: ViewProps & { className?: string }) => {
  const opacity = useRef(new Animated.Value(0.5)).current;
  const colors = useColors();

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <View
      className={cn("rounded-md", className)}
      style={[styles.base, { backgroundColor: colors.muted }, style]}
      {...props}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: colors.secondary, opacity },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
  },
});

export { Skeleton };
