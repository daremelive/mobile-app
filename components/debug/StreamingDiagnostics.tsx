import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectAccessToken } from '../store/authSlice';
import { store } from '../store';
import { streamsApi } from '../store/streamsApi';
import ipDetector from '../utils/ipDetector';

/**
 * Production Streaming Diagnostic Tool
 * Use this component to debug streaming issues in production
 */
export const StreamingDiagnostics = () => {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const currentUser = useSelector(selectCurrentUser);
  const accessToken = useSelector(selectAccessToken);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const results: any = {
      timestamp: new Date().toISOString(),
      environment: __DEV__ ? 'development' : 'production',
      user: currentUser ? { id: currentUser.id, username: currentUser.username } : null,
      hasAccessToken: !!accessToken,
      tests: {}
    };

    try {
      // Test 1: IP Detection
      console.log('🔍 Testing IP detection...');
      try {
        const ipResult = await ipDetector.detectIP();
        results.tests.ipDetection = {
          success: true,
          result: ipResult,
          expectedInProduction: 'daremelive.pythonanywhere.com'
        };
      } catch (error) {
        results.tests.ipDetection = {
          success: false,
          error: error.message
        };
      }

      // Test 2: API Base URL
      console.log('🔍 Testing API base URL...');
      try {
        const apiUrl = await ipDetector.getAPIBaseURL();
        results.tests.apiUrl = {
          success: true,
          url: apiUrl,
          expectedInProduction: 'https://daremelive.pythonanywhere.com/api/'
        };
      } catch (error) {
        results.tests.apiUrl = {
          success: false,
          error: error.message
        };
      }

      // Test 3: GetStream Token
      console.log('🔍 Testing GetStream token...');
      try {
        const tokenResult = await store.dispatch(
          streamsApi.endpoints.getStreamToken.initiate()
        ).unwrap();
        results.tests.streamToken = {
          success: true,
          hasToken: !!tokenResult.token,
          tokenLength: tokenResult.token?.length || 0,
          hasApiKey: !!tokenResult.api_key,
          hasAppId: !!tokenResult.app_id
        };
      } catch (error) {
        results.tests.streamToken = {
          success: false,
          error: error.message,
          status: error.status,
          data: error.data
        };
      }

      // Test 4: Health Endpoint
      console.log('🔍 Testing health endpoint...');
      try {
        const healthUrl = results.tests.apiUrl?.url 
          ? results.tests.apiUrl.url.replace('/api/', '/api/health/')
          : 'https://daremelive.pythonanywhere.com/api/health/';
        
        const response = await fetch(healthUrl, {
          headers: {
            'Authorization': accessToken ? `Bearer ${accessToken}` : '',
            'Content-Type': 'application/json'
          }
        });
        const healthData = await response.json();
        results.tests.healthCheck = {
          success: response.ok,
          status: response.status,
          data: healthData
        };
      } catch (error) {
        results.tests.healthCheck = {
          success: false,
          error: error.message
        };
      }

      // Test 5: Stream Creation (dry run)
      console.log('🔍 Testing stream creation endpoint...');
      try {
        const createStreamUrl = results.tests.apiUrl?.url 
          ? `${results.tests.apiUrl.url}streams/`
          : 'https://daremelive.pythonanywhere.com/api/streams/';
        
        // Test with HEAD request to avoid actually creating a stream
        const response = await fetch(createStreamUrl, {
          method: 'OPTIONS',
          headers: {
            'Authorization': accessToken ? `Bearer ${accessToken}` : '',
            'Content-Type': 'application/json'
          }
        });
        results.tests.streamEndpoint = {
          success: response.status < 400,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries())
        };
      } catch (error) {
        results.tests.streamEndpoint = {
          success: false,
          error: error.message
        };
      }

    } catch (error) {
      results.error = error.message;
    }

    setDiagnostics(results);
    setIsRunning(false);
    
    // Show summary
    const failures = Object.values(results.tests).filter((test: any) => !test.success);
    if (failures.length > 0) {
      Alert.alert(
        'Diagnostics Complete', 
        `Found ${failures.length} issues. Check the detailed results below.`
      );
    } else {
      Alert.alert('Diagnostics Complete', 'All tests passed! The issue may be related to timing or network conditions.');
    }
  };

  const copyToClipboard = async () => {
    if (diagnostics) {
      // You might want to use a clipboard library here
      console.log('=== DIAGNOSTIC RESULTS ===');
      console.log(JSON.stringify(diagnostics, null, 2));
      Alert.alert('Results Copied', 'Diagnostic results have been logged to console. You can copy them from there.');
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: '#000' }}>
      <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 20 }}>
        🔧 Streaming Diagnostics
      </Text>
      
      <TouchableOpacity
        onPress={runDiagnostics}
        disabled={isRunning}
        style={{
          backgroundColor: isRunning ? '#666' : '#007AFF',
          padding: 15,
          borderRadius: 8,
          marginBottom: 20
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          {isRunning ? 'Running Diagnostics...' : 'Run Diagnostics'}
        </Text>
      </TouchableOpacity>

      {diagnostics && (
        <>
          <TouchableOpacity
            onPress={copyToClipboard}
            style={{
              backgroundColor: '#28a745',
              padding: 10,
              borderRadius: 8,
              marginBottom: 20
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center' }}>
              Copy Results to Console
            </Text>
          </TouchableOpacity>

          <ScrollView style={{ flex: 1 }}>
            <Text style={{ color: 'white', fontFamily: 'monospace', fontSize: 12 }}>
              {JSON.stringify(diagnostics, null, 2)}
            </Text>
          </ScrollView>
        </>
      )}
    </View>
  );
};

export default StreamingDiagnostics;
