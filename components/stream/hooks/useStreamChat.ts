import { useState, useEffect, useCallback, useRef } from 'react';
import { Keyboard } from 'react-native';
import { useSendMessageMutation } from '../../../src/store/streamsApi';
import type { ChatMessage } from '../components/StreamChatOverlay';

interface UseStreamChatProps {
  streamId: string;
  userId?: string;
  username?: string;
  isHost?: boolean;
}

interface UseStreamChatReturn {
  messages: ChatMessage[];
  isKeyboardVisible: boolean;
  keyboardHeight: number;
  sendMessage: (message: string) => Promise<void>;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  isSendingMessage: boolean;
}

export const useStreamChat = ({
  streamId,
  userId,
  username,
  isHost = false,
}: UseStreamChatProps): UseStreamChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [sendMessageMutation, { isLoading: isSendingMessage }] = useSendMessageMutation();
  
  // Keep track of message count for performance
  const maxMessages = 100;
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => {
      const newMessages = [...prev, message];
      // Keep only recent messages for performance
      if (newMessages.length > maxMessages) {
        return newMessages.slice(-maxMessages);
      }
      return newMessages;
    });
  }, []);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || !userId || !username) return;

    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      username,
      message: messageText.trim(),
      timestamp: new Date().toISOString(),
      isHost,
      userId,
    };

    // Optimistically add message
    addMessage(tempMessage);

    try {
      await sendMessageMutation({
        streamId: streamId,
        data: {
          message: messageText.trim(),
        }
      }).unwrap();
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
    }
  }, [streamId, userId, username, isHost, sendMessageMutation, addMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    messagesRef.current = [];
  }, []);

  return {
    messages,
    isKeyboardVisible,
    keyboardHeight,
    sendMessage,
    addMessage,
    clearMessages,
    isSendingMessage,
  };
};
