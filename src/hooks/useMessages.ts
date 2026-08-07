import { useState, useCallback, useMemo } from 'react';
import {
  useGetConversationsQuery,
  useGetConversationDetailQuery,
  useSendMessageMutation,
  useMarkMessagesAsReadMutation,
  useSearchMessagesQuery,
  useSearchUsersQuery,
  useGetUsersQuery,
  useGetUserStatusQuery,
  useCreateConversationMutation,
} from '../api/messagingApi';
import { logger } from '../utils/logger';

/**
 * One shared empty array for every "no data yet" case.
 *
 * Returning a fresh `[]` gave consumers a new array identity on every render,
 * so any effect listing the result in its dependencies re-ran forever — which
 * pinned the JS thread and left screens stuck on their loading spinner.
 */
const EMPTY_LIST: any[] = [];

export const useConversations = (searchQuery?: string) => {
  const [isSearching, setIsSearching] = useState(false);
  
  // Main conversations query
  const {
    data: conversationsData,
    error: conversationsError,
    isLoading: conversationsLoading,
    refetch: refetchConversations,
    isFetching: refreshing,
  } = useGetConversationsQuery();

  // Search query (only when searching)
  const {
    data: searchData,
    error: searchError,
    isLoading: searchLoading,
  } = useSearchMessagesQuery(
    { query: searchQuery || '' },
    { skip: !searchQuery?.trim() }
  );

  const searchConversations = useCallback(async (query: string) => {
    if (!query.trim()) {
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
  }, []);

  const clearSearch = useCallback(() => {
    setIsSearching(false);
  }, []);

  const refreshConversations = useCallback(async () => {
    refetchConversations();
  }, [refetchConversations]);

  // Return search results if searching, otherwise regular conversations
  const conversations = useMemo(
    () => (isSearching && searchData ? searchData.conversations : conversationsData?.results ?? EMPTY_LIST),
    [isSearching, searchData, conversationsData]
  );
  const loading = isSearching ? searchLoading : conversationsLoading;
  const error = isSearching ? searchError : conversationsError;

  return {
    conversations,
    loading,
    error,
    refreshing,
    searchResults: searchData,
    isSearching,
    refreshConversations,
    searchConversations,
    clearSearch,
  };
};

export const useConversationDetail = (conversationId: number) => {
  const {
    data: conversation,
    error,
    isLoading: loading,
    refetch: refreshConversation,
  } = useGetConversationDetailQuery({ conversationId });

  const [sendMessageMutation, { isLoading: sending }] = useSendMessageMutation();
  const [markAsReadMutation] = useMarkMessagesAsReadMutation();

  const sendMessage = useCallback(async (content: string, recipientId: number) => {
    if (!content.trim()) return;

    try {
      await sendMessageMutation({
        recipient_id: recipientId,
        content: content.trim(),
      }).unwrap();
      
      // RTK Query will automatically update the cache
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to send message');
    }
  }, [sendMessageMutation]);

  const markAsRead = useCallback(async () => {
    try {
      await markAsReadMutation({ conversationId }).unwrap();
    } catch (err) {
      logger.error('Failed to mark messages as read:', err);
    }
  }, [markAsReadMutation, conversationId]);

  return {
    conversation,
    messages: conversation?.messages || [],
    loading,
    error,
    sending,
    sendMessage,
    refreshConversation,
    markAsRead,
  };
};

export const useUserStatus = (userId: number) => {
  const {
    data: statusData,
    error,
    isLoading,
  } = useGetUserStatusQuery({ userId });

  return {
    isOnline: statusData?.is_online || false,
    lastSeen: statusData?.last_seen || null,
    loading: isLoading,
    error,
  };
};

export const useUsers = (searchQuery?: string) => {
  const [isSearching, setIsSearching] = useState(false);

  // Main users query
  const {
    data: usersData,
    error: usersError,
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = useGetUsersQuery();

  // Search query (only when searching)
  const {
    data: searchData,
    error: searchError,
    isLoading: searchLoading,
  } = useSearchUsersQuery(
    { query: searchQuery || '' },
    { skip: !searchQuery?.trim() }
  );

  const [createConversationMutation] = useCreateConversationMutation();

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
  }, []);

  const createConversation = useCallback(async (userId: number) => {
    try {
      const conversation = await createConversationMutation({ userId }).unwrap();
      return conversation;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create conversation');
    }
  }, [createConversationMutation]);

  const refreshUsers = useCallback(async () => {
    refetchUsers();
  }, [refetchUsers]);

  // Return search results if searching, otherwise regular users
  const users = useMemo(
    () => (isSearching && searchData ? searchData.results : usersData?.results ?? EMPTY_LIST),
    [isSearching, searchData, usersData]
  );
  const loading = isSearching ? searchLoading : usersLoading;
  const error = isSearching ? searchError : usersError;

  return {
    users,
    loading,
    error,
    searchUsers,
    createConversation,
    refreshUsers,
  };
};
