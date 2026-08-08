import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { logger } from '../utils/logger';

export const SentryTestButton = () => {
  const testSentry = () => {
    logger.log('Testing Sentry...');
    
    // Test 1: Capture a message
    Sentry.captureMessage('SENTRY_TEST: This is a test message from development!', 'info');
    
    // Test 2: Capture an error
    Sentry.captureException(new Error('SENTRY_TEST: Test error from mobile app'));
    
    // Test 3: Add breadcrumb
    Sentry.addBreadcrumb({
      message: 'SENTRY_TEST: User tested Sentry integration',
      level: 'info',
      data: {
        timestamp: new Date().toISOString(),
        environment: __DEV__ ? 'development' : 'production'
      }
    });
    
    logger.log('Sentry test events sent! Check your dashboard in 1-2 minutes.');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={testSentry}>
        <Text style={styles.buttonText}>Test Sentry</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 10,
  },
  button: {
    backgroundColor: '#7B68EE',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default SentryTestButton;
