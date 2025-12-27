import Constants from 'expo-constants';

interface AppConfig {
  API_BASE_URL: string;
  WS_BASE_URL: string;
  MEDIA_BASE_URL: string;
  IS_DEVELOPMENT: boolean;
  IS_PRODUCTION: boolean;
}

// Production URLs - always use these for production builds
const PRODUCTION_API_URL = 'https://daremelive.pythonanywhere.com/api/';
const PRODUCTION_WS_URL = 'wss://daremelive.pythonanywhere.com';
const PRODUCTION_MEDIA_URL = 'https://daremelive.pythonanywhere.com';

// Development URLs - update this IP when your network changes
const DEV_IP = '172.20.10.6';
const DEV_API_URL = `http://${DEV_IP}:8000/api/`;
const DEV_WS_URL = `ws://${DEV_IP}:8000`;
const DEV_MEDIA_URL = `http://${DEV_IP}:8000`;

const getConfig = (): AppConfig => {
  const isDev = __DEV__;

  if (isDev) {
    // Development: Use local server
    return {
      API_BASE_URL: DEV_API_URL,
      WS_BASE_URL: DEV_WS_URL,
      MEDIA_BASE_URL: DEV_MEDIA_URL,
      IS_DEVELOPMENT: true,
      IS_PRODUCTION: false,
    };
  } else {
    // Production builds
    return {
      API_BASE_URL: PRODUCTION_API_URL,
      WS_BASE_URL: PRODUCTION_WS_URL,
      MEDIA_BASE_URL: PRODUCTION_MEDIA_URL,
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
