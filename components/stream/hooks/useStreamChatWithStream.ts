import { useState, useEffect, useCallback, useRef } from 'react';
import { Keyboard } from 'react-native';
import streamChatService, { StreamChatMessage, StreamChatUser, getStreamChatServiceForUser } from '../../../src/services/StreamChatService';
import type { ChatMessage } from '../components/StreamChatOverlay';
import { store } from '../../../src/store';
import { usersApi, UserProfile } from '../../../src/store/usersApi';

interface UseStreamChatWithStreamProps {
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

interface UseStreamChatWithStreamReturn {
  messages: ChatMessage[];
  isKeyboardVisible: boolean;
  keyboardHeight: number;
  sendMessage: (message: string, customData?: any) => Promise<void>;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  isSendingMessage: boolean;
  isConnected: boolean;
  connectionError: string | null;
  sendGiftEvent?: (giftData: any) => Promise<void>; // 🎁 Add gift event method
}

export const useStreamChatWithStream = ({
  streamId,
  streamTitle,
  userId,
  username,
  isHost = false,
  hostId, // Actual host ID from stream details
  profilePicture,
  enabled = true,
  baseURL, // Add baseURL parameter
}: UseStreamChatWithStreamProps): UseStreamChatWithStreamReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // User profile cache to store profile pictures
  const userProfileCache = useRef<Map<string, UserProfile>>(new Map());
  
  // Keep track of message count for performance
  const maxMessages = 100;
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const initializationRef = useRef<boolean>(false);
  const serviceRef = useRef<any>(null); // Store the service instance for this user

  // Get user-specific service instance
  useEffect(() => {
    if (userId) {
      serviceRef.current = getStreamChatServiceForUser(userId);
    }
  }, [userId]);

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

  // Initialize Stream Chat when enabled and user data is available
  useEffect(() => {
    if (!enabled || !streamId || !userId || !username || initializationRef.current) {
      return;
    }

    const initializeStreamChat = async () => {
      try {
        setConnectionError(null);
        initializationRef.current = true;

        // Create user object for Stream Chat
        const user: StreamChatUser = {
          id: userId,
          name: username,
          image: profilePicture,
        };

        // Initialize and connect to Stream Chat
        const service = serviceRef.current || streamChatService; // Fallback to default service
        await service.initialize();
        await service.connectUser(user);

        // Create or join the stream channel
        const channel = await service.createOrJoinStreamChannel(
          streamId,
          streamTitle,
          user,
          hostId // Pass the actual host ID from stream details
        );

        // Load recent messages
        const recentMessages = await service.getRecentMessages(50);
        
        // Convert messages with profile picture lookup
        const convertedMessages: ChatMessage[] = [];
        for (const message of recentMessages) {
          try {
            const converted = await convertStreamChatMessage(message);
            convertedMessages.push(converted);
          } catch (error) {
            console.error('[useStreamChat] Failed to convert recent message:', error);
          }
        }
        
        setMessages(convertedMessages);

        // Subscribe to new messages
        const channelId = `stream-${streamId}`;
        const unsubscribe = service.subscribeToMessages(
          channelId,
          async (streamMessage: StreamChatMessage) => {
            try {
              const convertedMessage = await convertStreamChatMessage(streamMessage);
              
              setMessages(prev => {
                // Check if message already exists (prevent duplicates)
                const exists = prev.some(msg => msg.id === convertedMessage.id);
                if (exists) {
                  return prev;
                }
                
                const newMessages = [...prev, convertedMessage];
                
                // Keep only recent messages for performance
                if (newMessages.length > maxMessages) {
                  return newMessages.slice(-maxMessages);
                }
                return newMessages;
              });
            } catch (error) {
              console.error('❌ [useStreamChat] Failed to convert message:', error);
            }
          }
        );

        unsubscribeRef.current = unsubscribe;
        setIsConnected(true);
        
      } catch (error) {
        console.error('❌ [useStreamChat] Failed to initialize Stream Chat:', error);
        setConnectionError(error instanceof Error ? error.message : 'Connection failed');
        setIsConnected(false);
        initializationRef.current = false;
      }
    };

    initializeStreamChat();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      const service = serviceRef.current || streamChatService;
      service.leaveChannel();
      initializationRef.current = false;
    };
  }, [enabled, streamId, streamTitle, userId, username, profilePicture]);

  // Disconnect when component unmounts or user changes
  useEffect(() => {
    return () => {
      const service = serviceRef.current || streamChatService;
      service.disconnect();
    };
  }, [userId]);

  // Helper function to get user profile with caching
  const getUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    // Check cache first
    if (userProfileCache.current.has(userId)) {
      return userProfileCache.current.get(userId)!;
    }

    try {
      const result = await store.dispatch(usersApi.endpoints.getUserProfile.initiate(userId)).unwrap();
      
      // Cache the result
      userProfileCache.current.set(userId, result);
      
      return result;
    } catch (error) {
      console.error('❌ [useStreamChat] Failed to fetch user profile for userId:', userId, error);
      return null;
    }
  }, []);

  const convertStreamChatMessage = useCallback(async (streamMessage: StreamChatMessage): Promise<ChatMessage> => {
    // Get the host ID from the service to properly identify host messages
    const service = serviceRef.current || streamChatService;
    const hostId = service.getHostId();
    
    // Try to get profile picture from Stream Chat user data first
    let profilePictureUrl = streamMessage.user.image;
    let userProfile: UserProfile | null = null;
    
    // If no profile picture in Stream Chat, fetch from backend API
    if (!profilePictureUrl) {
      userProfile = await getUserProfile(streamMessage.user.id);
      profilePictureUrl = userProfile?.profile_picture_url || undefined;
    }
    
    // Get user's real name - prioritize first name + last name from user profile
    let displayName = streamMessage.user.name || 'Unknown User';
    
    // If we have user profile data, use real names
    if (userProfile) {
      if (userProfile.first_name && userProfile.last_name) {
        displayName = `${userProfile.first_name} ${userProfile.last_name}`;
      } else if (userProfile.full_name) {
        displayName = userProfile.full_name;
      } else if (userProfile.username) {
        displayName = userProfile.username;
      }
    }
    
    // Fix profile picture URL construction (similar to StreamChatOverlay)
    const getProfilePictureUrl = (imageUrl?: string) => {
      if (!imageUrl) return undefined;
      
      if (imageUrl.startsWith('http')) {
        return imageUrl; // Already a full URL
      }
      
      // Construct full URL for relative paths
      const webURL = baseURL?.replace('/api/', '') || 'https://daremelive.pythonanywhere.com';
      const profilePath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
      return `${webURL}${profilePath}`;
    };
    
    const finalProfilePictureUrl = getProfilePictureUrl(profilePictureUrl);
    
    return {
      id: streamMessage.id,
      username: displayName, // Use real name instead of Stream Chat username
      full_name: displayName, // Also set full_name field
      message: streamMessage.text,
      timestamp: streamMessage.created_at,
      profilePicture: finalProfilePictureUrl,
      isHost: streamMessage.user.id === hostId, // Message is from host if sender ID matches host ID
      userId: streamMessage.user.id,
      // Preserve gift-related data if present
      message_type: (streamMessage as any).message_type,
      gift_id: (streamMessage as any).gift_id,
      gift_name: (streamMessage as any).gift_name,
      gift_icon: (streamMessage as any).gift_icon,
      gift_cost: (streamMessage as any).gift_cost,
      gift: (streamMessage as any).gift,
      // Preserve any other custom data
      ...(Object.keys(streamMessage).filter(key => 
        !['id', 'user', 'text', 'created_at', 'updated_at'].includes(key)
      ).reduce((obj, key) => {
        obj[key] = (streamMessage as any)[key];
        return obj;
      }, {} as any)),
    };
  }, [baseURL, getUserProfile]);

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

  const sendMessage = useCallback(async (messageText: string, customData?: any) => {
    if (!messageText.trim() || !userId || !username || !isConnected) {
      console.warn('⚠️ [useStreamChat] Cannot send message - missing requirements or not connected');
      return;
    }

    setIsSendingMessage(true);

    // Try to get current user's full name for optimistic message
    let displayName = username; // Default to username
    try {
      const userProfile = await getUserProfile(userId);
      if (userProfile) {
        if (userProfile.first_name && userProfile.last_name) {
          displayName = `${userProfile.first_name} ${userProfile.last_name}`;
        } else if (userProfile.full_name) {
          displayName = userProfile.full_name;
        }
      }
    } catch (error) {
      // Could not get user profile for optimistic message, using username
    }

    // Create optimistic message for immediate UI feedback
    const optimisticMessage: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      username: displayName, // Use full name as display name
      full_name: displayName, // Set full_name field
      message: messageText.trim(),
      timestamp: new Date().toISOString(),
      isHost,
      userId,
      profilePicture,
      // Add custom data if provided (for gift messages)
      ...(customData || {}),
    };

    // Add optimistic message immediately
    addMessage(optimisticMessage);

    try {
      const service = serviceRef.current || streamChatService;
      await service.sendMessage(messageText.trim(), customData);
      
      // Remove optimistic message as the real one will come through the subscription
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      
    } catch (error) {
      console.error('❌ [useStreamChat] Failed to send message:', error);
      
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      
      // Could show error toast here if needed
      throw error;
    } finally {
      setIsSendingMessage(false);
    }
  }, [streamId, userId, username, isHost, addMessage, isConnected, profilePicture]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // 🎁 Gift event method
  const sendGiftEvent = useCallback(async (giftData: any) => {
    if (!isConnected) {
      console.warn('[useStreamChat] Cannot send gift event - not connected');
      return;
    }

    try {
      const service = serviceRef.current || streamChatService;
      await service.sendGiftEvent(giftData);
      
    } catch (error) {
      console.error('[useStreamChat] Failed to send gift event:', error);
      throw error;
    }
  }, [isConnected]);

  return {
    messages,
    isKeyboardVisible,
    keyboardHeight,
    sendMessage,
    addMessage,
    clearMessages,
    isSendingMessage,
    isConnected,
    connectionError,
    sendGiftEvent, // Expose gift event method
  };
};
