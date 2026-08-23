import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// Client DSNs are not secret, but keep it overridable per environment.
const SENTRY_DSN =
  process.env.EXPO_PUBLIC_SENTRY_DSN ??
  'https://4d134857e6e2e5803c0793680f42fa70@o4509932751290368.ingest.us.sentry.io/4509932756074496';
const configuredTraceSampleRate = Number.parseFloat(
  process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? '0.1',
);

// Initialize Sentry with your DSN
Sentry.init({
  dsn: SENTRY_DSN,

  // Set environment
  environment: __DEV__ ? 'development' : 'production',

  // Performance monitoring
  tracesSampleRate: Number.isFinite(configuredTraceSampleRate)
    ? Math.min(1, Math.max(0, configuredTraceSampleRate))
    : 0.1,

  // Sentry's own SDK logging; noisy in Metro, so off by default. Set
  // EXPO_PUBLIC_SENTRY_DEBUG=true when diagnosing Sentry itself.
  debug: process.env.EXPO_PUBLIC_SENTRY_DEBUG === 'true',

  // App version and release info
  release: Constants.expoConfig?.version || '1.0.0',
  dist: Constants.expoConfig?.ios?.buildNumber || '1',

  // Simplified integrations to fix the prototype error
  integrations: [
    // Removed ReactNativeTracing that was causing the error
  ],

  // Development telemetry stays local unless explicit SDK debugging is on.
  beforeSend(event) {
    return __DEV__ && process.env.EXPO_PUBLIC_SENTRY_DEBUG !== 'true'
      ? null
      : event;
  },

  // Set user context for better debugging
  initialScope: {
    tags: {
      component: 'react-native',
      platform: 'mobile',
      feature: 'streaming'
    }
  }
});
