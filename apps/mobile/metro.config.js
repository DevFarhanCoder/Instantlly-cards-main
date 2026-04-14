const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Alias react-native-reanimated to a no-op stub.
// NativeWind (react-native-css-interop@0.2.x) imports reanimated for CSS animation
// support, but this app only uses NativeWind for static Tailwind styles — no
// @keyframes / transition. The stub satisfies Metro's module resolution without
// requiring the full reanimated native module installation.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "react-native-reanimated": path.resolve(
    __dirname,
    "src/mocks/react-native-reanimated.js",
  ),
  "react-native-razorpay": path.resolve(
    __dirname,
    "src/mocks/react-native-razorpay.js",
  ),
};

module.exports = withNativeWind(config, {
  input: "./src/global.css",
});
