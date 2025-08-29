/**
 * Comprehensive Mobile API Performance Test
 * Tests both cold start and warm server performance
 */

const API_BASE_URL = 'https://daremelive.pythonanywhere.com';

async function testAPICall(endpoint, method = 'GET', body = null, token = null) {
  const startTime = Date.now();
  
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
      signal: AbortSignal.timeout(15000),
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    return { 
      success: response.ok, 
      duration, 
      status: response.status, 
      statusText: response.statusText,
      endpoint 
    };
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    return { 
      success: false, 
      duration, 
      error: error.message, 
      endpoint 
    };
  }
}

async function runComprehensiveTest() {
  console.log('🔥 COMPREHENSIVE Mobile API Performance Test');
  console.log('==============================================');
  console.log('API Base URL:', API_BASE_URL);
  console.log('Timeout: 15 seconds (optimized mobile app setting)');
  console.log();
  
  // Test 1: Cold start performance
  console.log('❄️  COLD START TEST (server may be sleeping)');
  console.log('----------------------------------------------');
  
  const coldStartResult = await testAPICall('/api/health/');
  console.log(`Health Check (cold): ${coldStartResult.duration}ms - ${coldStartResult.success ? '✅' : '❌'}`);
  
  // Wait 1 second for server to fully wake up
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: Warm server performance
  console.log('\n🔥 WARM SERVER TEST (multiple quick calls)');
  console.log('-------------------------------------------');
  
  const warmTests = [
    { name: 'Health Check', endpoint: '/api/health/' },
    { name: 'Health Check (2nd)', endpoint: '/api/health/' },
    { name: 'Health Check (3rd)', endpoint: '/api/health/' },
    { name: 'Streams (unauthorized)', endpoint: '/api/streams/' },
    { name: 'Auth Check', endpoint: '/api/auth/check/' },
  ];
  
  const warmResults = [];
  
  for (const test of warmTests) {
    const result = await testAPICall(test.endpoint);
    warmResults.push({ name: test.name, ...result });
    console.log(`${test.name}: ${result.duration}ms - ${result.success ? '✅' : '❌'} (${result.status})`);
    
    // Small delay between calls
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Test 3: Burst test (simultaneous calls)
  console.log('\n⚡ BURST TEST (5 simultaneous calls)');
  console.log('------------------------------------');
  
  const burstPromises = [];
  for (let i = 0; i < 5; i++) {
    burstPromises.push(testAPICall('/api/health/'));
  }
  
  const burstResults = await Promise.all(burstPromises);
  burstResults.forEach((result, index) => {
    console.log(`Burst ${index + 1}: ${result.duration}ms - ${result.success ? '✅' : '❌'}`);
  });
  
  // Calculate statistics
  console.log('\n📊 PERFORMANCE ANALYSIS');
  console.log('========================');
  
  const successfulWarmCalls = warmResults.filter(r => r.success);
  const avgWarmTime = successfulWarmCalls.length > 0 
    ? Math.round(successfulWarmCalls.reduce((sum, r) => sum + r.duration, 0) / successfulWarmCalls.length)
    : 0;
  
  const avgBurstTime = Math.round(burstResults.reduce((sum, r) => sum + r.duration, 0) / burstResults.length);
  
  console.log(`Cold start time: ${coldStartResult.duration}ms`);
  console.log(`Average warm server time: ${avgWarmTime}ms`);
  console.log(`Average burst time: ${avgBurstTime}ms`);
  
  // Performance verdict
  console.log('\n🏆 VERDICT');
  console.log('==========');
  
  if (coldStartResult.duration > 3000) {
    console.log(`⚠️  Cold start is slow (${coldStartResult.duration}ms) - server sleeping`);
  } else {
    console.log(`✅ Cold start is acceptable (${coldStartResult.duration}ms)`);
  }
  
  if (avgWarmTime < 500) {
    console.log(`🎉 Warm server performance is EXCELLENT (${avgWarmTime}ms avg)`);
  } else if (avgWarmTime < 1000) {
    console.log(`✅ Warm server performance is GOOD (${avgWarmTime}ms avg)`);
  } else {
    console.log(`⚠️  Warm server performance needs improvement (${avgWarmTime}ms avg)`);
  }
  
  if (avgBurstTime < 800) {
    console.log(`🚀 Burst performance is EXCELLENT (${avgBurstTime}ms avg)`);
  } else {
    console.log(`⚠️  Burst performance could be better (${avgBurstTime}ms avg)`);
  }
  
  console.log('\n✨ Mobile app optimizations summary:');
  console.log('• Removed dynamicBaseQuery wrapper from RTK Query');
  console.log('• Added 15s timeout to all API calls');
  console.log('• Eliminated ipDetector overhead');
  console.log('• Centralized configuration for instant URL resolution');
  console.log('• Optimized image URL generation (sync vs async)');
}

runComprehensiveTest().catch(console.error);
