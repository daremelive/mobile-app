import { useStreamChatWithStream } from './useStreamChatWithStream';
import type { ChatMessage } from '../components/StreamChatOverlay';

interface UseHybridStreamChatProps {
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

interface UseHybridStreamChatReturn {
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
  sendGiftEvent?: (giftData: any) => Promise<void>; // 🎁 Add gift event method
}

export const useHybridStreamChat = ({
  streamId,
  streamTitle = 'Live Stream',
  userId,
  username,
  isHost = false,
  hostId, // Pass through the actual host ID
  profilePicture,
  useStreamChat = true, // Default to Stream Chat
  baseURL, // Add baseURL parameter
}: UseHybridStreamChatProps): UseHybridStreamChatReturn => {
  // Stream Chat implementation only - GetStream.io provides reliable real-time messaging
  const streamChatHook = useStreamChatWithStream({
    streamId,
    streamTitle,
    userId,
    username,
    isHost,
    hostId, // Pass the actual host ID
    profilePicture,
    enabled: useStreamChat,
    baseURL, // Pass baseURL for profile picture construction
  });

  return {
    ...streamChatHook,
    chatProvider: 'stream-chat',
  };
};
