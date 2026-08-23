import React from 'react';
import { View, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { fonts } from '../../../constants/Fonts';
import type { StreamMessage } from '../../../src/store/streamsApi';
import { ChatMessage, StreamChatOverlayProps } from './types';
import { buildMediaURL, buildProfilePictureURL } from '../../../src/config/env';

/** Design tokens from the live stream design. */
const BUBBLE = 'rgba(38,38,38,0.5)';
const AVATAR_BG = '#19171A';
const NAME = '#E1E2ED';
const MESSAGE = '#EDEEF9';
/** The design caps a bubble at 320 of the 343 available to the overlay. */
const BUBBLE_MAX_WIDTH = 320;

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

  // Show only the 4 most recent messages, as the design stacks them
  const recentMessages = safeMessages.slice(-4);

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
          return buildProfilePictureURL(streamMsg.user.profile_picture_url);
        }

        // Check for profile_picture field as fallback
        if ((streamMsg.user as any).profile_picture) {
          const profilePicture = (streamMsg.user as any).profile_picture;
          if (profilePicture.startsWith('http')) {
            return profilePicture;
          }
          return buildProfilePictureURL(profilePicture);
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
        <View style={{ gap: 8, alignItems: 'flex-start' }}>
          {recentMessages.map((msgData, index) => {
            const msg = getNormalizedMessage(msgData);
            return (
              <BlurView
                key={`${msg.id}-${index}`}
                intensity={8}
                tint="dark"
                style={{
                  maxWidth: BUBBLE_MAX_WIDTH,
                  backgroundColor: BUBBLE,
                  borderRadius: 12,
                  overflow: 'hidden',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    overflow: 'hidden',
                    backgroundColor: AVATAR_BG
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
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Text style={{ color: MESSAGE, fontSize: 10, fontFamily: fonts.semiBold }}>
                          {(() => {
                            const username = msg.username || 'U';
                            return username.substring(0, 2).toUpperCase();
                          })()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexShrink: 1, minWidth: 0, gap: 4 }}>
                    <Text style={{
                      fontSize: 12,
                      lineHeight: 12,
                      fontFamily: fonts.regular,
                      color: NAME
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
                              source={{ uri: buildMediaURL(`/media/${(msg as ChatMessage).gift_icon!.replace(/^\/?(?:media\/)?/, '')}`) }}
                              style={{ width: 18, height: 18 }}
                              resizeMode="contain"
                            />
                          ) : (msg as ChatMessage).gift?.icon ? (
                            <Text style={{ fontSize: 16 }}>
                              {(msg as ChatMessage).gift?.icon}
                            </Text>
                          ) : (
                            <Ionicons name="gift-outline" size={16} color="#FFD700" />
                          )}
                        </View>
                      )}
                      <View style={{ flexShrink: 1 }}>
                        <Text style={{
                          color: ((msg as ChatMessage).gift_icon || (msg as ChatMessage).gift?.icon) ? '#FFD700' : MESSAGE,
                          fontSize: 12,
                          lineHeight: 19.2,
                          fontFamily: fonts.semiBold
                        }}>
                          {msg.message}
                        </Text>
                        {/* Show gift cost if available */}
                        {(msg as ChatMessage).gift_cost && (
                          <Text style={{
                            color: '#FFD700',
                            fontSize: 10,
                            fontFamily: fonts.medium,
                            marginTop: 1
                          }}>
                            {(msg as ChatMessage).gift_cost} Riz
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
              </BlurView>
            );
          })}
        </View>
      )
      }
    </View >
  );
};
