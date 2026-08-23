/**
 * Test environment setup, run before each test file.
 *
 * Native modules have no implementation under Node, so the ones the app touches
 * on import are replaced with small fakes. Add a mock here only when a real
 * module breaks in tests — not to paper over genuine failures.
 */

/* eslint-env jest */

// Secure storage is native. authSlice writes to it on sign-in and sign-out, so
// every test touching auth would otherwise fail on import.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
  clear: jest.fn(async () => undefined),
}));

// expo-router drives navigation through native side effects. Tests assert on
// the calls rather than on real navigation.
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Link: 'Link',
  Stack: { Screen: 'Stack.Screen' },
}));

// Silence the animation warning RN emits under the test renderer. This hides
// noise only; genuine errors and warnings still surface.
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}), {
  virtual: true,
});
