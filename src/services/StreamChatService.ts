import { StreamChat, Channel, ChannelState } from 'stream-chat';
import { User } from 'stream-chat';
import { store } from '../store';
import { streamsApi } from '../store/streamsApi';
import { logger } from '../utils/logger';

export interface StreamChatMessage {
  id: string;
  user: {
    id: string;
    name?: string;
    image?: string;
  };
  text: string;
  created_at: string;
  updated_at?: string;
  // Allow any additional custom data (like gift data)
  [key: string]: any;
}

export interface StreamChatUser {
  id: string;
  name: string;
  image?: string;
}

class StreamChatService {
  private client: StreamChat | null = null;
  private currentChannel: Channel | null = null;
  private messageListeners: Map<string, (message: StreamChatMessage) => void> = new Map();
  private hostId: string | null = null; // Track the host ID for this stream

  async initialize(): Promise<StreamChat> {
    if (this.client) {
      return this.client;
    }

    try {
      logger.log('[StreamChat] Initializing Stream Chat client...');
      
      // Use the same GetStream credentials from your existing video setup
      const { token, api_key } = await this.getStreamCredentials();
      
      this.client = StreamChat.getInstance(api_key);
      logger.log('[StreamChat] Client initialized with API key');
      
      return this.client;
    } catch (error) {
      logger.error('[StreamChat] Failed to initialize client:', error);
      throw new Error('Failed to initialize Stream Chat');
    }
  }

  async connectUser(user: StreamChatUser): Promise<void> {
    logger.log('[StreamChat] Starting connectUser for:', user.id);
    
    if (!this.client) {
      logger.log('[StreamChat] Client not initialized, initializing now...');
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('Stream Chat client failed to initialize');
    }

    try {
      logger.log('[StreamChat] Connecting user:', user);
      
      // Check if user is already connected
      if (this.client.userID === user.id) {
        logger.log('[StreamChat] User already connected, skipping connection');
        return;
      }
      
      // Disconnect any existing user first
      if (this.client && this.client.userID) {
        logger.log('[StreamChat] Disconnecting existing user:', this.client.userID);
        await this.client.disconnectUser();
      }
      
      const { token, api_key } = await this.getStreamCredentials();
      logger.log('[StreamChat] Got credentials - API Key:', api_key, 'Token length:', token?.length);
      
      const streamUser: User = {
        id: user.id,
        name: user.name,
        image: user.image,
      };

      logger.log('[StreamChat] Connecting with user object:', streamUser);
      
      if (!this.client) {
        throw new Error('StreamChat client is not initialized');
      }
      
      await this.client.connectUser(streamUser, token);
      logger.log('[StreamChat] User connected successfully');
    } catch (error) {
      logger.error('[StreamChat] Failed to connect user:', error);
      // Log more details about the error
      if (error instanceof Error) {
        logger.error('[StreamChat] Error details:', {
          message: error.message,
          stack: error.stack,
        });
      }
      throw new Error('Failed to connect to Stream Chat');
    }
  }

  async createOrJoinStreamChannel(streamId: string, streamTitle: string, hostUser: StreamChatUser, actualHostId?: string): Promise<Channel> {
    if (!this.client) {
      throw new Error('Stream Chat client not initialized');
    }

    try {
      logger.log('[StreamChat] Creating/joining channel for stream:', streamId);
      logger.log('[StreamChat] Host user:', hostUser);
      logger.log('[StreamChat] Actual host ID from backend:', actualHostId);
      logger.log('[StreamChat] Stream title:', streamTitle);
      logger.log('[StreamChat] Current client user ID:', this.client.userID);
      
      // Create a channel specifically for this live stream
      const channelId = `stream-${streamId}`;
      logger.log('[StreamChat] Channel ID will be:', channelId);
      
      const channel = this.client.channel('livestream', channelId, {
        // Remove created_by_id to avoid server-side auth requirement
        ...(this.client.userID && { members: [this.client.userID] }), // Add current user as member if userID exists
      });

            logger.log('[StreamChat] Channel configuration:', {
        type: 'livestream',
        id: channelId,
        currentUserId: this.client.userID,
        providedHostId: actualHostId,
        fallbackHostId: hostUser.id,
      });

      logger.log('[StreamChat] Watching channel...');
      // Watch the channel (this joins it)
      const result = await channel.watch();
      logger.log('[StreamChat] Channel watch result:', {
        channelCid: result.channel?.cid,
        memberCount: result.members?.length,
        messageCount: result.messages?.length,
        watchers: result.watchers,
        members: Object.keys(result.members || {}),
        watcherCount: result.watcher_count,
      });

      // Set host ID consistently - use actualHostId parameter primarily
      this.hostId = actualHostId || hostUser.id;
      logger.log('[StreamChat] Set host ID to:', this.hostId, '(from actualHostId parameter or fallback to hostUser.id)');

      // Ensure the current user is added as a member
      try {
        logger.log('[StreamChat] Adding user as member...');
        await channel.addMembers([hostUser.id]);
        logger.log('[StreamChat] User added as member successfully');
      } catch (memberError) {
        logger.log('ℹ [StreamChat] User already a member or auto-added:', memberError instanceof Error ? memberError.message : 'Unknown error');
      }

      // Verify channel state after setup
      const channelState = await channel.query();
      logger.log('[StreamChat] Final channel state:', {
        cid: channelState.channel?.cid,
        memberCount: Object.keys(channelState.members || {}).length,
        members: Object.keys(channelState.members || {}),
        watchers: channelState.watchers,
        watcherCount: channelState.watcher_count,
        setHostId: this.hostId,
      });
      
      this.currentChannel = channel;
      logger.log('[StreamChat] Channel created/joined successfully');
      
      return channel;
    } catch (error) {
      logger.error('[StreamChat] Failed to create/join channel:', error);
      throw new Error('Failed to join stream chat');
    }
  }

  async sendMessage(text: string, customData?: any): Promise<void> {
    if (!this.currentChannel) {
      throw new Error('No active channel');
    }

    try {
      logger.log('[StreamChat] Sending message:', {
        text: text,
        channelCid: this.currentChannel.cid,
        senderId: this.client?.userID,
        hostId: this.hostId,
        isHost: this.client?.userID === this.hostId,
        hasCustomData: !!customData,
        customData: customData,
      });
      
      const messageData: any = {
        text: text.trim(),
      };
      
      // Add custom data if provided (for gift messages)
      if (customData) {
        Object.assign(messageData, customData);
      }
      
      const result = await this.currentChannel.sendMessage(messageData);
      
      logger.log('[StreamChat] Message sent successfully:', {
        messageId: result.message?.id,
        text: result.message?.text,
        senderId: result.message?.user?.id,
        channelCid: result.message?.cid,
        timestamp: result.message?.created_at,
        customData: customData,
      });
    } catch (error) {
      logger.error('[StreamChat] Failed to send message:', error);
      logger.error('[StreamChat] Send error details:', {
        channelCid: this.currentChannel?.cid,
        clientUserId: this.client?.userID,
        channelMembers: this.currentChannel?.state?.members ? Object.keys(this.currentChannel.state.members) : 'N/A',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to send message');
    }
  }

  subscribeToMessages(channelId: string, callback: (message: StreamChatMessage) => void): () => void {
    if (!this.currentChannel) {
      logger.warn('[StreamChat] No active channel for message subscription');
      return () => {};
    }

    logger.log('[StreamChat] Subscribing to messages for channel:', channelId);
    logger.log('[StreamChat] Current channel CID:', this.currentChannel.cid);
    logger.log('[StreamChat] Current user ID:', this.client?.userID);
    logger.log('[StreamChat] Host ID for this session:', this.hostId);
    
    const messageListener = (event: any) => {
      logger.log('[StreamChat] Event received:', event.type);
      logger.log('[StreamChat] Full event details:', {
        type: event.type,
        messageId: event.message?.id,
        senderId: event.message?.user?.id,
        senderName: event.message?.user?.name,
        text: event.message?.text,
        channelCid: event.cid,
        timestamp: event.message?.created_at,
      });
      
      if (event.type === 'message.new' && event.message) {
        const message: StreamChatMessage = {
          id: event.message.id,
          user: {
            id: event.message.user.id,
            name: event.message.user.name,
            image: event.message.user.image,
          },
          text: event.message.text || '',
          created_at: event.message.created_at,
          updated_at: event.message.updated_at,
          // Preserve all custom data (like gift data)
          ...Object.fromEntries(
            Object.entries(event.message).filter(([key]) => 
              !['id', 'user', 'text', 'created_at', 'updated_at'].includes(key)
            )
          ),
        };
        
        logger.log('[StreamChat] Processing new message:', {
          messageId: message.id,
          senderId: message.user.id,
          senderName: message.user.name,
          text: message.text,
          currentUserId: this.client?.userID,
          hostId: this.hostId,
          isFromHost: message.user.id === this.hostId,
          isFromCurrentUser: message.user.id === this.client?.userID,
          channelCid: event.cid,
          customType: (message as any).customType,
          isGift: (message as any).customType === 'gift',
        });
        
        // Always deliver the message to the callback
        callback(message);
        
        logger.log('[StreamChat] Message delivered to callback');
      } else {
        logger.log('[StreamChat] Non-message event or missing message data:', {
          type: event.type,
          hasMessage: !!event.message,
          messageKeys: event.message ? Object.keys(event.message) : 'N/A',
        });
      }
    };

    // Gift event listener - this is where the magic happens!
    const giftEventListener = (event: any) => {
      logger.log('[StreamChat Gift Event] Gift received!', {
        type: event.type,
        giftData: event.data,
        senderId: event.data?.sender_id,
        senderName: event.data?.sender_username,
        giftName: event.data?.gift_name,
        timestamp: event.data?.timestamp,
      });
      
      if (event.type === 'gift' && event.data) {
        // Import the gift animations hook dynamically to trigger animation
        try {
          // We'll emit this as a synthetic message so existing gift detection works
          const syntheticGiftMessage: StreamChatMessage = {
            id: `gift-${event.data.sender_id}-${Date.now()}`,
            user: {
              id: event.data.sender_id,
              name: event.data.sender_full_name || event.data.sender_username, // Use full name if available
              image: event.data.sender_profile_picture,
            },
            text: `sent ${event.data.gift_name}`,
            created_at: event.data.timestamp || new Date().toISOString(),
            customType: 'gift',
            gift_id: event.data.gift_id,
            gift_name: event.data.gift_name,
            gift_icon: event.data.gift_icon,
            gift_cost: event.data.gift_cost,
            gift: event.data.gift,
          };
          
          logger.log('[StreamChat Gift Event] Creating synthetic message for gift animation:', syntheticGiftMessage);
          
          // Send to message callback so gift detection can pick it up
          callback(syntheticGiftMessage);
          
          logger.log('[StreamChat Gift Event] Gift animation should trigger now! ');
        } catch (error) {
          logger.error('[StreamChat Gift Event] Error processing gift event:', error);
        }
      }
    };

    const watchingListener = (event: any) => {
      logger.log('[StreamChat] User started watching:', {
        userId: event.user?.id,
        userName: event.user?.name,
        totalWatchers: event.watcher_count,
      });
    };
    
    const memberListener = (event: any) => {
      logger.log('[StreamChat] Member added:', {
        userId: event.member?.user?.id,
        userName: event.member?.user?.name,
        totalMembers: event.member_count,
      });
    };

    const typingListener = (event: any) => {
      logger.log('⌨ [StreamChat] User typing:', {
        userId: event.user?.id,
        userName: event.user?.name,
      });
    };

    // Subscribe to all relevant events
    this.currentChannel.on('message.new', messageListener);
    this.currentChannel.on('user.watching.start', watchingListener);
    this.currentChannel.on('member.added', memberListener);
    this.currentChannel.on('typing.start', typingListener);

    // Listen for all events to catch custom gift events
    const allEventsListener = (event: any) => {
      if (event.type === 'gift') {
        giftEventListener(event);
      }
    };
    this.currentChannel.on(allEventsListener);

    logger.log('[StreamChat] Message + Gift Event subscription established for channel:', channelId);

    this.messageListeners.set(channelId, callback);

    // Return unsubscribe function
    return () => {
      logger.log('[StreamChat] Unsubscribing from messages + gift events for channel:', channelId);
      if (this.currentChannel) {
        this.currentChannel.off('message.new', messageListener);
        this.currentChannel.off('user.watching.start', watchingListener);
        this.currentChannel.off('member.added', memberListener);
        this.currentChannel.off('typing.start', typingListener);
        this.currentChannel.off(allEventsListener); // 🎁 Unsubscribe from all events listener
      }
      this.messageListeners.delete(channelId);
    };
  }

  async getRecentMessages(limit: number = 50): Promise<StreamChatMessage[]> {
    if (!this.currentChannel) {
      return [];
    }

    try {
      logger.log('[StreamChat] Fetching recent messages...');
      
      const state = await this.currentChannel.query({
        messages: { limit },
      });

      const messages: StreamChatMessage[] = (state.messages || []).map(msg => ({
        id: msg.id,
        user: {
          id: msg.user?.id || 'unknown',
          name: msg.user?.name || 'Unknown User',
          image: msg.user?.image,
        },
        text: msg.text || '',
        created_at: msg.created_at || new Date().toISOString(),
        updated_at: msg.updated_at,
      }));

      logger.log(`[StreamChat] Fetched ${messages.length} recent messages`);
      return messages;
    } catch (error) {
      logger.error('[StreamChat] Failed to fetch recent messages:', error);
      return [];
    }
  }

  async leaveChannel(): Promise<void> {
    if (this.currentChannel) {
      try {
        logger.log('[StreamChat] Leaving current channel...');
        
        // Clear all message listeners
        this.messageListeners.clear();
        
        // Stop watching the channel
        await this.currentChannel.stopWatching();
        this.currentChannel = null;
        
        logger.log('[StreamChat] Left channel successfully');
      } catch (error) {
        logger.error('[StreamChat] Error leaving channel:', error);
        // Don't throw - this is cleanup
      }
    }
  }

  async disconnect(): Promise<void> {
    try {
      logger.log('[StreamChat] Disconnecting client...');
      
      // Leave current channel first
      await this.leaveChannel();
      
      if (this.client) {
        await this.client.disconnectUser();
        this.client = null;
      }
      
      logger.log('[StreamChat] Disconnected successfully');
    } catch (error) {
      logger.error('[StreamChat] Error during disconnect:', error);
      // Don't throw - this is cleanup
    }
  }

  getCurrentChannel(): Channel | null {
    return this.currentChannel;
  }

  getClient(): StreamChat | null {
    return this.client;
  }

  getHostId(): string | null {
    return this.hostId;
  }

  getCurrentUserId(): string | null {
    return this.client?.userID || null;
  }

  // New method: Send gift event to all participants
  async sendGiftEvent(giftData: any): Promise<void> {
    if (!this.currentChannel) {
      throw new Error('No active channel for sending gift event');
    }

    try {
      logger.log('[StreamChat] Sending gift event to channel:', giftData);
      
      await this.currentChannel.sendEvent({
        type: 'gift' as any,
        ...giftData,
      });
      
      logger.log('[StreamChat] Gift event sent successfully!');
    } catch (error) {
      logger.error('[StreamChat] Failed to send gift event:', error);
      throw new Error('Failed to send gift event');
    }
  }

  private async getStreamCredentials(): Promise<{ token: string; api_key: string }> {
    try {
      // Reuse your existing GetStream token endpoint
      const result = await store.dispatch(streamsApi.endpoints.getStreamToken.initiate()).unwrap();
      
      return {
        token: result.token,
        api_key: result.api_key,
      };
    } catch (error) {
      logger.error('[StreamChat] Failed to get Stream credentials:', error);
      throw new Error('Failed to get Stream Chat credentials');
    }
  }
}

// Create separate instances for different users/contexts
const streamChatInstances = new Map<string, StreamChatService>();

export const getStreamChatServiceForUser = (userId: string): StreamChatService => {
  if (!streamChatInstances.has(userId)) {
    streamChatInstances.set(userId, new StreamChatService());
  }
  return streamChatInstances.get(userId)!;
};

// Export singleton instance for backward compatibility
export const streamChatService = new StreamChatService();
export default streamChatService;
