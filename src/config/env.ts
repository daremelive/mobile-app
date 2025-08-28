import Constants from 'expo-constants';

interface AppConfig {
  PRODUCTION_API_URL: string;
  API_BASE_URL?: string;
  WS_BASE_URL?: string;
}

const getConfig = (): AppConfig => {
  const extra = Constants.expoConfig?.extra || {};
  
  return {
    PRODUCTION_API_URL: process.env.EXPO_PUBLIC_PRODUCTION_API_URL || 'https://daremelive.pythonanywhere.com/api',
    API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
    WS_BASE_URL: process.env.EXPO_PUBLIC_WS_BASE_URL,
    ...extra
  };
};

export const AppConfig = getConfig();

export const getAPIBaseURL = (): string => {
  if (__DEV__ && AppConfig.API_BASE_URL) {
    return AppConfig.API_BASE_URL;
  }
  return AppConfig.PRODUCTION_API_URL;
};

export const getWebSocketURL = (): string => {
  if (__DEV__ && AppConfig.WS_BASE_URL) {
    return AppConfig.WS_BASE_URL;
  }
  return AppConfig.PRODUCTION_API_URL.replace('https://', 'wss://').replace('http://', 'ws://');
};
