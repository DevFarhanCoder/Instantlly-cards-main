import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, View } from "react-native";

interface PageLoaderProps {
  fullScreen?: boolean;
}

const PageLoader = ({ fullScreen = true }: PageLoaderProps) => {
  const scale = useRef(new Animated.Value(0.9)).current;

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
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f7f7f7" }}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <ActivityIndicator size="large" color="#2463eb" />
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={{ alignItems: "center", paddingVertical: 40 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <ActivityIndicator size="small" color="#2463eb" />
      </Animated.View>
    </View>
  );
};

export { PageLoader };
