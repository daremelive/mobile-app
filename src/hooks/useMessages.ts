import { useState, useEffect, useCallback } from 'react';
import { messagesApi, Conversation, ConversationDetail, Message } from '../services/messagesApi';

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      setError(null);
      const response = await messagesApi.getConversations();
      setConversations(response.results);
      setSearchResults(null); // Clear search results when fetching all conversations
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshConversations = useCallback(async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  }, [fetchConversations]);

  const searchConversations = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      await fetchConversations();
      return;
    }
    
    try {
      setIsSearching(true);
      setError(null);
      const results = await messagesApi.searchMessages(query);
      setSearchResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search conversations');
    } finally {
      setIsSearching(false);
    }
  }, [fetchConversations]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    loading,
    error,
    refreshing,
    searchResults,
    isSearching,
    refreshConversations,
    searchConversations,
  };
};

export const useConversationDetail = (conversationId: number) => {
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const fetchConversationDetail = useCallback(async () => {
    try {
      setError(null);
      const response = await messagesApi.getConversationDetails(conversationId);
      setConversation(response);
      setMessages(response.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch conversation');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const sendMessage = useCallback(async (content: string, recipientId: number) => {
    if (!content.trim()) return;

    setSending(true);
    try {
      const newMessage = await messagesApi.sendMessage({
        recipient_id: recipientId,
        content: content.trim(),
      });
      
      // Add the new message to the local state
      setMessages(prev => [...prev, newMessage]);
      
      // Optionally refresh the conversation to get updated metadata
      await fetchConversationDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  }, [fetchConversationDetail]);

  const markAsRead = useCallback(async () => {
    try {
      await messagesApi.markMessagesAsRead(conversationId);
      // Update local state to mark messages as read
      setMessages(prev => prev.map(msg => ({ ...msg, is_read: true })));
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchConversationDetail();
  }, [fetchConversationDetail]);

  useEffect(() => {
    // Mark messages as read when conversation is opened
    if (conversation && messages.length > 0) {
      markAsRead();
    }
  }, [conversation, messages.length, markAsRead]);

  return {
    conversation,
    messages,
    loading,
    error,
    sending,
    sendMessage,
    refreshConversation: fetchConversationDetail,
  };
};

export const useUserStatus = (userId: number) => {
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserStatus = async () => {
      try {
        const status = await messagesApi.getUserStatus(userId);
        setIsOnline(status.is_online);
        setLastSeen(status.last_seen || null);
      } catch (err) {
        console.error('Failed to fetch user status:', err);
      }
    };

    fetchUserStatus();
    
    // Poll for status updates every 30 seconds - DISABLED to prevent screen blinking
    // const interval = setInterval(fetchUserStatus, 30000);
    
    // return () => clearInterval(interval);
  }, [userId]);

  return { isOnline, lastSeen };
};

export const useUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setError(null);
      const response = await messagesApi.getUsers();
      setUsers(response.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      await fetchUsers();
      return;
    }
    
    try {
      setError(null);
      const results = await messagesApi.searchUsers(query);
      setUsers(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search users');
    }
  }, [fetchUsers]);

  const createConversation = useCallback(async (userId: number) => {
    try {
      const conversation = await messagesApi.getOrCreateConversation(userId);
      return conversation;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create conversation');
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    searchUsers,
    createConversation,
    refreshUsers: fetchUsers,
  };
};
