import { createApi } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../config/env';
import { createAuthenticatedBaseQuery } from './authenticatedBaseQuery';
import {
  // Types
  Message,
  MessageUser,
  Conversation,
  ConversationDetail,

  // Request types
  SendMessageRequest,
  GetConversationsRequest,
  GetConversationDetailRequest,
  SearchMessagesRequest,
  SearchUsersRequest,
  MarkMessagesAsReadRequest,
  CreateConversationRequest,

  // Response types
  ConversationsResponse,
  SearchMessagesResponse,
  SearchUsersResponse,
  MarkAsReadResponse,
} from '../../types/api/messaging';

export const messagingApi = createApi({
  reducerPath: 'messagingApi',
  baseQuery: createAuthenticatedBaseQuery(
    // Shares the configured host with every other API. It used to hardcode
    // 127.0.0.1, which on a real device points at the phone itself.
    `${API_BASE_URL}messaging/`,
    30_000,
  ),
  tagTypes: ['Conversation', 'Message', 'User'],
  endpoints: (builder) => ({
    // === Conversations ===
    getConversations: builder.query<ConversationsResponse, GetConversationsRequest | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
        if (params?.search) queryParams.append('search', params.search);

        const queryString = queryParams.toString();
        return `/conversations/${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: ['Conversation'],
    }),

    getConversationDetail: builder.query<ConversationDetail, GetConversationDetailRequest>({
      query: ({ conversationId, page, page_size }) => {
        const queryParams = new URLSearchParams();
        if (page) queryParams.append('page', page.toString());
        if (page_size) queryParams.append('page_size', page_size.toString());

        const queryString = queryParams.toString();
        return `/conversations/${conversationId}/${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: (result, error, { conversationId }) => [
        { type: 'Conversation', id: conversationId },
        'Message'
      ],
    }),

    createConversation: builder.mutation<Conversation, CreateConversationRequest>({
      query: ({ userId }) => ({
        url: '/conversations/',
        method: 'POST',
        body: { user_id: userId },
      }),
      invalidatesTags: ['Conversation'],
    }),

    // === Messages ===
    sendMessage: builder.mutation<Message, SendMessageRequest>({
      query: (body) => ({
        url: '/send/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Conversation', 'Message'],
    }),

    markMessagesAsRead: builder.mutation<MarkAsReadResponse, MarkMessagesAsReadRequest>({
      query: ({ conversationId }) => ({
        url: `/conversations/${conversationId}/mark-read/`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, { conversationId }) => [
        { type: 'Conversation', id: conversationId },
        'Message'
      ],
    }),

    // === Search ===
    searchMessages: builder.query<SearchMessagesResponse, SearchMessagesRequest>({
      query: ({ query }) => {
        const queryParams = new URLSearchParams();
        queryParams.append('q', query);
        return `/search/?${queryParams.toString()}`;
      },
      providesTags: ['Message'],
    }),

    searchUsers: builder.query<SearchUsersResponse, SearchUsersRequest>({
      query: ({ query }) => {
        const queryParams = new URLSearchParams();
        queryParams.append('q', query);
        return `/search-users/?${queryParams.toString()}`;
      },
      transformResponse: (response: MessageUser[]) => ({ results: response }),
      providesTags: ['User'],
    }),
  }),
});

// Export hooks for use in components
export const {
  // Conversations
  useGetConversationsQuery,
  useGetConversationDetailQuery,
  useCreateConversationMutation,

  // Messages
  useSendMessageMutation,
  useMarkMessagesAsReadMutation,

  // Search
  useSearchMessagesQuery,
  useSearchUsersQuery,
} = messagingApi;

// Export the reducer
export default messagingApi.reducer;
