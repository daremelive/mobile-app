// Simple API test for mobile configuration
const https = require('https');
const http = require('http');

const testApiCalls = async () => {
  console.log('🔧 [API Test] Starting mobile API configuration tests...');
  
  // Test the production URL that mobile should be using
  const PRODUCTION_API_URL = 'https://daremelive.pythonanywhere.com/api';
  const DEV_API_URL = 'http://192.168.1.117:8000/api';
  
  console.log('🔧 [API Test] Testing Production URL:', PRODUCTION_API_URL);
  console.log('🔧 [API Test] Testing Development URL:', DEV_API_URL);
  
  // Test function for any URL
  const testUrl = (url, name) => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const isHttps = url.startsWith('https');
      const lib = isHttps ? https : http;
      
      console.log(`🔧 [API Test] Testing ${name}...`);
      
      const req = lib.get(`${url.replace('/api', '')}/api/health/`, {
        timeout: 30000,
        headers: {
          'User-Agent': 'DareMe-Mobile-Test/1.0',
          'Accept': 'application/json'
        }
      }, (res) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            console.log(`✅ [API Test] ${name} Result:`, {
              status: res.statusCode,
              time: `${responseTime}ms`,
              server_ip: jsonData.server_ip || 'N/A',
              message: jsonData.message || 'N/A'
            });
            resolve({ success: true, status: res.statusCode, time: responseTime, data: jsonData });
          } catch (e) {
            console.log(`⚠️  [API Test] ${name} - Invalid JSON response`, {
              status: res.statusCode,
              time: `${responseTime}ms`,
              data: data.substring(0, 100)
            });
            resolve({ success: false, status: res.statusCode, time: responseTime, error: 'Invalid JSON' });
          }
        });
      });
      
      req.on('error', (error) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        console.log(`❌ [API Test] ${name} Error:`, {
          time: `${responseTime}ms`,
          error: error.message
        });
        resolve({ success: false, time: responseTime, error: error.message });
      });
      
      req.on('timeout', () => {
        req.destroy();
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        console.log(`⏱️  [API Test] ${name} Timeout:`, {
          time: `${responseTime}ms`
        });
        resolve({ success: false, time: responseTime, error: 'Timeout' });
      });
    });
  };
  
  // Test both URLs
  const productionResult = await testUrl(PRODUCTION_API_URL, 'Production HTTPS');
  const devResult = await testUrl(DEV_API_URL, 'Development HTTP');
  
  console.log('\n🎯 [API Test] Summary:');
  console.log('Production (HTTPS):', {
    success: productionResult.success,
    time: productionResult.time + 'ms',
    recommended: productionResult.success && productionResult.time < 5000 ? '✅ Good' : '⚠️ Slow'
  });
  
  console.log('Development (HTTP):', {
    success: devResult.success,
    time: devResult.time + 'ms',
    recommended: devResult.success && devResult.time < 1000 ? '✅ Good' : devResult.success ? '⚠️ Slow' : '❌ Failed'
  });
  
  if (productionResult.success && devResult.success) {
    const speedDiff = productionResult.time - devResult.time;
    console.log('\n📊 [API Test] Speed Comparison:');
    console.log(`Development is ${speedDiff > 0 ? speedDiff + 'ms faster' : Math.abs(speedDiff) + 'ms slower'} than production`);
  }
  
  console.log('\n💡 [API Test] Recommendations:');
  if (devResult.success && devResult.time < 2000) {
    console.log('✅ Use development server for local testing (faster)');
  }
  if (productionResult.success && productionResult.time < 5000) {
    console.log('✅ Production server is acceptable for live app');
  } else if (productionResult.success) {
    console.log('⚠️ Production server is slow - consider optimization');
  } else {
    console.log('❌ Production server is not responding - check server status');
  }
};

testApiCalls().catch(console.error);
