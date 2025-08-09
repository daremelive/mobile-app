interface StreamWebSocketConfig {
  streamId: string;
  userId: string;
  onGuestInvited: (guest: any, invitedBy: any) => void;
  onGuestJoined: (participant: any) => void;
  onGuestDeclined: (guest: any) => void;
  onGuestRemoved: (guestId: string, removedBy: string) => void;
  onCameraToggled: (userId: string, enabled: boolean) => void;
  onMicrophoneToggled: (userId: string, enabled: boolean) => void;
  onStreamMessage: (message: any) => void;
  onStreamState: (state: any) => void;
  onError: (error: string) => void;
}

import IPDetector from '../utils/ipDetector';

export class StreamWebSocketService {
  private websocket: WebSocket | null = null;
  private config: StreamWebSocketConfig;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(config: StreamWebSocketConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    return new Promise(async (resolve, reject) => {
      // Always use IP detector for WebSocket URL
      let wsUrl = `ws://172.20.10.3:8000/ws/stream/${this.config.streamId}/`; // Default fallback
      
      try {
        const detectionResult = await IPDetector.detectIP();
        wsUrl = `ws://${detectionResult.ip}:8000/ws/stream/${this.config.streamId}/`;
        console.log('🔗 [StreamWS] Using detected WebSocket URL:', wsUrl);
      } catch (error) {
        console.error('❌ [StreamWS] IP detection failed, using fallback:', error);
      }
      
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('Stream WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        resolve();
      };

      this.websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.websocket.onerror = (error) => {
        console.error('Stream WebSocket error:', error);
        this.config.onError('Stream connection error');
        reject(error);
      };

      this.websocket.onclose = () => {
        console.log('Stream WebSocket disconnected');
        this.isConnected = false;
        this.attemptReconnect();
      };
    });
  }

  private handleMessage(message: any): void {
    const { type } = message;

    switch (type) {
      case 'guest_invited':
        this.config.onGuestInvited(message.guest, message.invited_by);
        break;
      case 'guest_joined':
        this.config.onGuestJoined(message.participant);
        break;
      case 'guest_declined':
        this.config.onGuestDeclined(message.guest);
        break;
      case 'guest_removed':
        this.config.onGuestRemoved(message.guest_id, message.removed_by);
        break;
      case 'camera_toggled':
        this.config.onCameraToggled(message.user_id, message.enabled);
        break;
      case 'microphone_toggled':
        this.config.onMicrophoneToggled(message.user_id, message.enabled);
        break;
      case 'stream_message':
        this.config.onStreamMessage(message.message);
        break;
      case 'stream_state':
        this.config.onStreamState(message);
        break;
      case 'error':
        this.config.onError(message.message);
        break;
      default:
        console.log('Unknown stream message:', message);
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.config.onError('Failed to reconnect to stream');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
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
    this.sendMessage({
      type: 'stream_message',
      message: message,
    });
  }

  private sendMessage(message: any): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.isConnected = false;
    this.reconnectAttempts = 0;
  }

  isConnectedToStream(): boolean {
    return this.isConnected;
  }
} 