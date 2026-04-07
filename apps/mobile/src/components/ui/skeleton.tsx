import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewProps } from "react-native";
import { cn } from "../../lib/utils";

const Skeleton = ({ className, style, ...props }: ViewProps & { className?: string }) => {
  const opacity = useRef(new Animated.Value(0.5)).current;

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
      style={[styles.base, style]}
      {...props}
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, styles.shimmer, { opacity }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: "#e2e8f0",
    overflow: "hidden",
  },
  shimmer: {
    backgroundColor: "#f1f5f9",
  },
});

export { Skeleton };
