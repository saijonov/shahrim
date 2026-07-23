// babel-preset-expo (SDK 50+) bundles the expo-router plugin and the
// react-native / TypeScript transforms, so this is all that's needed.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
