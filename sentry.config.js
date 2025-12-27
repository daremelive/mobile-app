import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// Your actual Sentry DSN
const SENTRY_DSN = 'https://4d134857e6e2e5803c0793680f42fa70@o4509932751290368.ingest.us.sentry.io/4509932756074496';

console.log('✅ Sentry enabled for production error tracking');

// Initialize Sentry with your DSN
Sentry.init({
  dsn: SENTRY_DSN,
  
  // Set environment
  environment: __DEV__ ? 'development' : 'production',
  
  // Performance monitoring
  tracesSampleRate: __DEV__ ? 0.1 : 1.0,
  
  // Debug mode (only in development)
  debug: __DEV__,
  
  // App version and release info
  release: Constants.expoConfig?.version || '1.0.0',
  dist: Constants.expoConfig?.ios?.buildNumber || '1',
  
  // Simplified integrations to fix the prototype error
  integrations: [
    // Removed ReactNativeTracing that was causing the error
  ],
  
  // Allow some events in development for testing
  beforeSend(event) {
    if (__DEV__) {
      console.log('Sentry Event (Dev):', event);
      // Allow error events in development for testing
      if (event.level === 'error' && event.message?.includes('SENTRY_TEST')) {
        return event; // Send test events
      }
      return null; // Don't send other dev events
    }
    return event;
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
