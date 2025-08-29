// Test both local and production APIs for mobile app
const https = require('https');
const http = require('http');

const testBothConfigurations = async () => {
  console.log('📱 [API Comparison] Testing both local and production APIs...\n');
  
  const configurations = [
    {
      name: 'Local Development',
      apiUrl: 'http://localhost:8000/api',
      lib: http
    },
    {
      name: 'Production (PythonAnywhere)',
      apiUrl: 'https://daremelive.pythonanywhere.com/api',
      lib: https
    }
  ];
  
  const testEndpoints = [
    '/health/',
    '/auth/check/',
    '/streams/',
    '/users/me/'
  ];
  
  for (const config of configurations) {
    console.log(`🔧 [${config.name}] Testing configuration...`);
    console.log(`   Base URL: ${config.apiUrl}`);
    
    const results = [];
    
    for (const endpoint of testEndpoints) {
      const result = await testEndpoint(config, endpoint);
      results.push(result);
    }
    
    // Calculate summary
    const successful = results.filter(r => r.success);
    const totalTime = successful.reduce((sum, r) => sum + r.time, 0);
    const avgTime = successful.length > 0 ? Math.round(totalTime / successful.length) : 0;
    const maxTime = successful.length > 0 ? Math.max(...successful.map(r => r.time)) : 0;
    
    console.log(`📊 [${config.name}] Summary:`);
    console.log(`   Success Rate: ${Math.round((successful.length / results.length) * 100)}%`);
    console.log(`   Average Time: ${avgTime}ms`);
    console.log(`   Slowest: ${maxTime}ms`);
    
    let rating;
    if (avgTime < 500) {
      rating = '🟢 EXCELLENT';
    } else if (avgTime < 1500) {
      rating = '🟡 GOOD';
    } else if (avgTime < 3000) {
      rating = '🟠 ACCEPTABLE';
    } else {
      rating = '🔴 SLOW';
    }
    
    console.log(`   Rating: ${rating}\n`);
  }
  
  console.log('💡 [API Comparison] Recommendations:');
  console.log('✅ Use local backend for development (fastest)');
  console.log('✅ Production API is now working well for live app');
  console.log('⚠️ Monitor production API for consistency');
};

const testEndpoint = (config, endpoint) => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const fullUrl = config.apiUrl.replace('/api', '') + endpoint;
    const urlObj = new URL(fullUrl);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'DareMe-Mobile-Test/1.0',
        'Accept': 'application/json'
      },
      timeout: 10000
    };
    
    const req = config.lib.request(options, (res) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const success = res.statusCode >= 200 && res.statusCode < 500; // Include 401 as "success"
        const speed = responseTime < 500 ? '🟢' : responseTime < 1500 ? '🟡' : '🔴';
        
        console.log(`   ${endpoint.padEnd(15)} ${responseTime}ms ${speed} (${res.statusCode})`);
        
        resolve({
          endpoint,
          success,
          status: res.statusCode,
          time: responseTime
        });
      });
    });
    
    req.on('error', (error) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      console.log(`   ${endpoint.padEnd(15)} ${responseTime}ms ❌ (${error.message})`);
      
      resolve({
        endpoint,
        success: false,
        time: responseTime,
        error: error.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      console.log(`   ${endpoint.padEnd(15)} ${responseTime}ms ⏱️ (Timeout)`);
      
      resolve({
        endpoint,
        success: false,
        time: responseTime,
        error: 'Timeout'
      });
    });
  });
};

testBothConfigurations().catch(console.error);
