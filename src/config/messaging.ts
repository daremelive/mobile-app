// Configuration for the messaging app
import { API_BASE_URL } from './env';

const API_ROOT = API_BASE_URL.replace(/\/$/, '');
const SERVER_ROOT = API_ROOT.replace(/\/api$/, '');

export const API_CONFIG = {
  // Endpoints
  ENDPOINTS: {
    CONVERSATIONS: '/messaging/conversations/',
    SEND_MESSAGE: '/messaging/send/',
    USER_STATUS: '/messaging/user-status/',
  },

  getBaseUrl: () => SERVER_ROOT,
  getApiBaseUrl: () => API_ROOT,
};

export const APP_CONFIG = {
  // Pagination
  MESSAGES_PER_PAGE: 20,
  CONVERSATIONS_PER_PAGE: 20,

  // UI
  MESSAGE_MAX_LENGTH: 1000,
  TYPING_INDICATOR_TIMEOUT: 1000,

  // Refresh intervals (in milliseconds)
  STATUS_REFRESH_INTERVAL: 30000, // 30 seconds
  MESSAGES_REFRESH_INTERVAL: 5000, // 5 seconds for real-time feel
};
