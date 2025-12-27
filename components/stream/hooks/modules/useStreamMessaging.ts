/**
 * Stream messaging hook
 * Handles chat messages, sending, and real-time updates
 */

import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useSendMessageMutation } from '../../../../src/store/streamsApi';
import { UseChatProps, UseChatReturn } from '../../../../types/hooks/chat';

export const useStreamMessaging = ({
  streamId,
  enabled = true,
  maxMessages = 100
}: UseChatProps): UseChatReturn => {
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();

  const handleSendMessage = useCallback(async (message: string): Promise<void> => {
    if (!enabled || !message.trim()) {
      return;
    }

    try {
      await sendMessage({
        streamId,
        data: { message: message.trim() }
      }).unwrap();
      
    } catch (error: any) {
      Alert.alert('Error', 'Failed to send message');
      throw error;
    }
  }, [streamId, enabled, sendMessage]);

  return {
    messages: [], // Will be handled by parent component
    sendMessage: handleSendMessage,
    isLoading: isSending,
    error: null,
    refetch: () => {} // Will be handled by parent component
  };
};