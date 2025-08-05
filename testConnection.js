// Quick Connection Test for DareMe Mobile App
// Add this to your component to test API connectivity

import { Alert } from 'react-native';

const testAPIConnection = async () => {
  console.log('🧪 Testing API Connection...');
  
  const testIPs = ['172.20.10.2', '172.20.10.3', '192.168.1.117'];
  
  for (const ip of testIPs) {
    try {
      console.log(`🔍 Testing IP: ${ip}`);
      
      // Test health endpoint
      const response = await fetch(`http://${ip}:8000/api/health/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Connection successful on ${ip}:`, data);
        
        Alert.alert(
          'Connection Test',
          `✅ API is accessible on ${ip}\nServer Status: ${data.status}\nServer IP: ${data.server_ip}`,
          [{ text: 'OK' }]
        );
        return ip; // Return the working IP
      } else {
        console.log(`❌ HTTP ${response.status} on ${ip}`);
      }
    } catch (error) {
      console.log(`❌ Connection failed on ${ip}:`, error.message);
    }
  }
  
  Alert.alert(
    'Connection Test Failed',
    '❌ Could not connect to any API server. Please check:\n\n1. Django server is running\n2. Network connectivity\n3. IP addresses are correct',
    [{ text: 'OK' }]
  );
  
  return null;
};

// Add this to your component to test when needed
export default testAPIConnection;

// Usage in your component:
// import testAPIConnection from './path/to/this/file';
// 
// // Add a button to test connection
// <TouchableOpacity onPress={testAPIConnection}>
//   <Text>Test API Connection</Text>
// </TouchableOpacity>
