// Test the actual configuration the mobile app will use
const https = require('https');
const http = require('http');

// Simulate the mobile app's environment detection
const isDev = true; // __DEV__ in React Native
const envVars = {
  EXPO_PUBLIC_API_BASE_URL: 'http://localhost:8000/api',
  EXPO_PUBLIC_WS_BASE_URL: 'ws://localhost:8000',
  EXPO_PUBLIC_PRODUCTION_API_URL: 'https://daremelive.pythonanywhere.com/api'
};

const getConfig = () => {
  if (isDev) {
    // Development: Use local development URLs from environment variables
    let apiBaseUrl = envVars.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
    let wsBaseUrl = envVars.EXPO_PUBLIC_WS_BASE_URL || 'ws://localhost:8000';
    
    // Ensure API URL has /api suffix
    if (!apiBaseUrl.includes('/api')) {
      apiBaseUrl = `${apiBaseUrl}/api`;
    }
    
    const mediaBaseUrl = apiBaseUrl.replace('/api', '');
    
    return {
      API_BASE_URL: apiBaseUrl,
      WS_BASE_URL: wsBaseUrl,
      MEDIA_BASE_URL: mediaBaseUrl,
      IS_DEVELOPMENT: true,
      IS_PRODUCTION: false,
    };
  } else {
    // Production: Use daremelive.pythonanywhere.com as the official production URL
    const apiBaseUrl = 'https://daremelive.pythonanywhere.com/api';
    const wsBaseUrl = 'wss://daremelive.pythonanywhere.com';
    const mediaBaseUrl = 'https://daremelive.pythonanywhere.com';
    
    return {
      API_BASE_URL: apiBaseUrl,
      WS_BASE_URL: wsBaseUrl,
      MEDIA_BASE_URL: mediaBaseUrl,
      IS_DEVELOPMENT: false,
      IS_PRODUCTION: true,
    };
  }
};

const testConfiguredEndpoint = async () => {
  const config = getConfig();
  
  console.log('📱 [Mobile Config Test] Configuration that mobile app will use:');
  console.log('🔧 [Mobile Config] Environment:', isDev ? 'DEVELOPMENT' : 'PRODUCTION');
  console.log('🔧 [Mobile Config] API_BASE_URL:', config.API_BASE_URL);
  console.log('🔧 [Mobile Config] WS_BASE_URL:', config.WS_BASE_URL);
  console.log('🔧 [Mobile Config] MEDIA_BASE_URL:', config.MEDIA_BASE_URL);
  
  // Test the configured endpoint
  const testUrl = config.API_BASE_URL.replace('/api', '') + '/api/health/';
  const isHttps = testUrl.startsWith('https');
  const lib = isHttps ? https : http;
  
  console.log('\n🔧 [Mobile Config] Testing configured endpoint:', testUrl);
  
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const req = lib.get(testUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'DareMe-Mobile-Config-Test/1.0',
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
          console.log(`✅ [Mobile Config] SUCCESS - Mobile app will use FAST backend:`, {
            status: res.statusCode,
            time: `${responseTime}ms`,
            server_ip: jsonData.server_ip || 'N/A',
            performance: responseTime < 1000 ? '🟢 EXCELLENT' : responseTime < 3000 ? '🟡 GOOD' : '🔴 SLOW'
          });
          resolve({ success: true, time: responseTime, config });
        } catch (e) {
          console.log(`⚠️  [Mobile Config] Response received but invalid JSON:`, {
            status: res.statusCode,
            time: `${responseTime}ms`
          });
          resolve({ success: false, time: responseTime, config });
        }
      });
    });
    
    req.on('error', (error) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      console.log(`❌ [Mobile Config] ERROR - Mobile app will fail:`, {
        time: `${responseTime}ms`,
        error: error.message,
        suggestion: 'Check if local backend is running'
      });
      resolve({ success: false, time: responseTime, config, error: error.message });
    });
    
    req.on('timeout', () => {
      req.destroy();
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      console.log(`⏱️  [Mobile Config] TIMEOUT - Mobile app will be slow:`, {
        time: `${responseTime}ms`
      });
      resolve({ success: false, time: responseTime, config, error: 'Timeout' });
    });
  });
};

const runTest = async () => {
  console.log('📱 [Mobile Config Test] Testing mobile app configuration...\n');
  
  const result = await testConfiguredEndpoint();
  
  console.log('\n🎯 [Mobile Config Test] Final Assessment:');
  
  if (result.success && result.time < 2000) {
    console.log('✅ EXCELLENT: Mobile app will be fast and responsive');
    console.log('💡 Users will experience quick loading times');
  } else if (result.success && result.time < 5000) {
    console.log('🟡 ACCEPTABLE: Mobile app will work but may feel slow');
    console.log('💡 Consider optimizing the backend server');
  } else {
    console.log('❌ PROBLEMATIC: Mobile app will have significant delays or failures');
    console.log('💡 URGENT: Fix backend connectivity or switch to working server');
  }
  
  console.log('\n📋 [Mobile Config Test] Recommendations:');
  if (result.config.IS_DEVELOPMENT) {
    console.log('🔧 Development mode detected');
    if (result.success) {
      console.log('✅ Local backend is working - continue development');
    } else {
      console.log('⚠️ Start local backend: cd backend && python run_asgi_server.py');
    }
  } else {
    console.log('🚀 Production mode detected');
    if (result.success) {
      console.log('✅ Production server is working');
    } else {
      console.log('🚨 Production server issues - check server status');
    }
  }
  
  return result;
};

runTest().catch(console.error);
