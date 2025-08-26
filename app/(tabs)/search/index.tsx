import React from 'react';
import { SafeAreaView } from 'react-native';
import UniversalSearch from '../../../components/UniversalSearch';
import ipDetector from '../../../src/utils/ipDetector';

export default function SearchScreen() {
  const [baseURL, setBaseURL] = React.useState<string>('');

  // Initialize base URL with IP detection
  React.useEffect(() => {
    const initializeBaseURL = async () => {
      try {
        const detection = await ipDetector.detectIP();
        const url = `http://${detection.ip}:8000`;
        setBaseURL(url);
        console.log('🔗 Search Screen Base URL initialized:', url);
      } catch (error) {
        console.error('❌ Failed to detect IP in search screen:', error);
        setBaseURL('https://daremelive.pythonanywhere.com'); // Production fallback
      }
    };
    
    initializeBaseURL();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-black">
      <UniversalSearch
        mode="fullscreen"
        baseURL={baseURL}
        showTabs={true}
        autoFocus={true}
        placeholder="Search for streamers, content..."
      />
    </SafeAreaView>
  );
}