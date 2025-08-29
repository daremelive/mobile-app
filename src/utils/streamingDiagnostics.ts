/**
 * Production Streaming Diagnostic Script
 * Add this to your production app to debug streaming issues
 */

export const diagnoseStreamingIssues = async () => {
  console.log('🔍 === STREAMING DIAGNOSTICS START ===');
  
  const results: any = {
    timestamp: new Date().toISOString(),
    environment: __DEV__ ? 'development' : 'production',
    tests: {}
  };

  // Test 1: Environment Detection
  console.log('🔍 Testing environment detection...');
  results.tests.environment = {
    isDev: __DEV__,
    expectedInProduction: false
  };

  // Test 2: Check if in production
  if (!__DEV__) {
    console.log('✅ Running in production mode');
  } else {
    console.log('⚠️ Running in development mode');
  }

  // Test 3: GetStream token endpoint (if you have access to your API functions)
  try {
    console.log('🔍 Testing production API connectivity...');
    const testUrl = 'https://daremelive.pythonanywhere.com/api/health/';
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    results.tests.apiConnectivity = {
      success: response.ok,
      status: response.status,
      url: testUrl
    };
    
    if (response.ok) {
      console.log('✅ Production API is reachable');
    } else {
      console.log('❌ Production API returned status:', response.status);
    }
  } catch (error: any) {
    console.log('❌ Failed to reach production API:', error);
    results.tests.apiConnectivity = {
      success: false,
      error: error?.message || 'Unknown error'
    };
  }

  console.log('🔍 === DIAGNOSTIC RESULTS ===');
  console.log(JSON.stringify(results, null, 2));
  console.log('🔍 === STREAMING DIAGNOSTICS END ===');
  
  return results;
};

// Instructions for use:
console.log(`
🔧 PRODUCTION STREAMING DEBUG INSTRUCTIONS:

1. Add this line to your host screen component (temporarily):
   diagnoseStreamingIssues();

2. Check console output for diagnostic results

3. Look for these specific issues:
   - Environment showing 'development' in production build
   - API connectivity failures
   - URL detection pointing to local IPs instead of production domain

4. Common production issues:
   - GetStream token endpoint using wrong URL
   - CORS issues with production domain
   - Network timeouts in production vs development
   - Authentication token not properly forwarded

5. If GetStream connection works but stream start fails, check:
   - Backend stream creation API
   - Stream status updates
   - WebSocket connection for real-time updates
`);

export default diagnoseStreamingIssues;
