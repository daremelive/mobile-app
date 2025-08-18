import React from 'react';
import { View, Text, Image } from 'react-native';
import type { StreamMessage } from '../../../src/store/streamsApi';

export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: string;
  profilePicture?: string;
  isHost?: boolean;
  userId?: string;
}

interface StreamChatOverlayProps {
  messages: (ChatMessage | StreamMessage)[];
  isVisible?: boolean;
  keyboardHeight?: number;
  isKeyboardVisible?: boolean;
  inputBarHeight?: number;
  reservedTopGap?: number;
  baseURL?: string;
  hostId?: number | string;
}

export const StreamChatOverlay = ({
  messages,
  isVisible = true,
  keyboardHeight = 0,
  isKeyboardVisible = false,
  inputBarHeight = 72,
  reservedTopGap = 150,
  baseURL = '',
  hostId,
}: StreamChatOverlayProps) => {
  if (!isVisible) {
    return null;
  }

  // Show only the 3 most recent messages (TikTok style)
  const recentMessages = messages.slice(-3);

  // Dynamic bottom spacing accounts for keyboard & input bar
  const bottomOffset = (isKeyboardVisible ? keyboardHeight : 0) + inputBarHeight + 8;

  // Helper function to normalize message data
  const getNormalizedMessage = (msg: ChatMessage | StreamMessage) => {
    // Check if it's a StreamMessage (RTK Query format)
    if ('user' in msg && typeof msg.user === 'object') {
      const streamMsg = msg as StreamMessage;
      
      const fullName = streamMsg.user.full_name || `${streamMsg.user.first_name || ''} ${streamMsg.user.last_name || ''}`.trim() || streamMsg.user.username || 'Unknown User';
      
      // Construct profile URL with proper handling like in host.tsx
      const profileUrl = (() => {
        if (streamMsg.user.profile_picture_url) {
          if (streamMsg.user.profile_picture_url.startsWith('http')) {
            return streamMsg.user.profile_picture_url;
          }
          // Use baseURL to construct full URL, removing /api/ if present
          const webURL = baseURL?.replace('/api/', '') || 'https://daremelive.pythonanywhere.com';
          const fullUrl = `${webURL}${streamMsg.user.profile_picture_url}`;
          
          // Debug URL construction
          if (__DEV__) {
            console.log('🔧 Profile URL Construction:', {
              rawUrl: streamMsg.user.profile_picture_url,
              baseURL,
              webURL,
              fullUrl,
              userId: streamMsg.user.id,
              username: streamMsg.user.username || streamMsg.user.full_name
            });
          }
          
          return fullUrl;
        }
        
        // Check for profile_picture field as fallback
        if ((streamMsg.user as any).profile_picture) {
          const profilePicture = (streamMsg.user as any).profile_picture;
          if (profilePicture.startsWith('http')) {
            return profilePicture;
          }
          const webURL = baseURL?.replace('/api/', '') || 'https://daremelive.pythonanywhere.com';
          return `${webURL}${profilePicture}`;
        }
        
        return undefined;
      })();
      
      // Debug profile picture construction
      if (__DEV__ && (streamMsg.user.profile_picture_url || (streamMsg.user as any).profile_picture)) {
        console.log('🖼️ Chat Profile Picture Debug:', {
          rawProfileUrl: streamMsg.user.profile_picture_url,
          rawProfilePicture: (streamMsg.user as any).profile_picture,
          baseURL: baseURL,
          webURL: baseURL?.replace('/api/', ''),
          constructedURL: profileUrl,
          userId: streamMsg.user.id,
          username: fullName
        });
      }
      
      return {
        id: streamMsg.id.toString(),
        username: fullName,
        message: streamMsg.message,
        timestamp: streamMsg.created_at,
        profilePicture: profileUrl,
        isHost: hostId ? streamMsg.user.id.toString() === hostId.toString() : false,
        userId: streamMsg.user.id.toString(),
      };
    }
    // Otherwise it's already a ChatMessage
    return msg as ChatMessage;
  };

  // Debug logging for all messages
  if (__DEV__ && messages.length > 0) {
    console.log('💬 Chat Messages Debug:', {
      totalMessages: messages.length,
      recentMessages: recentMessages.length,
      baseURL,
      hostId,
      messagesSample: recentMessages.map(msg => {
        const normalized = getNormalizedMessage(msg);
        return {
          id: normalized.id,
          username: normalized.username,
          hasProfilePicture: !!normalized.profilePicture,
          profilePictureUrl: normalized.profilePicture,
          messageType: (msg as any).message_type || 'unknown',
          rawUser: 'user' in msg ? (msg as any).user : 'no user field'
        };
      })
    });
  }

  return (
    <View
      style={{ 
        position: 'absolute', 
        left: 16, 
        right: 16, 
        bottom: bottomOffset + 20, 
        zIndex: 1000,
        pointerEvents: 'none'
      }}
    >
      {recentMessages.length === 0 ? null : (
        <View style={{ gap: 8 }}>
          {recentMessages.map((msgData, index) => {
            const msg = getNormalizedMessage(msgData);
            return (
              <View key={`${msg.id}-${index}`} style={{ alignSelf: 'flex-start' }}>
                <View style={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.75)', 
                  borderRadius: 20, 
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  flexShrink: 1,
                  flexGrow: 0
                }}>
                  <View style={{ 
                    width: 32, 
                    height: 32, 
                    borderRadius: 16, 
                    marginRight: 12, 
                    overflow: 'hidden',
                    backgroundColor: '#4a5568'
                  }}>
                    {msg.profilePicture && msg.profilePicture.trim() ? (
                      <Image
                        source={{ uri: msg.profilePicture.trim() }}
                        style={{ width: 32, height: 32 }}
                        onError={(error) => {
                          if (__DEV__) {
                            console.log('🚨 Chat Image load ERROR:', {
                              url: msg.profilePicture,
                              error: error.nativeEvent?.error,
                              username: msg.username,
                              fullError: error
                            });
                          }
                        }}
                        onLoad={() => {
                          if (__DEV__) {
                            console.log('✅ Chat Image loaded successfully:', {
                              url: msg.profilePicture,
                              username: msg.username
                            });
                          }
                        }}
                        onLoadStart={() => {
                          if (__DEV__) {
                            console.log('🔄 Chat Image loading started:', {
                              url: msg.profilePicture,
                              username: msg.username
                            });
                          }
                        }}
                      />
                    ) : (
                      <View style={{ 
                        width: 32, 
                        height: 32, 
                        backgroundColor: '#4a5568',
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                          {msg.username.substring(0, 2).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexShrink: 1, minWidth: 0 }}>
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: '#ffffff',
                      marginBottom: 2
                    }}>
                      {msg.username}
                    </Text>
                    <Text style={{
                      color: '#ffffff',
                      fontSize: 15,
                      lineHeight: 20,
                      fontWeight: '400'
                    }}>
                      {msg.message}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};
