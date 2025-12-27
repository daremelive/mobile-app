/**
 * Stream hook types
 * Types for stream-related custom hooks
 */

import { UserRole } from '../stream';
import { StreamState } from '../stream/state';
import { StreamActions } from '../stream/actions';

// useStreamState hook props
export interface UseStreamStateProps {
  streamId: string;
  userRole: UserRole;
}

// useStreamState hook return type
export interface UseStreamStateReturn extends StreamState, StreamActions {
  // Additional computed values
  isReady: boolean;
  canInteract: boolean;
  streamData?: any;
  messagesData?: any;
}

// Stream initialization hook props
export interface UseStreamInitializationProps {
  streamId: string;
  userRole: UserRole;
  autoInitialize?: boolean;
}

// Stream initialization hook return
export interface UseStreamInitializationReturn {
  initialize: () => Promise<void>;
  isInitializing: boolean;
  error: string | null;
  retryCount: number;
  reset: () => void;
}

// Stream cleanup hook props
export interface UseStreamCleanupProps {
  call?: any;
  streamClient?: any;
  onCleanupComplete?: () => void;
}

// Stream cleanup hook return
export interface UseStreamCleanupReturn {
  cleanup: () => Promise<void>;
  isCleaningUp: boolean;
  forceCleanup: () => Promise<void>;
}