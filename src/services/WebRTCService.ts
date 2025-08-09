import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  MediaStream,
  MediaStreamTrack,
  mediaDevices,
} from 'react-native-webrtc';
import IPDetector from '../utils/ipDetector';

interface WebRTCServiceConfig {
  streamId: string;
  userId: string;
  isHost: boolean;
  onRemoteStream: (stream: MediaStream, userId: string) => void;
  onParticipantJoined: (userId: string) => void;
  onParticipantLeft: (userId: string) => void;
  onError: (error: string) => void;
}

export class WebRTCService {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private websocket: WebSocket | null = null;
  private config: WebRTCServiceConfig;
  private isInitialized = false;
  
  private rtcConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  constructor(config: WebRTCServiceConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      console.log('🔧 Initializing WebRTC service...');
      
      // Initialize local media stream
      await this.initializeLocalStream();
      
      // Don't connect to WebSocket immediately - do it only when needed
      // await this.connectToSignalingServer();
      
      this.isInitialized = true;
      console.log('✅ WebRTC service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize WebRTC:', error);
      this.config.onError('Failed to initialize video streaming');
      throw error;
    }
  }

  private async initializeLocalStream(): Promise<void> {
    try {
      const constraints = {
        audio: true,
        video: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          frameRate: { min: 15, ideal: 30, max: 60 },
          facingMode: 'user', // Front camera
        },
      };

      console.log('🎥 Requesting user media with constraints:', constraints);
      this.localStream = await mediaDevices.getUserMedia(constraints);
      console.log('✅ Local stream initialized successfully');
    } catch (error) {
      console.error('❌ Failed to get user media:', error);
      throw new Error('Camera/microphone access denied');
    }
  }

  private async connectToSignalingServer(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Always use IP detector for WebSocket URL
        let wsUrl = `ws://172.20.10.3:8000/ws/stream/${this.config.streamId}/signaling/`; // Default fallback
        
        try {
          const detectionResult = await IPDetector.detectIP();
          wsUrl = `ws://${detectionResult.ip}:8000/ws/stream/${this.config.streamId}/signaling/`;
          console.log('🔌 [WebRTC] Using detected WebSocket URL:', wsUrl);
        } catch (error) {
          console.error('❌ [WebRTC] IP detection failed, using fallback:', error);
        }
        
        console.log('🔌 Connecting to WebSocket:', wsUrl);
        this.websocket = new WebSocket(wsUrl);

        this.websocket.onopen = () => {
          console.log('✅ WebSocket connected');
          this.sendMessage({ type: 'join_call' });
          resolve();
        };

        this.websocket.onmessage = (event) => {
          try {
            this.handleSignalingMessage(JSON.parse(event.data));
          } catch (error) {
            console.error('❌ Failed to parse WebSocket message:', error);
          }
        };

        this.websocket.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          reject(error);
        };

        this.websocket.onclose = () => {
          console.log('🔌 WebSocket disconnected');
        };

        // Add timeout to prevent hanging
        setTimeout(() => {
          if (this.websocket?.readyState !== WebSocket.OPEN) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);
        
      } catch (error) {
        console.error('❌ Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  private async handleSignalingMessage(message: any): Promise<void> {
    const { type, from_user_id } = message;

    try {
      switch (type) {
        case 'offer':
          await this.handleOffer(message.offer, from_user_id);
          break;
        case 'answer':
          await this.handleAnswer(message.answer, from_user_id);
          break;
        case 'ice_candidate':
          await this.handleIceCandidate(message.candidate, from_user_id);
          break;
        case 'user_joined_call':
          await this.handleUserJoined(message.user_id, message.user_name);
          break;
        case 'user_left_call':
          this.handleUserLeft(message.user_id);
          break;
        default:
          console.log('❓ Unknown signaling message:', message);
      }
    } catch (error) {
      console.error('❌ Error handling signaling message:', error);
    }
  }

  private async handleOffer(offer: RTCSessionDescription, fromUserId: string): Promise<void> {
    try {
      const peerConnection = this.createPeerConnection(fromUserId);
      
      await peerConnection.setRemoteDescription(offer);
      
      // Add local stream to peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, this.localStream!);
        });
      }
      
      // Create and send answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      this.sendMessage({
        type: 'answer',
        answer: answer,
        target_user_id: fromUserId,
      });
    } catch (error) {
      console.error('❌ Failed to handle offer:', error);
      this.config.onError('Failed to handle video call offer');
    }
  }

  private async handleAnswer(answer: RTCSessionDescription, fromUserId: string): Promise<void> {
    try {
      const peerConnection = this.peerConnections.get(fromUserId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(answer);
      }
    } catch (error) {
      console.error('❌ Failed to handle answer:', error);
      this.config.onError('Failed to handle video call answer');
    }
  }

  private async handleIceCandidate(candidate: RTCIceCandidate, fromUserId: string): Promise<void> {
    try {
      const peerConnection = this.peerConnections.get(fromUserId);
      if (peerConnection) {
        await peerConnection.addIceCandidate(candidate);
      }
    } catch (error) {
      console.error('❌ Failed to handle ICE candidate:', error);
    }
  }

  private async handleUserJoined(userId: string, userName: string): Promise<void> {
    if (userId === this.config.userId) return;
    
    console.log(`👤 User ${userName} joined the call`);
    this.config.onParticipantJoined(userId);
    
    // If we're the host or first participant, initiate call
    if (this.config.isHost) {
      await this.initiateCall(userId);
    }
  }

  private handleUserLeft(userId: string): void {
    console.log(`👋 User ${userId} left the call`);
    
    // Clean up peer connection
    const peerConnection = this.peerConnections.get(userId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(userId);
    }
    
    this.config.onParticipantLeft(userId);
  }

  private async initiateCall(targetUserId: string): Promise<void> {
    try {
      const peerConnection = this.createPeerConnection(targetUserId);
      
      // Add local stream to peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, this.localStream!);
        });
      }
      
      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      this.sendMessage({
        type: 'offer',
        offer: offer,
        target_user_id: targetUserId,
      });
    } catch (error) {
      console.error('❌ Failed to initiate call:', error);
      this.config.onError('Failed to initiate video call');
    }
  }

  private createPeerConnection(userId: string): RTCPeerConnection {
    const peerConnection = new RTCPeerConnection(this.rtcConfiguration);
    
    // Store the peer connection
    this.peerConnections.set(userId, peerConnection);
    
    // Handle ICE candidates
    (peerConnection as any).onicecandidate = (event: any) => {
      if (event.candidate) {
        this.sendMessage({
          type: 'ice_candidate',
          candidate: event.candidate,
          target_user_id: userId,
        });
      }
    };
    
    // Handle remote stream
    (peerConnection as any).onaddstream = (event: any) => {
      if (event.stream) {
        console.log('📹 Received remote stream from:', userId);
        this.config.onRemoteStream(event.stream, userId);
      }
    };
    
    // Handle connection state changes
    (peerConnection as any).onconnectionstatechange = () => {
      console.log(`🔗 Connection state changed for ${userId}:`, (peerConnection as any).connectionState);
    };
    
    return peerConnection;
  }

  private sendMessage(message: any): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message:', message);
    }
  }

  toggleCamera(): void {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        console.log('📹 Camera toggled:', videoTrack.enabled);
        this.sendCameraToggle(videoTrack.enabled);
      }
    }
  }

  toggleMicrophone(): void {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        console.log('🎤 Microphone toggled:', audioTrack.enabled);
        this.sendMicrophoneToggle(audioTrack.enabled);
      }
    }
  }

  private sendCameraToggle(enabled: boolean): void {
    this.sendMessage({ type: 'camera_toggle', enabled });
  }

  private sendMicrophoneToggle(enabled: boolean): void {
    this.sendMessage({ type: 'microphone_toggle', enabled });
  }

  switchCamera(): void {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack && (videoTrack as any)._switchCamera) {
        try {
          (videoTrack as any)._switchCamera();
          console.log('🔄 Camera switched');
        } catch (error) {
          console.error('❌ Failed to switch camera:', error);
        }
      }
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  isLocalCameraEnabled(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      return videoTrack ? videoTrack.enabled : false;
    }
    return false;
  }

  isLocalMicrophoneEnabled(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      return audioTrack ? audioTrack.enabled : false;
    }
    return false;
  }

  cleanup(): void {
    console.log('🧹 Cleaning up WebRTC service...');
    
    // Close all peer connections
    this.peerConnections.forEach((peerConnection, userId) => {
      console.log(`🔌 Closing peer connection for ${userId}`);
      peerConnection.close();
    });
    this.peerConnections.clear();
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        console.log(`🛑 Stopping ${track.kind} track`);
        track.stop();
      });
      this.localStream = null;
    }
    
    // Close WebSocket
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    this.isInitialized = false;
    console.log('✅ WebRTC service cleanup completed');
  }

  // Static method to check if WebRTC is available
  static async checkPermissions(): Promise<{ camera: boolean; microphone: boolean }> {
    try {
      // On mobile, we can't check permissions without requesting them
      // This is a simplified check
      return { camera: true, microphone: true };
    } catch (error) {
      console.error('❌ Failed to check permissions:', error);
      return { camera: false, microphone: false };
    }
  }

  // Method to start signaling when ready
  async startSignaling(): Promise<void> {
    if (!this.websocket) {
      await this.connectToSignalingServer();
    }
  }
} 