import { StreamChat, Channel, ChannelState , User } from 'stream-chat';
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

      // Use the same GetStream credentials from your existing video setup
      const { token, api_key } = await this.getStreamCredentials();

      this.client = StreamChat.getInstance(api_key);

      return this.client;
    } catch (error) {
      logger.error('[StreamChat] Failed to initialize client:', error);
      throw new Error('Failed to initialize Stream Chat');
    }
  }

  async connectUser(user: StreamChatUser): Promise<void> {

    if (!this.client) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('Stream Chat client failed to initialize');
    }

    try {

      // Check if user is already connected
      if (this.client.userID === user.id) {
        return;
      }

      // Disconnect any existing user first
      if (this.client && this.client.userID) {
        await this.client.disconnectUser();
      }

      const { token, api_key } = await this.getStreamCredentials();

      const streamUser: User = {
        id: user.id,
        name: user.name,
        image: user.image,
      };


      if (!this.client) {
        throw new Error('StreamChat client is not initialized');
      }

      await this.client.connectUser(streamUser, token);
    } catch (error) {
      logger.error('[StreamChat] Failed to connect user:', error);
      throw new Error('Failed to connect to Stream Chat');
    }
  }

  async createOrJoinStreamChannel(streamId: string, streamTitle: string, hostUser: StreamChatUser, actualHostId?: string): Promise<Channel> {
    if (!this.client) {
      throw new Error('Stream Chat client not initialized');
    }

    try {

      // Create a channel specifically for this live stream
      const channelId = `stream-${streamId}`;

      const channel = this.client.channel('livestream', channelId, {
        // Remove created_by_id to avoid server-side auth requirement
        ...(this.client.userID && { members: [this.client.userID] }), // Add current user as member if userID exists
      });


      // Watch the channel (this joins it)
      await channel.watch();

      // Set host ID consistently - use actualHostId parameter primarily
      this.hostId = actualHostId || hostUser.id;

      // Ensure the current user is added as a member
      try {
        await channel.addMembers([hostUser.id]);
      } catch (memberError) {
      }

      // Verify channel state after setup
      const channelState = await channel.query();

      this.currentChannel = channel;

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

      const messageData: any = {
        text: text.trim(),
      };

      // Add custom data if provided (for gift messages)
      if (customData) {
        Object.assign(messageData, customData);
      }

      await this.currentChannel.sendMessage(messageData);

    } catch (error) {
      logger.error('[StreamChat] Failed to send message:', error);
      throw new Error('Failed to send message');
    }
  }

  subscribeToMessages(channelId: string, callback: (message: StreamChatMessage) => void): () => void {
    if (!this.currentChannel) {
      return () => {};
    }


    const messageListener = (event: any) => {

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


        // Always deliver the message to the callback
        callback(message);

      } else {
      }
    };

    // Gift event listener - this is where the magic happens!
    const giftEventListener = (event: any) => {

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


          // Send to message callback so gift detection can pick it up
          callback(syntheticGiftMessage);

        } catch (error) {
          logger.error('[StreamChat Gift Event] Error processing gift event:', error);
        }
      }
    };

    const watchingListener = (event: any) => {
    };

    const memberListener = (event: any) => {
    };

    const typingListener = (event: any) => {
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


    this.messageListeners.set(channelId, callback);

    // Return unsubscribe function
    return () => {
      if (this.currentChannel) {
        this.currentChannel.off('message.new', messageListener);
        this.currentChannel.off('user.watching.start', watchingListener);
        this.currentChannel.off('member.added', memberListener);
        this.currentChannel.off('typing.start', typingListener);
        this.currentChannel.off(allEventsListener);
      }
      this.messageListeners.delete(channelId);
    };
  }

  async getRecentMessages(limit: number = 50): Promise<StreamChatMessage[]> {
    if (!this.currentChannel) {
      return [];
    }

    try {

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

      return messages;
    } catch (error) {
      logger.error('[StreamChat] Failed to fetch recent messages:', error);
      return [];
    }
  }

  async leaveChannel(): Promise<void> {
    if (this.currentChannel) {
      try {

        // Clear all message listeners
        this.messageListeners.clear();

        // Stop watching the channel
        await this.currentChannel.stopWatching();
        this.currentChannel = null;

      } catch (error) {
        logger.error('[StreamChat] Error leaving channel:', error);
        // Don't throw - this is cleanup
      }
    }
  }

  async disconnect(): Promise<void> {
    try {

      // Leave current channel first
      await this.leaveChannel();

      if (this.client) {
        await this.client.disconnectUser();
        this.client = null;
      }

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

      await this.currentChannel.sendEvent({
        type: 'gift' as any,
        ...giftData,
      });

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
