/**
 * Stream action types
 * Actions that can be performed on streams
 */

// Stream actions interface
export interface StreamActions {
  initializeStream: () => Promise<void>;
  handleLeaveStream: () => Promise<void>;
  handleSendMessage: (message: string) => Promise<void>;
  setVideoLoadError: (error: string | null) => void;
  refetchMessages: () => void;
  resetConnectionState: () => void;
  refetchStreamDetails: () => void;
}

// Stream action request types
export interface StreamActionRequest {
  action: 'start' | 'end' | 'heartbeat';
}

// Send message request
export interface SendMessageRequest {
  message: string;
}

// Send gift request
export interface SendGiftRequest {
  gift_id: number;
  recipient_user_id?: number; // Optional for multi-user streams
}

// Individual action functions
export type InitializeStreamFn = () => Promise<void>;
export type LeaveStreamFn = () => Promise<void>;
export type SendMessageFn = (message: string) => Promise<void>;
export type SetVideoLoadErrorFn = (error: string | null) => void;
export type RefetchMessagesFn = () => void;
export type ResetConnectionStateFn = () => void;
export type RefetchStreamDetailsFn = () => void;