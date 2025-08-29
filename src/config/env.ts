import Constants from 'expo-constants';

interface AppConfig {
  API_BASE_URL: string;
  WS_BASE_URL: string;
  MEDIA_BASE_URL: string;
  IS_DEVELOPMENT: boolean;
  IS_PRODUCTION: boolean;
}

const getConfig = (): AppConfig => {
  const isDev = __DEV__;
  const extra = Constants.expoConfig?.extra || {};
  
  if (isDev) {
    // Development: Try to use local development URLs, but handle network changes
    let apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || extra.EXPO_PUBLIC_API_BASE_URL;
    let wsBaseUrl = process.env.EXPO_PUBLIC_WS_BASE_URL || extra.EXPO_PUBLIC_WS_BASE_URL;
    
    // Fallback to localhost if no environment variables are set
    if (!apiBaseUrl) {
      apiBaseUrl = 'http://localhost:8000/api/';
      wsBaseUrl = 'ws://localhost:8000';
    }
    
    // Ensure API URL has /api/ suffix with trailing slash
    if (!apiBaseUrl.includes('/api/')) {
      if (apiBaseUrl.includes('/api')) {
        apiBaseUrl = apiBaseUrl.replace('/api', '/api/');
      } else {
        apiBaseUrl = `${apiBaseUrl}/api/`;
      }
    }
    
    const mediaBaseUrl = apiBaseUrl.replace('/api/', '');
    
    return {
      API_BASE_URL: apiBaseUrl,
      WS_BASE_URL: wsBaseUrl,
      MEDIA_BASE_URL: mediaBaseUrl,
      IS_DEVELOPMENT: true,
      IS_PRODUCTION: false,
    };
  } else {
    // Production: Use daremelive.pythonanywhere.com as the official production URL
    const apiBaseUrl = 'https://daremelive.pythonanywhere.com/api/';
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

export const AppConfig = getConfig();

// Debug logging to verify correct URLs are being used
console.log('🔧 [AppConfig] Environment Configuration:', {
  isDevelopment: AppConfig.IS_DEVELOPMENT,
  API_BASE_URL: AppConfig.API_BASE_URL,
  WS_BASE_URL: AppConfig.WS_BASE_URL,
  MEDIA_BASE_URL: AppConfig.MEDIA_BASE_URL,
  envVars: {
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
    EXPO_PUBLIC_WS_BASE_URL: process.env.EXPO_PUBLIC_WS_BASE_URL,
    EXPO_PUBLIC_PRODUCTION_API_URL: process.env.EXPO_PUBLIC_PRODUCTION_API_URL,
  }
});

// Convenience exports for common use cases
export const API_BASE_URL = AppConfig.API_BASE_URL;
export const WS_BASE_URL = AppConfig.WS_BASE_URL;
export const MEDIA_BASE_URL = AppConfig.MEDIA_BASE_URL;

// Helper functions
export const getAPIBaseURL = (): string => AppConfig.API_BASE_URL;
export const getWebSocketURL = (): string => AppConfig.WS_BASE_URL;
export const getMediaBaseURL = (): string => AppConfig.MEDIA_BASE_URL;

// Build profile picture URL helper
export const buildProfilePictureURL = (profilePicture?: string | null): string => {
  if (!profilePicture) {
    return '';
  }
  
  if (profilePicture.startsWith('http')) {
    return profilePicture;
  }
  
  const cleanPath = profilePicture.startsWith('/') ? profilePicture : `/${profilePicture}`;
  return `${MEDIA_BASE_URL}${cleanPath}`;
};

// Build avatar fallback URL
export const buildAvatarFallbackURL = (name: string): string => {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=C42720&color=fff&size=100`;
};
