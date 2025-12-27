/**
 * Stream entity types
 * Core stream data structures and enums
 */

import { StreamVideoClient } from '@stream-io/video-react-native-sdk';

// Stream core enums
export type StreamMode = 'single' | 'multi';
export type StreamChannel = 'video' | 'game' | 'truth-or-dare' | 'banter';
export type StreamStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';
export type ParticipantType = 'host' | 'guest' | 'viewer';
export type VipLevel = 'basic' | 'premium' | 'vip' | 'vvip';
export type RecordingStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type UserRole = 'viewer' | 'host' | 'participant';

// Stream host
export interface StreamHost {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  vip_level: VipLevel;
  profile_picture_url?: string | null;
}

// Stream participant
export interface StreamParticipant {
  id: number;
  user: StreamHost;
  participant_type: ParticipantType;
  joined_at: string;
  left_at: string | null;
  is_active: boolean;
  seat_number: number | null;
}

// Stream message
export interface StreamMessage {
  id: number;
  user: StreamHost;
  message: string;
  message_type: string;
  created_at: string;
  gift: any | null;
  gift_quantity: number;
  gift_receiver: StreamHost | null;
}

// Main stream entity
export interface Stream {
  id: string;
  host: StreamHost;
  title: string;
  mode: StreamMode;
  channel: StreamChannel;
  max_seats: number;
  status: StreamStatus;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  viewer_count: number;
  total_viewers: number;
  likes_count: number;
  gifts_received: number;
  created_at: string;
  updated_at: string;
  duration: number | null;
  is_live: boolean;
  // Recording fields
  is_recorded: boolean;
  recording_url: string | null;
  recording_status: RecordingStatus;
  recording_file_size: number | null;
  has_recording: boolean;
  is_recording_available: boolean;
  participants: StreamParticipant[];
  messages: StreamMessage[];
}

// Stream client and call types  
export type StreamClientState = StreamVideoClient | null;
export type StreamCallState = any | null; // StreamCall from SDK

export interface StreamClient {
  client: StreamVideoClient | null;
  call: any;
  isConnected: boolean;
}

// Realtime message types (to replace any[] usage in useState)
export interface RealtimeMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  created_at: string; // Align with ChatMessage timestamp format
  type?: 'message' | 'system' | 'notification';
}

export type RealtimeMessages = RealtimeMessage[];

// Stream action types for API calls
export interface StreamAction {
  action: 'start' | 'end' | 'pause' | 'resume' | 'kick' | 'promote';
  participantId?: string;
  reason?: string;
}

export interface StreamActionRequest {
  streamId: string;
  action: StreamAction;
}

// Stream join data types
export interface StreamJoinData {
  participant_type: ParticipantType;
  channel?: string;
}

export interface StreamJoinRequest {
  streamId: string;
  data: StreamJoinData;
}

// Multi-participant navigation params
export interface MultiParticipantParams {
  id: string;
  isHost?: string;
  mode?: string;
}

// Guest/Participant detailed interface  
export interface Guest {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  profile_picture_url?: string;
  is_online?: boolean;
}

// Add export for Gift that was moved to messages
export { Gift, GiftAnimation } from './messages';

export interface Participant {
  id: string;
  user: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
  };
  participant_type: ParticipantType;
  seat_number?: number;
  camera_enabled: boolean;
  microphone_enabled: boolean;
}