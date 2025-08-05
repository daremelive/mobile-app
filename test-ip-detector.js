/**
 * Simple test script to verify IP detector functionality
 * Run this in your mobile app console to test IP detection
 */

// Test script to run in mobile app console/debugger
const testIPDetector = async () => {
  console.log('🧪 Testing IP Detector...');
  
  try {
    // Import the IP detector (adjust path as needed)
    const IPDetector = require('../src/utils/ipDetector').default;
    
    // Clear cache to force fresh detection
    IPDetector.clearCache();
    
    // Test IP detection
    const result = await IPDetector.detectIP();
    console.log('🎯 Detection Result:', result);
    
    // Test API URL generation
    const apiUrl = await IPDetector.getAPIBaseURL('streams');
    console.log('🔗 Generated API URL:', apiUrl);
    
    // Test health endpoint connectivity
    try {
      const response = await fetch(`http://${result.ip}:8000/api/health/`);
      const data = await response.json();
      console.log('✅ Health Check Response:', data);
    } catch (error) {
      console.log('❌ Health Check Failed:', error.message);
    }
    
  } catch (error) {
    console.error('🚨 Test Failed:', error);
  }
};

// Export for console use
if (typeof window !== 'undefined') {
  window.testIPDetector = testIPDetector;
}

export default testIPDetector;
