/**
 * Chat hook types
 * Chat and messaging hook interfaces
 */

import { ChatMessage } from '../stream/messages';

// Chat hook props
export interface UseChatProps {
  streamId: string;
  enabled?: boolean;
  maxMessages?: number;
}

// Chat hook return type
export interface UseChatReturn {
  messages: ChatMessage[];
  sendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Hybrid chat hook props
export interface UseHybridChatProps extends UseChatProps {
  fallbackMessages?: ChatMessage[];
  syncInterval?: number;
}

// Hybrid chat hook return
export interface UseHybridChatReturn extends UseChatReturn {
  isSyncing: boolean;
  lastSyncTime: number | null;
  forceSync: () => void;
}