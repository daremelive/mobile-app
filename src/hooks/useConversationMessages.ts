import { useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/authSlice';
import { API_BASE_URL } from '../config/env';
import { logger } from '../utils/logger';
import { createRequestId } from '../utils/requestId';
import { authenticatedFetch } from '../api/authenticatedFetch';

interface Message {
  id: number;
  content: string;
  created_at: string;
  is_delivered: boolean;
  delivered_at?: string;
  is_read: boolean;
  read_at?: string;
  sender: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    profile_picture_url?: string;
    is_online?: boolean;
    last_seen?: string;
  };
  is_outgoing: boolean;
}

export const useConversationMessages = (conversationId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<any>(null);
  const currentUser = useSelector(selectCurrentUser);
  const pendingMessageRequest = useRef<{
    recipientId: number;
    content: string;
    requestId: string;
  } | null>(null);

  const getBaseUrl = async () => {
    return API_BASE_URL;
  };

  const fetchConversation = useCallback(async () => {
    if (!conversationId) return null;

    // Handle new conversation case (ID is "0" or starts with "new-")
    if (conversationId === '0' || conversationId.startsWith('new-')) {
      return null;
    }

    try {
      const baseUrl = await getBaseUrl();


      // Create timeout controller for React Native compatibility
      const controller1 = new AbortController();
      const timeoutId1 = setTimeout(() => controller1.abort(), 15000);

      const response = await authenticatedFetch(`${baseUrl}messaging/conversations/${conversationId}/`, {
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller1.signal,
      });

      clearTimeout(timeoutId1);


      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Conversation fetch failed:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`Failed to fetch conversation: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setConversation(data);

      // If the conversation includes messages, use those instead of fetching separately
      if (data.messages && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }

      return data;
    } catch (err: any) {
      logger.error('Error fetching conversation:', err);
      setError(err.message);
      return null;
    }
  }, [conversationId]);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;

    // Handle new conversation case (ID is "0" or starts with "new-")
    if (conversationId === '0' || conversationId.startsWith('new-')) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const baseUrl = await getBaseUrl();


      // Create timeout controller for React Native compatibility
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 15000);

      const response = await authenticatedFetch(`${baseUrl}messaging/conversations/${conversationId}/messages/`, {
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller2.signal,
      });

      clearTimeout(timeoutId2);


      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Messages fetch failed:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`Failed to fetch messages: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Handle both paginated and non-paginated responses
      const messagesArray = Array.isArray(data) ? data : (data.results || []);
      setMessages(messagesArray);
    } catch (err: any) {
      logger.error('Error fetching messages:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!conversationId || !text.trim() || !currentUser) {
      logger.error('SendMessage validation failed:', {
        conversationId: !!conversationId,
        textTrim: !!text.trim(),
        currentUser: !!currentUser
      });
      return;
    }

    try {
      const baseUrl = await getBaseUrl();


      // Create timeout controller for React Native compatibility
      const controller3 = new AbortController();
      const timeoutId3 = setTimeout(() => controller3.abort(), 15000);

      // First, get the conversation details to find the recipient
      const conversationResponse = await authenticatedFetch(`${baseUrl}messaging/conversations/${conversationId}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller3.signal,
      });

      clearTimeout(timeoutId3);


      if (!conversationResponse.ok) {
        const errorText = await conversationResponse.text();
        logger.error('Failed to get conversation:', errorText);
        throw new Error(`Failed to get conversation details: ${conversationResponse.status}`);
      }

      const conversation = await conversationResponse.json();

      // The detailed conversation endpoint returns 'other_participant' directly
      const recipient = conversation.other_participant;

      if (!recipient || !recipient.id) {
        logger.error('Could not find other participant:', conversation);
        throw new Error('Could not find conversation recipient');
      }

      const normalizedContent = text.trim();
      let messageRequest = pendingMessageRequest.current;
      if (
        !messageRequest
        || messageRequest.recipientId !== recipient.id
        || messageRequest.content !== normalizedContent
      ) {
        messageRequest = {
          recipientId: recipient.id,
          content: normalizedContent,
          requestId: createRequestId('message'),
        };
      }
      pendingMessageRequest.current = messageRequest;

      // Create timeout controller for React Native compatibility
      const controller4 = new AbortController();
      const timeoutId4 = setTimeout(() => controller4.abort(), 15000);

      // Now send the message
      const response = await authenticatedFetch(`${baseUrl}messaging/send/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller4.signal,
        body: JSON.stringify({
          recipient_id: recipient.id,
          content: normalizedContent,
          request_id: messageRequest.requestId,
        }),
      });

      clearTimeout(timeoutId4);


      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Failed to send message:', errorText);
        throw new Error(`Failed to send message: ${response.status}`);
      }

      const data = await response.json();
      pendingMessageRequest.current = null;

      // Ensure the message has the correct format
      const messageWithCorrectFormat = {
        ...data,
        is_outgoing: true, // Ensure this is set for sent messages
        sender: {
          ...data.sender,
          id: currentUser.id,
          username: currentUser.username,
          first_name: currentUser.first_name,
          last_name: currentUser.last_name,
        }
      };

      setMessages(prev => {
        const newMessages = [...prev, messageWithCorrectFormat];
        return newMessages;
      });
      return data;
    } catch (err) {
      logger.error('Error sending message:', err);
      throw err;
    }
  }, [conversationId, currentUser]);

  return {
    messages,
    loading,
    error,
    conversation,
    fetchMessages,
    fetchConversation,
    sendMessage,
  };
};
