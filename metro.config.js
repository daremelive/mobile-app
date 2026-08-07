const { getDefaultConfig } = require("@expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
  unstable_allowRequireContext: true, // <-- CRITICAL LINE
};

config.server = {
  ...config.server,
  unstable_serverRoot: __dirname,
};

config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...resolver.sourceExts, "svg"],
  platforms: ["ios", "android", "native"], // Removed "web" platform
  // Block web-specific modules that cause issues
  resolverMainFields: ['react-native', 'browser', 'main'],
  blockList: [
    // Block web-specific files from WebRTC packages
    /.*\/node_modules\/@stream-io\/react-native-webrtc\/.*\.web\..*/,
    /.*\/node_modules\/@stream-io\/video-react-native-sdk\/.*\.web\..*/,
  ],
};

module.exports = withNativeWind(config, { input: "./global.css" });
