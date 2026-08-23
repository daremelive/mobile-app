import { ConnectionState, KeyboardState } from '../../../types/stream/state';
import type { ChatMessage } from '../components/types';

// Connection State Hook Types
export interface UseConnectionStateProps {
  maxRetries?: number;
  retryDelay?: number;
  rateLimitDuration?: number;
}

export interface UseConnectionStateReturn {
  connectionState: ConnectionState;
  setConnecting: (connecting: boolean) => void;
  resetConnectionState: () => void;
  canAttemptConnection: () => boolean;
  recordFailure: () => void;
  recordSuccess: () => void;
}

// Keyboard State Hook Types
export interface UseKeyboardStateReturn extends KeyboardState {
  keyboardHeight: number;
  isKeyboardVisible: boolean;
}

// End Stream Hook Types
export interface UseEndStreamProps {
  streamId: string;
  onStreamEnd?: () => void;
}

// Follow System Hook Types
export interface UseFollowSystemProps {
  userId?: string;
  targetUserId?: string;
}

export interface UseFollowSystemReturn {
  isFollowing: boolean;
  isLoadingFollow: boolean;
  followersCount: number;
  followingCount: number;
  toggleFollow: () => Promise<void>;
  refreshFollowStatus: () => void;
}

// Gift Animation Data Types
export interface GiftAnimationData {
  id: string;
  gift: {
    id: number;
    name: string;
    icon_url: string | null;
    icon: string;
    cost: number;
  };
  sender: {
    username: string;
    full_name: string;
    first_name?: string;
    last_name?: string;
    profile_picture_url?: string;
  };
  animationKey: string;
}

// Gift Animations Hook Types
export interface UseGiftAnimationsProps {
  messages: any[];
  baseURL: string;
}

// Gift System Hook Types
export interface UseGiftSystemProps {
  streamId: string;
  onGiftSent?: (gift: any) => void;
}

// Hybrid Stream Chat Hook Types
export interface UseHybridStreamChatProps {
  streamId: string;
  streamTitle?: string;
  userId?: string;
  username?: string;
  isHost?: boolean;
  hostId?: string; // Actual host ID from stream details
  profilePicture?: string;
  useStreamChat?: boolean; // Use Stream Chat (default: true)
  baseURL?: string; // Add baseURL for profile picture construction
}

export interface UseHybridStreamChatReturn {
  messages: ChatMessage[];
  isKeyboardVisible: boolean;
  keyboardHeight: number;
  sendMessage: (message: string, customData?: any) => Promise<void>;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  isSendingMessage: boolean;
  isConnected: boolean;
  connectionError: string | null;
  chatProvider: 'stream-chat';
  sendGiftEvent?: (giftData: any) => Promise<void>;
}

// Stream Chat Hook Types
export interface UseStreamChatProps {
  streamId: string;
  userId?: string;
  username?: string;
  isHost?: boolean;
  profilePicture?: string;
}

export interface UseStreamChatReturn {
  messages: ChatMessage[];
  isKeyboardVisible: boolean;
  keyboardHeight: number;
  sendMessage: (message: string) => Promise<void>;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  isSendingMessage: boolean;
}

// Stream Chat With Stream Hook Types
export interface UseStreamChatWithStreamProps {
  streamId: string;
  streamTitle: string;
  userId?: string;
  username?: string;
  isHost?: boolean;
  hostId?: string; // Actual host ID from stream details
  profilePicture?: string;
  enabled?: boolean;
  maxMessages?: number;
  baseURL?: string; // Add baseURL for profile picture construction
}

export interface UseStreamChatWithStreamReturn {
  messages: ChatMessage[];
  isKeyboardVisible: boolean;
  keyboardHeight: number;
  sendMessage: (message: string, customData?: any) => Promise<void>;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  isSendingMessage: boolean;
  isConnected: boolean;
  connectionError: string | null;
  sendGiftEvent?: (giftData: any) => Promise<void>;
}
