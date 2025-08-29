// Test mobile API calls using native Node.js HTTP
const https = require('https');

const testMobileEndpoints = async () => {
  console.log('📱 [Mobile API] Testing production endpoints as mobile app would...');
  
  const API_BASE_URL = 'https://daremelive.pythonanywhere.com';
  
  const makeRequest = (path, name) => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      console.log(`🔧 [Mobile API] Testing: ${name} (${path})`);
      
      const options = {
        hostname: 'daremelive.pythonanywhere.com',
        port: 443,
        path: path,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'DareMe-Mobile/1.0 (Test)',
          'Accept': 'application/json'
        },
        timeout: 30000
      };
      
      const req = https.request(options, (res) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          let responseData = null;
          let isJson = false;
          
          try {
            responseData = JSON.parse(data);
            isJson = true;
          } catch (e) {
            responseData = data.substring(0, 100) + (data.length > 100 ? '...' : '');
          }
          
          const result = {
            name,
            path,
            success: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            time: responseTime,
            isJson,
            dataSize: data.length,
            sample: isJson ? (responseData.message || responseData.detail || 'JSON response') : responseData
          };
          
          if (result.success) {
            const speed = responseTime < 1000 ? '🟢' : responseTime < 3000 ? '🟡' : '🔴';
            console.log(`✅ [Mobile API] ${name}: ${responseTime}ms ${speed} (${res.statusCode})`);
          } else {
            console.log(`⚠️  [Mobile API] ${name}: ${responseTime}ms (${res.statusCode}) - ${result.sample}`);
          }
          
          resolve(result);
        });
      });
      
      req.on('error', (error) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        console.log(`❌ [Mobile API] ${name}: Network error after ${responseTime}ms - ${error.message}`);
        resolve({
          name,
          path,
          success: false,
          time: responseTime,
          error: error.message
        });
      });
      
      req.on('timeout', () => {
        req.destroy();
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        console.log(`⏱️  [Mobile API] ${name}: Timeout after ${responseTime}ms`);
        resolve({
          name,
          path,
          success: false,
          time: responseTime,
          error: 'Timeout'
        });
      });
    });
  };
  
  // Test the most important endpoints that mobile app uses
  const endpoints = [
    { path: '/api/health/', name: 'Health Check' },
    { path: '/api/streams/', name: 'Streams List' },
    { path: '/api/auth/check/', name: 'Auth Check' },
    { path: '/api/users/me/', name: 'User Profile' },
    { path: '/api/follow/following/', name: 'Following' },
    { path: '/api/levels/status/', name: 'Levels Status' },
    { path: '/api/wallet/coins/', name: 'Wallet Coins' },
    { path: '/api/blocked/', name: 'Blocked Users' },
    { path: '/api/notifications/inbox/', name: 'Notifications' }
  ];
  
  console.log(`📱 [Mobile API] Testing ${endpoints.length} endpoints...\n`);
  
  const results = [];
  for (const endpoint of endpoints) {
    const result = await makeRequest(endpoint.path, endpoint.name);
    results.push(result);
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Analysis
  console.log('\n📊 [Mobile API] Results Summary:');
  console.log('═'.repeat(70));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const authRequired = results.filter(r => r.status === 401);
  
  console.log('\n✅ Working Endpoints:');
  successful.forEach(r => {
    const speed = r.time < 1000 ? 'Fast' : r.time < 3000 ? 'OK' : 'Slow';
    console.log(`   ${r.name.padEnd(20)} ${r.time}ms (${speed})`);
  });
  
  if (authRequired.length > 0) {
    console.log('\n🔐 Auth Required (Expected):');
    authRequired.forEach(r => {
      console.log(`   ${r.name.padEnd(20)} ${r.time}ms (401 Unauthorized)`);
    });
  }
  
  if (failed.filter(r => r.status !== 401).length > 0) {
    console.log('\n❌ Failed Endpoints:');
    failed.filter(r => r.status !== 401).forEach(r => {
      console.log(`   ${r.name.padEnd(20)} ${r.error || 'HTTP ' + r.status}`);
    });
  }
  
  // Performance analysis
  const workingEndpoints = results.filter(r => r.success || r.status === 401);
  if (workingEndpoints.length > 0) {
    const times = workingEndpoints.map(r => r.time);
    const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);
    
    console.log('\n📈 Performance Metrics:');
    console.log(`   Average Response: ${avgTime}ms`);
    console.log(`   Fastest: ${minTime}ms`);
    console.log(`   Slowest: ${maxTime}ms`);
    console.log(`   Success Rate: ${Math.round((workingEndpoints.length / results.length) * 100)}%`);
    
    let performanceRating;
    if (avgTime < 1000) {
      performanceRating = '🟢 EXCELLENT - Mobile app will be very responsive';
    } else if (avgTime < 2000) {
      performanceRating = '🟡 GOOD - Acceptable mobile performance';
    } else if (avgTime < 4000) {
      performanceRating = '🟠 FAIR - Users may notice some delays';
    } else {
      performanceRating = '🔴 POOR - Significant delays expected';
    }
    
    console.log(`   Overall Rating: ${performanceRating}`);
  }
  
  console.log('\n💡 Mobile App Recommendations:');
  
  if (successful.length > 0) {
    console.log('✅ API server is responding - mobile app should work');
  }
  
  if (authRequired.length > 0) {
    console.log('🔐 Authentication is working properly');
  }
  
  const slowEndpoints = workingEndpoints.filter(r => r.time > 3000);
  if (slowEndpoints.length > 0) {
    console.log('⚠️ Consider adding loading spinners for slow endpoints');
    slowEndpoints.forEach(r => {
      console.log(`   - ${r.name}: ${r.time}ms`);
    });
  }
  
  return {
    total: results.length,
    successful: successful.length,
    authRequired: authRequired.length,
    failed: failed.filter(r => r.status !== 401).length,
    averageTime: workingEndpoints.length > 0 ? Math.round(workingEndpoints.map(r => r.time).reduce((a, b) => a + b, 0) / workingEndpoints.length) : 0
  };
};

testMobileEndpoints()
  .then(summary => {
    console.log('\n🎯 Final Summary:', summary);
  })
  .catch(console.error);
