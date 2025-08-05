const { getDefaultConfig } = require("@react-native/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
  unstable_allowRequireContext: true,
};

config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...resolver.sourceExts, "svg"],
  platforms: ["ios", "android", "native", "web"],
};

// Add resolver for CSS files to avoid issues
config.resolver.sourceExts.push("css");

module.exports = withNativeWind(config, { 
  input: "./global.css",
  configPath: "./tailwind.config.js"
});
