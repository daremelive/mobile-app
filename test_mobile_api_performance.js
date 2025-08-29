/**
 * Mobile API Performance Test
 * Tests API call performance using the same configuration as the mobile app
 */

// Simulate the mobile app's centralized configuration
const API_BASE_URL = 'https://daremelive.pythonanywhere.com';

// Test function to measure API performance
async function testAPICall(endpoint, method = 'GET', body = null) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : null,
      signal: AbortSignal.timeout(15000), // Same 15s timeout as optimized mobile app
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (!response.ok) {
      console.log(`❌ ${endpoint}: ${response.status} ${response.statusText} (${duration}ms)`);
      return { success: false, duration, status: response.status };
    }
    
    const data = await response.json();
    console.log(`✅ ${endpoint}: Success (${duration}ms)`);
    return { success: true, duration, data };
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`💥 ${endpoint}: ${error.message} (${duration}ms)`);
    return { success: false, duration, error: error.message };
  }
}

// Main test function
async function runMobileAPIPerformanceTest() {
  console.log('🚀 Starting Mobile API Performance Test');
  console.log('Using API Base URL:', API_BASE_URL);
  console.log('Testing with 15s timeout (same as optimized mobile app)');
  console.log('===============================================\n');
  
  const tests = [
    { name: 'Health Check', endpoint: '/api/health/' },
    { name: 'Auth Check', endpoint: '/api/auth/check/' },
    { name: 'Streams List', endpoint: '/api/streams/' },
    { name: 'User Profile (unauthenticated)', endpoint: '/api/users/profile/' },
  ];
  
  const results = [];
  
  for (const test of tests) {
    console.log(`Testing ${test.name}...`);
    const result = await testAPICall(test.endpoint);
    results.push({
      name: test.name,
      endpoint: test.endpoint,
      ...result
    });
    
    // Wait 500ms between tests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n===============================================');
  console.log('📊 PERFORMANCE SUMMARY');
  console.log('===============================================');
  
  let totalDuration = 0;
  let successCount = 0;
  
  results.forEach(result => {
    totalDuration += result.duration;
    if (result.success) successCount++;
    
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}: ${result.duration}ms`);
  });
  
  console.log('\n📈 OVERALL STATS:');
  console.log(`Total time: ${totalDuration}ms`);
  console.log(`Average per call: ${Math.round(totalDuration / results.length)}ms`);
  console.log(`Success rate: ${successCount}/${results.length} (${Math.round(successCount/results.length*100)}%)`);
  
  if (successCount > 0) {
    const successResults = results.filter(r => r.success);
    const avgSuccessTime = Math.round(successResults.reduce((sum, r) => sum + r.duration, 0) / successResults.length);
    console.log(`Average success time: ${avgSuccessTime}ms`);
    
    if (avgSuccessTime < 1000) {
      console.log('🎉 EXCELLENT! Mobile API performance is under 1 second');
    } else if (avgSuccessTime < 2000) {
      console.log('✅ GOOD! Mobile API performance is under 2 seconds');
    } else {
      console.log('⚠️  SLOW! Mobile API performance needs optimization');
    }
  }
}

// Run the test
runMobileAPIPerformanceTest().catch(console.error);
