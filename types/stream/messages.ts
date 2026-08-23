/**
 * Stream messaging types
 * Chat messages, gifts, and real-time messaging
 */

import { StreamHost } from './index';

// Base message interface
export interface ChatMessage {
  id: number;
  user: StreamHost;
  message: string;
  message_type: string;
  created_at: string;
  gift?: Gift | null;
  gift_quantity?: number;
  gift_receiver?: StreamHost | null;
}

// Gift interface
export interface Gift {
  id: number;
  name: string;
  icon_url: string;
  cost: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Send message request
export interface SendMessageRequest {
  message: string;
}

// Send gift request
export interface SendGiftRequest {
  gift_id: number;
  recipient_user_id?: number; // Optional for multi-user streams
  request_id?: string;
}

// Gift animation data
export interface GiftAnimation {
  id: string;
  gift: Gift;
  sender: StreamHost;
  receiver?: StreamHost;
  timestamp: number;
  is_playing: boolean;
}

// Chat overlay props
export interface ChatOverlayProps {
  messages: ChatMessage[];
  isVisible: boolean;
  maxMessages?: number;
}
