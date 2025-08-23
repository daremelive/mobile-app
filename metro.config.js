const { getDefaultConfig } = require("@expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
  unstable_allowRequireContext: true, // <-- CRITICAL LINE
};

// Reduce Fast Refresh sensitivity to prevent blinking
config.server = {
  ...config.server,
  unstable_serverRoot: __dirname,
};

// Add refresh configuration
config.watchOptions = {
  ...config.watchOptions,
  watchman: true,
  ignored: /node_modules/,
};

config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...resolver.sourceExts, "svg"],
  platforms: ["ios", "android", "native", "web"],
  alias: {
    // Provide web-compatible fallbacks for native WebRTC components
    ...(process.env.EXPO_TARGET === 'web' && {
      '@stream-io/react-native-webrtc': '@stream-io/react-native-webrtc/lib/web',
    }),
  },
};

module.exports = withNativeWind(config, { input: "./global.css" });
