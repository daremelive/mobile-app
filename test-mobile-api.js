// Test RTK Query-style API calls from mobile
const fetch = require('node-fetch');

const testMobileApiCalls = async () => {
  console.log('📱 [Mobile API Test] Testing RTK Query-style API calls...');
  
  // This simulates how the mobile app makes API calls through RTK Query
  const API_BASE_URL = 'https://daremelive.pythonanywhere.com/api';
  
  const makeApiCall = async (endpoint, options = {}) => {
    const startTime = Date.now();
    const url = `${API_BASE_URL}${endpoint}`;
    
    console.log(`🔧 [Mobile API] Calling: ${endpoint}`);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'DareMe-Mobile/1.0',
          ...options.headers
        },
        timeout: 30000,
        ...options
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ [Mobile API] ${endpoint} Success:`, {
          status: response.status,
          time: `${responseTime}ms`,
          dataSize: JSON.stringify(data).length + ' chars'
        });
        return { success: true, status: response.status, time: responseTime, data };
      } else {
        console.log(`⚠️  [Mobile API] ${endpoint} HTTP Error:`, {
          status: response.status,
          time: `${responseTime}ms`,
          statusText: response.statusText
        });
        return { success: false, status: response.status, time: responseTime };
      }
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      console.log(`❌ [Mobile API] ${endpoint} Network Error:`, {
        time: `${responseTime}ms`,
        error: error.message
      });
      return { success: false, time: responseTime, error: error.message };
    }
  };
  
  console.log('📱 [Mobile API] Base URL:', API_BASE_URL);
  console.log('📱 [Mobile API] Starting endpoint tests...\n');
  
  // Test common mobile app endpoints
  const tests = [
    { name: 'Health Check', endpoint: '/health/' },
    { name: 'Streams List', endpoint: '/streams/' },
    { name: 'Auth Check', endpoint: '/auth/check/' },
    { name: 'User Profile', endpoint: '/users/me/' },
    { name: 'Following List', endpoint: '/follow/following/' },
    { name: 'Levels Status', endpoint: '/levels/status/' }
  ];
  
  const results = [];
  let totalTime = 0;
  
  for (const test of tests) {
    const result = await makeApiCall(test.endpoint);
    results.push({ ...test, ...result });
    totalTime += result.time || 0;
    
    // Add small delay between requests to simulate real usage
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n📊 [Mobile API] Test Results Summary:');
  console.log('═'.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  successful.forEach(result => {
    const speed = result.time < 1000 ? '🟢 Fast' : result.time < 3000 ? '🟡 OK' : '🔴 Slow';
    console.log(`✅ ${result.name.padEnd(15)} - ${result.time}ms ${speed}`);
  });
  
  if (failed.length > 0) {
    console.log('\nFailed Endpoints:');
    failed.forEach(result => {
      console.log(`❌ ${result.name.padEnd(15)} - ${result.error || 'HTTP ' + result.status}`);
    });
  }
  
  console.log('\n📈 [Mobile API] Performance Analysis:');
  if (successful.length > 0) {
    const avgTime = Math.round(totalTime / successful.length);
    const maxTime = Math.max(...successful.map(r => r.time));
    const minTime = Math.min(...successful.map(r => r.time));
    
    console.log(`Average Response Time: ${avgTime}ms`);
    console.log(`Fastest Response: ${minTime}ms`);
    console.log(`Slowest Response: ${maxTime}ms`);
    console.log(`Success Rate: ${Math.round((successful.length / results.length) * 100)}%`);
    
    if (avgTime < 1500) {
      console.log('🎯 Overall Performance: ✅ EXCELLENT - Mobile app should be responsive');
    } else if (avgTime < 3000) {
      console.log('🎯 Overall Performance: 🟡 GOOD - Acceptable for mobile app');
    } else {
      console.log('🎯 Overall Performance: 🔴 SLOW - Users may experience delays');
    }
  }
  
  console.log('\n💡 [Mobile API] Recommendations:');
  if (successful.length === results.length) {
    console.log('✅ All endpoints are working - mobile app should function properly');
  } else {
    console.log('⚠️ Some endpoints are failing - check authentication or server issues');
  }
  
  if (successful.length > 0 && Math.max(...successful.map(r => r.time)) > 5000) {
    console.log('🔧 Consider adding loading states for slower endpoints');
  }
  
  return {
    totalTests: results.length,
    successful: successful.length,
    failed: failed.length,
    averageTime: successful.length > 0 ? Math.round(totalTime / successful.length) : 0,
    results
  };
};

testMobileApiCalls().catch(console.error);
