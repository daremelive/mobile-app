// Test API calls from mobile app to verify configuration
import { API_BASE_URL } from './src/config/env';

const testApiCalls = async () => {
  console.log('🔧 [API Test] Starting API call tests...');
  console.log('🔧 [API Test] Using base URL:', API_BASE_URL);
  
  const startTime = Date.now();
  
  try {
    // Test 1: Health check
    console.log('🔧 [API Test] Testing health endpoint...');
    const healthStart = Date.now();
    const healthResponse = await fetch(`${API_BASE_URL.replace('/api', '')}/api/health/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    const healthEnd = Date.now();
    const healthData = await healthResponse.json();
    
    console.log('✅ [API Test] Health check result:', {
      status: healthResponse.status,
      time: `${healthEnd - healthStart}ms`,
      data: healthData
    });
    
    // Test 2: Check streams endpoint (without auth)
    console.log('🔧 [API Test] Testing streams endpoint...');
    const streamsStart = Date.now();
    const streamsResponse = await fetch(`${API_BASE_URL}/streams/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    const streamsEnd = Date.now();
    
    console.log('✅ [API Test] Streams endpoint result:', {
      status: streamsResponse.status,
      time: `${streamsEnd - streamsStart}ms`,
      contentType: streamsResponse.headers.get('content-type')
    });
    
    if (streamsResponse.ok) {
      const streamsData = await streamsResponse.json();
      console.log('✅ [API Test] Streams data preview:', {
        count: streamsData.count || 'N/A',
        results: streamsData.results ? streamsData.results.length : 'N/A'
      });
    }
    
    // Test 3: Auth check endpoint
    console.log('🔧 [API Test] Testing auth check endpoint...');
    const authStart = Date.now();
    const authResponse = await fetch(`${API_BASE_URL}/auth/check/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    const authEnd = Date.now();
    
    console.log('✅ [API Test] Auth check result:', {
      status: authResponse.status,
      time: `${authEnd - authStart}ms`,
      message: authResponse.status === 401 ? 'Unauthorized (expected)' : 'Unexpected status'
    });
    
    const totalTime = Date.now() - startTime;
    console.log('🎯 [API Test] All tests completed in:', `${totalTime}ms`);
    
    return {
      success: true,
      totalTime,
      results: {
        health: { status: healthResponse.status, time: healthEnd - healthStart },
        streams: { status: streamsResponse.status, time: streamsEnd - streamsStart },
        auth: { status: authResponse.status, time: authEnd - authStart }
      }
    };
    
  } catch (error) {
    console.error('❌ [API Test] Error during API tests:', error);
    return {
      success: false,
      error: error.message,
      totalTime: Date.now() - startTime
    };
  }
};

// Export for use in React Native
export default testApiCalls;

// Also run immediately if called directly
if (typeof require !== 'undefined' && require.main === module) {
  testApiCalls().then(result => {
    console.log('🔧 [API Test] Final result:', result);
  });
}
