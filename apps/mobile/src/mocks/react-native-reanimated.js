/**
 * Stub for react-native-reanimated.
 * NativeWind (react-native-css-interop) requires reanimated for CSS animation support.
 * This app does not use CSS animations (@keyframes / transition), so the stubs below
 * satisfy Metro's module resolution without adding reanimated's native modules.
 * All animation functions return their target value immediately (no-op/instant).
 */
'use strict';

const { Animated } = require('react-native');

// ─── Easing ───────────────────────────────────────────────────────────────────

const linear = (t) => t;
const Easing = {
  linear,
  ease: (t) => t,
  quad: (t) => t * t,
  cubic: (t) => t * t * t,
  circle: (t) => 1 - Math.sqrt(1 - t * t),
  sin: (t) => 1 - Math.cos((t * Math.PI) / 2),
  exp: (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  in: (easing) => easing,
  out: (easing) => (t) => 1 - easing(1 - t),
  inOut: (easing) => (t) => (t < 0.5 ? easing(t * 2) / 2 : 1 - easing((1 - t) * 2) / 2),
  bezier: () => linear,
  poly: () => linear,
  elastic: () => linear,
  back: () => linear,
  bounce: linear,
  step0: (t) => (t > 0 ? 1 : 0),
  step1: (t) => (t >= 1 ? 1 : 0),
};

// ─── Shared values ───────────────────────────────────────────────────────────

const makeMutable = (initialValue) => ({
  value: initialValue,
  addListener: () => 0,
  removeListener: () => {},
  modify: () => {},
});

// ─── Animation builders (instant / no-op) ────────────────────────────────────

const withTiming = (toValue) => toValue;
const withDelay = (_delay, animation) => animation;
const withRepeat = (animation) => animation;
const withSequence = (...animations) => animations[animations.length - 1] ?? 0;
const withSpring = (toValue) => toValue;
const withDecay = () => 0;
const cancelAnimation = () => {};

// ─── Hooks ────────────────────────────────────────────────────────────────────

const useAnimatedStyle = (worklet) => {
  try { return worklet(); } catch { return {}; }
};
const useSharedValue = (initial) => makeMutable(initial);
const useDerivedValue = (worklet) => makeMutable((() => { try { return worklet(); } catch { return undefined; } })());
const useAnimatedProps = (worklet) => {
  try { return worklet(); } catch { return {}; }
};

// ─── Test utilities ───────────────────────────────────────────────────────────

const setUpTests = () => {};

// ─── Animated components (re-use RN's built-in Animated) ─────────────────────

module.exports = {
  default: Animated,
  Animated,
  Easing,
  makeMutable,
  cancelAnimation,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withDecay,
  useAnimatedStyle,
  useSharedValue,
  useDerivedValue,
  useAnimatedProps,
  setUpTests,
};
