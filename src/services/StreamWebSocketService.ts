interface StreamWebSocketConfig {
  streamId: string;
  userId: string;
  token: string;
  onGuestInvited: (guest: any, invitedBy: any) => void;
  onGuestJoined: (participant: any) => void;
  onGuestDeclined: (guest: any) => void;
  onGuestRemoved: (guestId: string, removedBy: string) => void;
  onUserRemoved?: (message: string, removedBy: string) => void;
  onParticipantRemoved?: (userId: string, message: string) => void;
  onCameraToggled: (userId: string, enabled: boolean) => void;
  onMicrophoneToggled: (userId: string, enabled: boolean) => void;
  onStreamMessage: (message: any) => void;
  onStreamState: (state: any) => void;
  onError: (error: string) => void;
}

// Simple interface for gift/message notifications
interface SimpleWebSocketConfig {
  streamId: string;
  userId: string;
  token: string;
  onMessage: (message: any) => void;
  onError: (error: string) => void;
}

import IPDetector from '../utils/ipDetector';

export class StreamWebSocketService {
  private websocket: WebSocket | null = null;
  private config: StreamWebSocketConfig | SimpleWebSocketConfig;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private messageQueue: any[] = []; // Queue messages when disconnected
  private isReconnecting = false; // Prevent multiple reconnection attempts
  private connectionFailed = false; // Track permanent connection failures (like auth errors)
  
  // Industry standard: Message batching to prevent screen flicker
  private messageBatch: any[] = [];
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly BATCH_DELAY = 16; // 60fps = 16ms intervals (industry standard)
  private readonly MAX_BATCH_SIZE = 5; // Prevent overwhelming the UI
  
  // Chat message throttling
  private lastMessageTime = 0;
  private readonly messageThrottleDelay = 100; // 100ms throttle for chat messages

  constructor(config: StreamWebSocketConfig | SimpleWebSocketConfig) {
    this.config = config;
  }

  // Support both interfaces - new simple interface and legacy full interface
  async connect(configOrVoid?: SimpleWebSocketConfig): Promise<void> {
    if (configOrVoid) {
      // Called with simple config (new style)
      this.config = configOrVoid;
    }
    // Otherwise use config from constructor
    
    if (this.isConnected || this.connectionFailed) return;

    return new Promise(async (resolve, reject) => {
      // Always use IP detector for WebSocket URL with production domain support
      let wsUrl = `wss://daremelive.pythonanywhere.com/ws/stream/${this.config.streamId}/`; // Production fallback
      
      try {
        const detectionResult = await IPDetector.detectIP();
        // Check if it's production domain or local IP
        if (detectionResult.ip === 'daremelive.pythonanywhere.com') {
          wsUrl = `wss://${detectionResult.ip}/ws/stream/${this.config.streamId}/`;
        } else {
          wsUrl = `ws://${detectionResult.ip}:8000/ws/stream/${this.config.streamId}/`;
        }
        // Silent operation - no logging
      } catch (error) {
        // Silent fallback - no logging
      }

      // Add JWT token as query parameter for authentication
      if (this.config.token) {
        const separator = wsUrl.includes('?') ? '&' : '?';
        wsUrl = `${wsUrl}${separator}token=${encodeURIComponent(this.config.token)}`;
      }

      this.websocket = new WebSocket(wsUrl);

      // Set a connection timeout to avoid hanging during streaming
      const connectionTimeout = setTimeout(() => {
        if (this.websocket && this.websocket.readyState === WebSocket.CONNECTING) {
          this.websocket.close();
          reject(new Error('WebSocket connection timeout'));
        }
      }, 8000); // Increased to 8 second timeout

      this.websocket.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('🔗 [WebSocket] Connected to stream:', this.config.streamId);
        this.isConnected = true;
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        this.connectionFailed = false; // Reset connection failed flag
        
        // Send any queued messages
        this.flushMessageQueue();
        
        resolve();
      };

      this.websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 [WebSocket] Message received:', message);
          
          // Industry standard: Batch messages to prevent screen flicker
          this.addToBatch(message);
          
        } catch (error) {
          console.error('❌ [WebSocket] Error parsing message:', error);
        }
      };

      this.websocket.onerror = (error) => {
        clearTimeout(connectionTimeout);
        // Silent error handling - no logging
        reject(error);
      };

      this.websocket.onclose = (event) => {
        clearTimeout(connectionTimeout);
        // Silent disconnection - no logging
        this.isConnected = false;
        
        // Check for authentication errors (403 Forbidden)
        if (event.code === 403 || event.code === 4003) {
          console.log('[WebSocket] Authentication failed, marking as permanent failure');
          this.connectionFailed = true;
          this.config.onError('Authentication failed: Invalid or expired token');
          return; // Don't attempt reconnection
        }
        
        // Only attempt reconnect if not already trying, within limits, and not intentionally closed
        if (!this.isReconnecting && 
            !this.connectionFailed &&
            this.reconnectAttempts < this.maxReconnectAttempts && 
            event.code !== 1000) {
          this.attemptReconnect();
        }
      };
    });
  }  // Industry standard: Batch message processing to prevent screen flicker
  private addToBatch(message: any): void {
    this.messageBatch.push(message);
    
    // If batch is full, process immediately
    if (this.messageBatch.length >= this.MAX_BATCH_SIZE) {
      this.processBatch();
      return;
    }
    
    // Otherwise, debounce the batch processing
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    
    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, this.BATCH_DELAY);
  }

  private processBatch(): void {
    if (this.messageBatch.length === 0) return;
    
    // Clear timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    
    // Process all messages in a single RAF to minimize re-renders
    requestAnimationFrame(() => {
      const batch = [...this.messageBatch];
      this.messageBatch = []; // Clear batch
      
      // Group messages by type for efficient processing
      const groupedMessages = this.groupMessagesByType(batch);
      
      // Process grouped messages to minimize UI updates
      this.handleGroupedMessages(groupedMessages);
    });
  }

  private groupMessagesByType(messages: any[]): Record<string, any[]> {
    return messages.reduce((groups, message) => {
      const type = message.type || 'unknown';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(message);
      return groups;
    }, {} as Record<string, any[]>);
  }

  private handleGroupedMessages(groupedMessages: Record<string, any[]>): void {
    // Process messages in order of priority (critical first)
    const processingOrder = [
      'stream_state',       // Most critical for streaming
      'user_removed',       // Critical - forces disconnect
      'participant_removed', // Update participants list
      'stream_message',     // Batch chat messages
      'guest_joined',
      'guest_invited', 
      'guest_declined',
      'guest_removed',
      'camera_toggled',
      'microphone_toggled',
      'error'
    ];

    processingOrder.forEach(type => {
      if (groupedMessages[type]) {
        this.handleMessageType(type, groupedMessages[type]);
      }
    });
  }

  private handleMessageType(type: string, messages: any[]): void {
    // Check if we're using the simple config for gift notifications
    const isSimpleConfig = 'onMessage' in this.config && !('onGuestInvited' in this.config);
    
    if (isSimpleConfig) {
      // For simple config, pass all messages through onMessage
      messages.forEach(message => {
        (this.config as SimpleWebSocketConfig).onMessage(message);
      });
      return;
    }
    
    // Full config handling
    const fullConfig = this.config as StreamWebSocketConfig;
    
    switch (type) {
      case 'guest_invited':
        // Process only the latest invitation
        const latestInvite = messages[messages.length - 1];
        fullConfig.onGuestInvited(latestInvite.guest, latestInvite.invited_by);
        break;
        
      case 'guest_joined':
        // Process only the latest join
        const latestJoin = messages[messages.length - 1];
        fullConfig.onGuestJoined(latestJoin.participant);
        break;
        
      case 'guest_declined':
        const latestDecline = messages[messages.length - 1];
        fullConfig.onGuestDeclined(latestDecline.guest);
        break;
        
      case 'guest_removed':
        const latestRemoval = messages[messages.length - 1];
        fullConfig.onGuestRemoved(latestRemoval.guest_id, latestRemoval.removed_by);
        break;
        
      case 'camera_toggled':
        // Process only the latest camera state
        const latestCamera = messages[messages.length - 1];
        fullConfig.onCameraToggled(latestCamera.user_id, latestCamera.enabled);
        break;
        
      case 'microphone_toggled':
        // Process only the latest microphone state
        const latestMic = messages[messages.length - 1];
        fullConfig.onMicrophoneToggled(latestMic.user_id, latestMic.enabled);
        break;
        
      case 'stream_message':
        // Batch process chat messages efficiently
        this.handleBatchedChatMessages(messages);
        break;
        
      case 'stream_state':
        // Process only the latest state
        const latestState = messages[messages.length - 1];
        fullConfig.onStreamState(latestState);
        break;
        
      case 'user_removed':
        // Handle forced removal - highest priority
        const latestUserRemoval = messages[messages.length - 1];
        fullConfig.onUserRemoved?.(latestUserRemoval.message, latestUserRemoval.removed_by);
        break;
        
      case 'participant_removed':
        // Handle participant removal notification
        const latestParticipantRemoval = messages[messages.length - 1];
        fullConfig.onParticipantRemoved?.(latestParticipantRemoval.user_id, latestParticipantRemoval.message);
        break;
        
      case 'error':
        // Process only critical errors
        const criticalErrors = messages.filter(msg => msg.severity === 'critical');
        if (criticalErrors.length > 0) {
          fullConfig.onError(criticalErrors[criticalErrors.length - 1].message);
        }
        break;
    }
  }

  private handleBatchedChatMessages(messages: any[]): void {
    // Check if we're using the simple config
    const isSimpleConfig = 'onMessage' in this.config && !('onGuestInvited' in this.config);
    
    if (isSimpleConfig) {
      // For simple config, pass all messages through onMessage
      messages.forEach(msg => {
        (this.config as SimpleWebSocketConfig).onMessage(msg.message || msg);
      });
      return;
    }
    
    // Full config handling
    const fullConfig = this.config as StreamWebSocketConfig;
    
    // Industry standard: Throttle chat updates to prevent spam
    const now = Date.now();
    
    if (now - this.lastMessageTime >= this.messageThrottleDelay) {
      // Send all batched messages at once
      messages.forEach(msg => {
        fullConfig.onStreamMessage(msg.message);
      });
      this.lastMessageTime = now;
    } else {
      // Queue for later processing
      setTimeout(() => {
        messages.forEach(msg => {
          fullConfig.onStreamMessage(msg.message);
        });
      }, this.messageThrottleDelay);
    }
  }

  private attemptReconnect(): void {
    if (this.isReconnecting || this.connectionFailed || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;
    
    // Use exponential backoff but cap at 10 seconds to avoid long disruptions
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);

    // Silent reconnection - no logging
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch((error) => {
        this.isReconnecting = false;
        
        // Check if this is an auth error and stop retrying
        if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
          this.connectionFailed = true;
          this.config.onError('Authentication failed: Unable to reconnect');
          return;
        }
        
        // Try again if under limit and not a permanent failure
        if (this.reconnectAttempts < this.maxReconnectAttempts && !this.connectionFailed) {
          setTimeout(() => this.attemptReconnect(), 2000);
        } else {
          this.config.onError('WebSocket connection failed after maximum attempts');
        }
      });
    }, delay);
  }

  // Guest invitation methods
  inviteGuest(username: string): void {
    this.sendMessage({
      type: 'invite_guest',
      guest_username: username,
    });
  }

  acceptInvite(): void {
    this.sendMessage({
      type: 'accept_invite',
    });
  }

  declineInvite(): void {
    this.sendMessage({
      type: 'decline_invite',
    });
  }

  removeGuest(guestId: string): void {
    this.sendMessage({
      type: 'remove_guest',
      guest_id: guestId,
    });
  }

  // Camera and microphone controls
  toggleCamera(enabled: boolean): void {
    this.sendMessage({
      type: 'toggle_camera',
      enabled: enabled,
    });
  }

  toggleMicrophone(enabled: boolean): void {
    this.sendMessage({
      type: 'toggle_microphone',
      enabled: enabled,
    });
  }

  // Chat messaging
  sendChatMessage(message: string): void {
    console.log('📤 [WebSocket] Attempting to send chat message:', message);
    this.sendMessage({
      type: 'stream_message',
      message: message,
    });
  }

  // Gift notifications for cross-platform sync
  sendGiftNotification(message: string, gift: any): void {
    console.log('🎁 [WebSocket] Attempting to send gift notification:', { message, gift });
    this.sendMessage({
      type: 'gift_notification',
      message: message,
      gift: gift,
    });
  }

  private sendMessage(message: any): void {
    console.log('📤 [WebSocket] Private sendMessage called with:', message);
    console.log('📤 [WebSocket] WebSocket state:', this.websocket?.readyState);
    
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      console.log('✅ [WebSocket] Sending message via WebSocket');
      this.websocket.send(JSON.stringify(message));
    } else {
      console.log('⏳ [WebSocket] Queueing message - connection not open');
      // Queue message instead of warning to avoid console spam during streaming
      this.messageQueue.push(message);
      
      // Limit queue size to prevent memory issues
      if (this.messageQueue.length > 10) {
        this.messageQueue.shift(); // Remove oldest message
      }
    }
  }

  // Flush queued messages when reconnected
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.websocket?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      this.websocket.send(JSON.stringify(message));
    }
  }

  disconnect(): void {
    // Clear all timers and queues
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.isConnected = false;
    this.isReconnecting = false;
    this.connectionFailed = false; // Reset for potential future connections
    this.reconnectAttempts = 0;
    this.messageQueue = []; // Clear message queue
    this.messageBatch = []; // Clear message batch
  }

  isConnectedToStream(): boolean {
    return this.isConnected;
  }

  // Graceful disconnect for streaming scenarios
  gracefulDisconnect(): void {
    this.isReconnecting = false; // Stop any reconnection attempts
    this.connectionFailed = false; // Reset connection failed flag
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      // Send a graceful close frame
      this.websocket.close(1000, 'Stream ended');
    } else if (this.websocket) {
      this.websocket.close();
    }

    this.websocket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.messageQueue = [];
    this.messageBatch = [];
  }
} 

// Create a singleton instance for gift notifications
const streamWebSocketService = new StreamWebSocketService({
  streamId: '',
  userId: '',
  token: '',
  onMessage: () => {},
  onError: () => {},
});

export default streamWebSocketService;