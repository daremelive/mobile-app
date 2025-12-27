/**
 * Stream state management types
 * Connection state, UI state, and loading states
 */

import { StreamVideoClient } from '@stream-io/video-react-native-sdk';

// Connection state management
export interface ConnectionState {
  isConnecting: boolean;
  isRateLimited: boolean;
  rateLimitedUntil: number;
  consecutiveFailures: number;
  canConnect: boolean;
  nextAllowedConnection: number;
}

// Main stream state
export interface StreamState {
  streamClient: StreamVideoClient | null;
  call: any;
  hasJoined: boolean;
  isConnecting: boolean;
  isOperationInProgress: boolean;
  baseURL: string;
  connectionState: ConnectionState;
  keyboardHeight: number;
  isKeyboardVisible: boolean;
  videoLoadError: string | null;
}

// UI loading states
export interface LoadingStates {
  isLoading: boolean;
  isConnecting: boolean;
  isOperationInProgress: boolean;
  joinAttemptCount: number;
}

// Keyboard state
export interface KeyboardState {
  height: number;
  isVisible: boolean;
}

// Video state  
export interface VideoState {
  loadError: string | null;
  isInitialized: boolean;
  hasVideo: boolean;
  isPublishing: boolean;
}