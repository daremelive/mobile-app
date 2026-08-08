module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    env: {
      // Release builds ship no diagnostic console output. Application code
      // should log via src/utils/logger, which no-ops these levels in
      // production anyway; this is the backstop for stray console calls.
      // `error` and `warn` are kept so native crash reporting still sees them.
      production: {
        plugins: [
          ["transform-remove-console", { exclude: ["error", "warn"] }],
        ],
      },
    },
  };
};
