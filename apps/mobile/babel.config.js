module.exports = function (api) {
  // Cache based on env so test vs non-test configs are cached separately
  api.cache.using(() => process.env.NODE_ENV);
  const isTest = process.env.NODE_ENV === 'test';
  return {
    presets: [
      "babel-preset-expo",
      // Skip NativeWind in test env — it requires react-native-worklets which isn't needed for unit tests
      ...(isTest ? [] : ["nativewind/babel"]),
    ],
  };
};
