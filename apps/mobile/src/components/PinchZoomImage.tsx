import React, { useMemo, useRef } from "react";
import {
  Animated,
  Image,
  ImageSourcePropType,
  PanResponder,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

type Props = {
  source: ImageSourcePropType;
  style?: ViewStyle;
  minScale?: number;
  maxScale?: number;
};

/**
 * Two-finger pinch + pan zoom built on PanResponder (no native deps).
 * - Pinch with two fingers to zoom.
 * - Drag with one finger to pan while zoomed.
 * - Double-tap to reset.
 */
export const PinchZoomImage: React.FC<Props> = ({
  source,
  style,
  minScale = 1,
  maxScale = 5,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const baseScale = useRef(1);
  const currentScale = useRef(1);
  const baseTranslate = useRef({ x: 0, y: 0 });
  const currentTranslate = useRef({ x: 0, y: 0 });
  const initialPinchDistance = useRef<number | null>(null);
  const lastTap = useRef<number>(0);

  const setScale = (v: number) => {
    currentScale.current = v;
    scale.setValue(v);
  };
  const setTranslate = (x: number, y: number) => {
    currentTranslate.current = { x, y };
    translateX.setValue(x);
    translateY.setValue(y);
  };

  const distance = (touches: any[]) => {
    const [a, b] = touches;
    const dx = a.pageX - b.pageX;
    const dy = a.pageY - b.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Capture phase so we steal the touch before children can handle it
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,

        onPanResponderGrant: (evt) => {
          baseScale.current = currentScale.current;
          baseTranslate.current = { ...currentTranslate.current };
          initialPinchDistance.current = null;

          const now = Date.now();
          if (evt.nativeEvent.touches.length === 1) {
            if (now - lastTap.current < 280) {
              Animated.parallel([
                Animated.timing(scale, { toValue: 1, duration: 180, useNativeDriver: true }),
                Animated.timing(translateX, { toValue: 0, duration: 180, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
              ]).start(() => {
                currentScale.current = 1;
                currentTranslate.current = { x: 0, y: 0 };
              });
            }
            lastTap.current = now;
          }
        },
        onPanResponderMove: (evt, gestureState) => {
          const touches = evt.nativeEvent.touches;
          if (touches.length >= 2) {
            const d = distance(touches);
            if (initialPinchDistance.current == null) {
              initialPinchDistance.current = d;
              baseScale.current = currentScale.current;
              return;
            }
            const ratio = d / initialPinchDistance.current;
            let next = baseScale.current * ratio;
            if (next < minScale) next = minScale;
            if (next > maxScale) next = maxScale;
            setScale(next);
          } else if (touches.length === 1 && currentScale.current > 1) {
            setTranslate(
              baseTranslate.current.x + gestureState.dx,
              baseTranslate.current.y + gestureState.dy,
            );
          }
        },
        onPanResponderRelease: () => {
          initialPinchDistance.current = null;
          if (currentScale.current <= 1) {
            Animated.parallel([
              Animated.timing(translateX, { toValue: 0, duration: 150, useNativeDriver: true }),
              Animated.timing(translateY, { toValue: 0, duration: 150, useNativeDriver: true }),
            ]).start(() => {
              currentTranslate.current = { x: 0, y: 0 };
            });
          }
        },
        onPanResponderTerminate: () => {
          initialPinchDistance.current = null;
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [minScale, maxScale],
  );

  return (
    <View
      collapsable={false}
      style={[styles.container, style]}
      {...responder.panHandlers}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fill,
          { transform: [{ translateX }, { translateY }, { scale }] },
        ]}
      >
        <Image
          source={source}
          style={styles.fill}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden", backgroundColor: "transparent" },
  fill: { width: "100%", height: "100%" },
});

export default PinchZoomImage;
