import * as SecureStore from 'expo-secure-store';
import { API_CONFIG } from '../config/messaging';

const getApiBaseUrl = async (): Promise<string> => {
  return await API_CONFIG.getApiBaseUrl();
};

interface User {
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

interface Message {
  id: number;
  content: string;
  created_at: string;
  sender: User;
  recipient: User;
  is_delivered: boolean;
  delivered_at?: string;
  is_read: boolean;
  read_at?: string;
  is_outgoing?: boolean;
}

interface Conversation {
  id: number;
  participant_1: User;
  participant_2: User;
  last_message?: string;
  last_message_time?: string;
  last_message_sender?: User;
  last_message_status?: 'pending' | 'delivered' | 'read';
  unread_count: number;
  created_at: string;
  updated_at: string;
}

interface ConversationDetail {
  id: number;
  participant_1: User;
  participant_2: User;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

interface SendMessageRequest {
  recipient_id: number;
  content: string;
}

class MessagesApi {
  private async getAuthToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('accessToken');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getAuthToken();
    const apiBaseUrl = await getApiBaseUrl();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Get list of conversations
  async getConversations(page: number = 1): Promise<{results: Conversation[], next: string | null, previous: string | null}> {
    return this.makeRequest(`/messaging/conversations/?page=${page}`);
  }

  // Get conversation details with messages
  async getConversationDetails(conversationId: number, page: number = 1): Promise<ConversationDetail> {
    return this.makeRequest(`/messaging/conversations/${conversationId}/?page=${page}`);
  }

  // Send a message
  async sendMessage(data: SendMessageRequest): Promise<Message> {
    return this.makeRequest('/messaging/send/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId: number): Promise<void> {
    await this.makeRequest(`/messaging/conversations/${conversationId}/mark-read/`, {
      method: 'POST',
    });
  }

  // Search conversations and messages
  async searchMessages(query: string): Promise<{conversations: Conversation[], messages: Message[], query: string}> {
    return this.makeRequest(`/messaging/search/?q=${encodeURIComponent(query)}`);
  }

  // Search conversations
  async searchConversations(query: string): Promise<Conversation[]> {
    const response = await this.makeRequest(`/messaging/conversations/?search=${encodeURIComponent(query)}`);
    return response.results;
  }

  // Get or create conversation with a user
  async getOrCreateConversation(userId: number): Promise<Conversation> {
    // First, check if a conversation already exists by getting all conversations
    // and finding one that includes this user
    const conversations = await this.getConversations();
    const existingConversation = conversations.results.find(conv => 
      conv.participant_1.id === userId || conv.participant_2.id === userId
    );
    
    if (existingConversation) {
      return existingConversation;
    }
    
    // If no conversation exists, create a temporary conversation object
    // The actual conversation will be created when the first message is sent
    // This allows the UI to navigate to a message screen before any messages exist
    const currentUserData = await SecureStore.getItemAsync('user');
    const currentUser = currentUserData ? JSON.parse(currentUserData) : null;
    
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Get the target user data (we might need to fetch this)
    const users = await this.getUsers();
    const targetUser = users.results.find(user => user.id === userId);
    
    if (!targetUser) {
      throw new Error('Target user not found');
    }
    
    // Return a temporary conversation object that matches the expected interface
    // The conversation ID will be set to 0 to indicate it's a new conversation
    const tempConversation: Conversation = {
      id: 0, // Special ID to indicate new conversation
      participant_1: currentUser,
      participant_2: targetUser,
      last_message: undefined,
      last_message_time: undefined,
      last_message_sender: undefined,
      unread_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    return tempConversation;
  }

  // Search users (this would typically be a separate users API)
  async searchUsers(query: string): Promise<User[]> {
    const response = await this.makeRequest(`/users/discover/?search=${encodeURIComponent(query)}`);
    return response.results;
  }

  // Get all users (for discovering people to message)
  async getUsers(page: number = 1): Promise<{results: User[], next: string | null, previous: string | null}> {
    return this.makeRequest(`/users/discover/?page=${page}`);
  }

  // Delete conversation
  async deleteConversation(conversationId: number): Promise<void> {
    await this.makeRequest(`/messaging/conversations/${conversationId}/`, {
      method: 'DELETE',
    });
  }

  // Get user status
  async getUserStatus(userId: number): Promise<{is_online: boolean, last_seen?: string}> {
    return this.makeRequest(`/messaging/user-status/${userId}/`);
  }
}

export const messagesApi = new MessagesApi();
export type { User, Message, Conversation, ConversationDetail, SendMessageRequest };
