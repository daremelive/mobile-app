/**
 * Messaging API types
 * Direct messaging, conversations, and chat functionality
 */

// === User for Messaging ===
export interface MessageUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  profile_picture?: string;
  profile_picture_url?: string;
  followers_count?: string;
  is_following?: boolean;
  is_live?: boolean;
  is_online?: boolean;
}

// === Message ===
export interface Message {
  id: number;
  content: string;
  created_at: string;
  sender: MessageUser;
  recipient: MessageUser;
  is_delivered: boolean;
  delivered_at?: string;
  is_read: boolean;
  read_at?: string;
  is_outgoing?: boolean;
}

// === Conversation ===
export interface Conversation {
  id: number;
  participant_1: MessageUser;
  participant_2: MessageUser;
  last_message?: string;
  last_message_time?: string;
  last_message_sender?: MessageUser;
  last_message_status?: 'pending' | 'delivered' | 'read';
  unread_count: number;
  created_at: string;
  updated_at: string;
}

// === Conversation Detail ===
export interface ConversationDetail {
  id: number;
  participant_1: MessageUser;
  participant_2: MessageUser;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

// === Request Types ===
export interface SendMessageRequest {
  recipient_id: number;
  content: string;
}

export interface GetConversationsRequest {
  page?: number;
  page_size?: number;
  search?: string;
}

export interface GetConversationDetailRequest {
  conversationId: number;
  page?: number;
  page_size?: number;
}

export interface SearchMessagesRequest {
  query: string;
}

export interface SearchUsersRequest {
  query: string;
}

export interface GetUsersRequest {
  page?: number;
  page_size?: number;
}

export interface GetUserStatusRequest {
  userId: number;
}

export interface MarkMessagesAsReadRequest {
  conversationId: number;
}

export interface CreateConversationRequest {
  userId: number;
}

// === Response Types ===
export interface ConversationsResponse {
  results: Conversation[];
  next: string | null;
  previous: string | null;
  count?: number;
}

export interface SearchMessagesResponse {
  conversations: Conversation[];
  messages: Message[];
  query: string;
}

export interface SearchUsersResponse {
  results: MessageUser[];
}

export interface GetUsersResponse {
  results: MessageUser[];
  next: string | null;
  previous: string | null;
  count?: number;
}

export interface UserStatusResponse {
  is_online: boolean;
  last_seen?: string;
}

export interface MarkAsReadResponse {
  message: string;
}

export interface DeleteConversationResponse {
  message: string;
}

// === Query Parameters ===
export interface ConversationQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
}

export interface MessageQueryParams {
  page?: number;
  page_size?: number;
}