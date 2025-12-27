import { useStreamChatWithStream } from './useStreamChatWithStream';
import type { ChatMessage } from '../components/types';
import { UseHybridStreamChatProps, UseHybridStreamChatReturn } from './types';

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
