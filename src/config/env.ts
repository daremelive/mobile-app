import { Platform } from 'react-native';

interface AppConfig {
  API_BASE_URL: string;
  WS_BASE_URL: string;
  MEDIA_BASE_URL: string;
  PUBLIC_WEB_BASE_URL: string;
  IS_DEVELOPMENT: boolean;
  IS_PRODUCTION: boolean;
}

// Fallbacks used when the matching EXPO_PUBLIC_* variable is absent.
// iOS simulators and web use the host's localhost. Android emulators expose
// the host through 10.0.2.2. Physical devices must use the laptop's LAN IP in
// EXPO_PUBLIC_API_BASE_URL and the related websocket/media variables.
const DEV_HOST = Platform.OS === 'android'
  ? 'http://10.0.2.2:8001'
  : 'http://localhost:8001';
const PRODUCTION_HOST = 'https://api.daremelive.com';

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

/** Normalises to exactly one trailing slash, e.g. `http://host:8001/api/`. */
const withTrailingSlash = (value: string): string => `${stripTrailingSlash(value)}/`;

/**
 * EXPO_PUBLIC_API_BASE_URL is written both with and without the `/api` suffix
 * across existing .env files, so normalise to always include it exactly once.
 */
const withApiSuffix = (value: string): string => {
  const base = stripTrailingSlash(value);
  return base.endsWith('/api') ? base : `${base}/api`;
};

const getConfig = (): AppConfig => {
  const isDev = __DEV__;
  const host = isDev ? DEV_HOST : PRODUCTION_HOST;

  const apiBaseUrl = withApiSuffix(
    isDev
      ? (process.env.EXPO_PUBLIC_API_BASE_URL ?? `${host}/api`)
      : (process.env.EXPO_PUBLIC_PRODUCTION_API_URL ?? `${host}/api`),
  );
  const wsBaseUrl = isDev
    ? (process.env.EXPO_PUBLIC_WS_BASE_URL ?? host.replace(/^http/, 'ws'))
    : (process.env.EXPO_PUBLIC_PRODUCTION_WS_BASE_URL ?? host.replace(/^http/, 'ws'));
  const mediaBaseUrl = isDev
    ? (process.env.EXPO_PUBLIC_MEDIA_BASE_URL ?? host)
    : (process.env.EXPO_PUBLIC_PRODUCTION_MEDIA_BASE_URL ?? host);
  const publicWebBaseUrl = isDev
    ? (process.env.EXPO_PUBLIC_WEB_BASE_URL ?? mediaBaseUrl)
    : (process.env.EXPO_PUBLIC_PRODUCTION_WEB_BASE_URL ?? 'https://daremelive.com');

  return {
    API_BASE_URL: withTrailingSlash(apiBaseUrl),
    WS_BASE_URL: stripTrailingSlash(wsBaseUrl),
    MEDIA_BASE_URL: stripTrailingSlash(mediaBaseUrl),
    PUBLIC_WEB_BASE_URL: stripTrailingSlash(publicWebBaseUrl),
    IS_DEVELOPMENT: isDev,
    IS_PRODUCTION: !isDev,
  };
};

export const AppConfig = getConfig();

// Convenience exports for common use cases
export const API_BASE_URL = AppConfig.API_BASE_URL;
export const WS_BASE_URL = AppConfig.WS_BASE_URL;
export const MEDIA_BASE_URL = AppConfig.MEDIA_BASE_URL;
export const PUBLIC_WEB_BASE_URL = AppConfig.PUBLIC_WEB_BASE_URL;

/**
 * API root without a trailing slash. Use this as the `baseUrl` for RTK Query
 * services whose endpoints declare leading-slash paths (`/auth/login/`);
 * pairing those with API_BASE_URL yields a double slash, which Django 404s.
 */
export const API_ROOT = stripTrailingSlash(AppConfig.API_BASE_URL);

// Helper functions
export const getAPIBaseURL = (): string => AppConfig.API_BASE_URL;
export const getWebSocketURL = (): string => AppConfig.WS_BASE_URL;
export const getMediaBaseURL = (): string => AppConfig.MEDIA_BASE_URL;

// Build profile picture URL helper
export const buildMediaURL = (path?: string | null): string => {
  if (!path) {
    return '';
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${MEDIA_BASE_URL}${cleanPath}`;
};

export const buildProfilePictureURL = buildMediaURL;

// Build avatar fallback URL
export const buildAvatarFallbackURL = (name: string): string => {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=C42720&color=fff&size=100`;
};
