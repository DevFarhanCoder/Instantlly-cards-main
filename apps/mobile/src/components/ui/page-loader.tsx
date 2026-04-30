import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, View } from "react-native";
import { useColors } from "../../theme/colors";

interface PageLoaderProps {
  fullScreen?: boolean;
}

const PageLoader = ({ fullScreen = true }: PageLoaderProps) => {
  const scale = useRef(new Animated.Value(0.9)).current;
  const colors = useColors();

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.1, duration: 600, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.9, duration: 600, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  if (fullScreen) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={{ alignItems: "center", paddingVertical: 40 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <ActivityIndicator size="small" color={colors.primary} />
      </Animated.View>
    </View>
  );
};

export { PageLoader };
