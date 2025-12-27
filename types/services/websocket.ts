/**
 * WebSocket Service Types
 * Real-time communication and streaming interfaces
 */

// Participant details shared across guest promotion events
export interface ParticipantSummary {
  id: string | number;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  user_id?: string | number;
  seat_number?: number | null;
  participant_type: 'host' | 'guest' | 'viewer';
  camera_enabled?: boolean;
  microphone_enabled?: boolean;
  profile_picture_url?: string | null;
}

export interface InviterContext {
  id: string;
  username: string;
  display_name?: string | null;
}

export interface GuestInvitationMetadata {
  stream_id: string;
  expires_at: string;
  countdown_seconds: number;
  invited_by: InviterContext;
  issued_at?: string;
  seat_number?: number | null;
}

export interface GuestInvitePayload {
  guest: ParticipantSummary;
  invitation: GuestInvitationMetadata;
}

// Data sent when user is promoted to guest
export interface UserPromotedData {
  user_id: number;
  username: string;
  first_name?: string;
  seat_number?: number;
  promoted_by: string;
  stream_id: string;
}

// === WebSocket Configuration ===
export interface StreamWebSocketConfig {
  streamId: string;
  userId: string;
  token: string;
  onGuestInvited: (payload: GuestInvitePayload) => void;
  onGuestJoined: (participant: ParticipantSummary) => void;
  onGuestDeclined: (guest: ParticipantSummary) => void;
  onGuestRemoved: (guestId: string, removedBy: string) => void;
  onUserRemoved?: (message: string, removedBy: string) => void;
  onParticipantRemoved?: (userId: string, message: string) => void;
  onUserPromoted?: (data: UserPromotedData) => void;
  onCameraToggled: (userId: string, enabled: boolean) => void;
  onMicrophoneToggled: (userId: string, enabled: boolean) => void;
  onStreamMessage: (message: any) => void;
  onStreamState: (state: any) => void;
  onError: (error: string) => void;
}

// Simple interface for gift/message notifications
export interface SimpleWebSocketConfig {
  streamId: string;
  userId: string;
  token: string;
  onMessage: (message: any) => void;
  onError: (error: string) => void;
}

// === WebSocket Message Types ===
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface GuestInviteMessage extends WebSocketMessage {
  type: 'guest_invited';
  guest: ParticipantSummary;
  invitation: GuestInvitationMetadata;
}

export interface GuestJoinMessage extends WebSocketMessage {
  type: 'guest_joined';
  participant: ParticipantSummary;
}

export interface GuestDeclineMessage extends WebSocketMessage {
  type: 'guest_declined';
  guest: ParticipantSummary;
}

export interface GuestRemoveMessage extends WebSocketMessage {
  type: 'guest_removed';
  guest_id: string;
  removed_by: string;
}

export interface CameraToggleMessage extends WebSocketMessage {
  type: 'camera_toggled';
  user_id: string;
  enabled: boolean;
}

export interface MicrophoneToggleMessage extends WebSocketMessage {
  type: 'microphone_toggled';
  user_id: string;
  enabled: boolean;
}

export interface StreamChatMessage extends WebSocketMessage {
  type: 'stream_message';
  message: any;
}

export interface StreamStateMessage extends WebSocketMessage {
  type: 'stream_state';
  state: any;
}

export interface UserRemovedMessage extends WebSocketMessage {
  type: 'user_removed';
  message: string;
  removed_by: string;
}

export interface ParticipantRemovedMessage extends WebSocketMessage {
  type: 'participant_removed';
  user_id: string;
  message: string;
}

export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  message: string;
  severity?: 'critical' | 'warning' | 'info';
}

export interface GiftNotificationMessage extends WebSocketMessage {
  type: 'gift_notification';
  message: string;
  gift: any;
}

// === WebSocket Service State ===
export interface WebSocketServiceState {
  isConnected: boolean;
  reconnectAttempts: number;
  isReconnecting: boolean;
  connectionFailed: boolean;
}

// === Message Batching ===
export interface MessageBatch {
  messages: WebSocketMessage[];
  timestamp: number;
}

export interface GroupedMessages {
  [messageType: string]: WebSocketMessage[];
}