import React from 'react';
import { View, Text, Image } from 'react-native';
import type { StreamMessage } from '../../../src/store/streamsApi';
import { ChatMessage, StreamChatOverlayProps } from './types';

export const StreamChatOverlay = ({
  messages = [],
  isVisible = true,
  keyboardHeight = 0,
  isKeyboardVisible = false,
  inputBarHeight = 72,
  reservedTopGap = 150,
  baseURL = '',
  hostId = null,
}: StreamChatOverlayProps) => {
  if (!isVisible) {
    return null;
  }

  // Ensure messages is always an array
  const safeMessages = Array.isArray(messages) ? messages : [];

  // Show only the 3 most recent messages (TikTok style)
  const recentMessages = safeMessages.slice(-3);

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
          // Ensure no double slashes - normalize the path
          const profilePath = streamMsg.user.profile_picture_url.startsWith('/')
            ? streamMsg.user.profile_picture_url
            : `/${streamMsg.user.profile_picture_url}`;
          const fullUrl = `${webURL}${profilePath}`;

          return fullUrl;
        }

        // Check for profile_picture field as fallback
        if ((streamMsg.user as any).profile_picture) {
          const profilePicture = (streamMsg.user as any).profile_picture;
          if (profilePicture.startsWith('http')) {
            return profilePicture;
          }
          const webURL = baseURL?.replace('/api/', '') || 'https://daremelive.pythonanywhere.com';
          // Ensure no double slashes - normalize the path
          const profilePath = profilePicture.startsWith('/')
            ? profilePicture
            : `/${profilePicture}`;
          return `${webURL}${profilePath}`;
        }

        return undefined;

        return undefined;
      })();

      // Removed profile picture debug logging to reduce console output

      return {
        id: streamMsg.id ? String(streamMsg.id) : `msg-${Date.now()}`,
        username: fullName, // Use full name as username for display
        full_name: fullName, // Also set full_name field
        message: streamMsg.message,
        timestamp: streamMsg.created_at,
        profilePicture: profileUrl,
        isHost: hostId && streamMsg.user?.id ? String(streamMsg.user.id) === String(hostId) : false,
        userId: streamMsg.user?.id ? String(streamMsg.user.id) : 'unknown',
      };
    }
    // Otherwise it's already a ChatMessage, but ensure we use full_name if available
    const chatMsg = msg as ChatMessage;
    const displayName = chatMsg.full_name || chatMsg.username || 'Unknown User';

    return {
      ...chatMsg,
      username: displayName, // Use full name as display name
      full_name: displayName, // Ensure full_name is set
    };
  };

  // Removed debug logging to reduce console output

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
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  borderRadius: 16,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  flexShrink: 1,
                  flexGrow: 0
                }}>
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    marginRight: 8,
                    overflow: 'hidden',
                    backgroundColor: '#4a5568'
                  }}>
                    {msg.profilePicture && msg.profilePicture.trim() ? (
                      <Image
                        source={{ uri: msg.profilePicture.trim() }}
                        style={{ width: 24, height: 24 }}
                      />
                    ) : (
                      <View style={{
                        width: 24,
                        height: 24,
                        backgroundColor: '#4a5568',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                          {(() => {
                            const username = msg.username || 'U';
                            return username.substring(0, 2).toUpperCase();
                          })()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexShrink: 1, minWidth: 0 }}>
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: '#ffffff',
                      marginBottom: 1
                    }}>
                      {msg.username}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {/* Display gift icon if this is a gift message */}
                      {((msg as ChatMessage).gift_icon || (msg as ChatMessage).gift?.icon) && (
                        <View style={{ marginRight: 6, marginBottom: 1 }}>
                          {/* Try to display gift icon image first */}
                          {(msg as ChatMessage).gift_icon && (msg as ChatMessage).gift_icon!.startsWith('http') ? (
                            <Image
                              source={{ uri: (msg as ChatMessage).gift_icon }}
                              style={{ width: 18, height: 18 }}
                              resizeMode="contain"
                            />
                          ) : (msg as ChatMessage).gift_icon && baseURL ? (
                            <Image
                              source={{ uri: `${baseURL.replace('/api/', '')}/media/${(msg as ChatMessage).gift_icon!.replace(/^\//, '')}` }}
                              style={{ width: 18, height: 18 }}
                              resizeMode="contain"
                            />
                          ) : (
                            /* Fallback to emoji icon */
                            <Text style={{ fontSize: 16 }}>
                              {(msg as ChatMessage).gift?.icon || '🎁'}
                            </Text>
                          )}
                        </View>
                      )}
                      <View style={{ flexShrink: 1 }}>
                        <Text style={{
                          color: ((msg as ChatMessage).gift_icon || (msg as ChatMessage).gift?.icon) ? '#FFD700' : '#ffffff',
                          fontSize: 13,
                          lineHeight: 18,
                          fontWeight: ((msg as ChatMessage).gift_icon || (msg as ChatMessage).gift?.icon) ? '600' : '400'
                        }}>
                          {msg.message}
                        </Text>
                        {/* Show gift cost if available */}
                        {(msg as ChatMessage).gift_cost && (
                          <Text style={{
                            color: '#FFD700',
                            fontSize: 10,
                            fontWeight: '500',
                            marginTop: 1
                          }}>
                            💎 {(msg as ChatMessage).gift_cost} Riz
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )
      }
    </View >
  );
};
