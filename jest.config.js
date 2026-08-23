/**
 * Jest configuration.
 *
 * The jest-expo preset supplies the React Native transform, module mapping and
 * globals that Expo needs; nothing here should duplicate it.
 */
module.exports = {
  preset: 'jest-expo',

  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Everything in node_modules is pre-compiled except React Native and the
  // Expo packages, which ship untranspiled ES modules and must go through
  // Babel. Anything imported in a test and failing on `import` belongs here.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@reduxjs/toolkit|redux-persist))',
  ],

  moduleNameMapper: {
    // Mirrors the "@/..." alias used across the app.
    '^@/(.*)$': '<rootDir>/$1',
    // SVGs are imported as components; a test only needs them to render.
    '\\.svg$': '<rootDir>/__mocks__/svgMock.js',
  },

  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],

  testMatch: [
    '**/__tests__/**/*.test.{ts,tsx}',
    '**/*.test.{ts,tsx}',
  ],

  // Build output and dependencies are not test sources.
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/', '/.expo/'],

  clearMocks: true,
};
