import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  // Types
  Message,
  Conversation,
  ConversationDetail,
  
  // Request types
  SendMessageRequest,
  GetConversationsRequest,
  GetConversationDetailRequest,
  SearchMessagesRequest,
  SearchUsersRequest,
  GetUsersRequest,
  GetUserStatusRequest,
  MarkMessagesAsReadRequest,
  CreateConversationRequest,
  
  // Response types
  ConversationsResponse,
  SearchMessagesResponse,
  SearchUsersResponse,
  GetUsersResponse,
  UserStatusResponse,
  MarkAsReadResponse,
  DeleteConversationResponse,
} from '../../types/api/messaging';

const getBaseUrl = () => {
  if (__DEV__) {
    return 'http://127.0.0.1:8000';
  }
  return 'https://dareme-backend-0f6e1ff3ba51.herokuapp.com';
};

export const messagingApi = createApi({
  reducerPath: 'messagingApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${getBaseUrl()}/messaging`,
    prepareHeaders: async (headers) => {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      headers.set('content-type', 'application/json');
      return headers;
    },
  }),
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

    deleteConversation: builder.mutation<DeleteConversationResponse, number>({
      query: (conversationId) => ({
        url: `/conversations/${conversationId}/`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Conversation'],
    }),

    // === Messages ===
    sendMessage: builder.mutation<Message, SendMessageRequest>({
      query: (body) => ({
        url: '/send_message/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Conversation', 'Message'],
    }),

    markMessagesAsRead: builder.mutation<MarkAsReadResponse, MarkMessagesAsReadRequest>({
      query: ({ conversationId }) => ({
        url: `/conversations/${conversationId}/mark_read/`,
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
        queryParams.append('query', query);
        return `/search/?${queryParams.toString()}`;
      },
      providesTags: ['Message'],
    }),

    searchUsers: builder.query<SearchUsersResponse, SearchUsersRequest>({
      query: ({ query }) => {
        const queryParams = new URLSearchParams();
        queryParams.append('query', query);
        return `/search_users/?${queryParams.toString()}`;
      },
      providesTags: ['User'],
    }),

    // === Users ===
    getUsers: builder.query<GetUsersResponse, GetUsersRequest | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
        
        const queryString = queryParams.toString();
        return `/users/${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: ['User'],
    }),

    getUserStatus: builder.query<UserStatusResponse, GetUserStatusRequest>({
      query: ({ userId }) => `/users/${userId}/status/`,
      providesTags: (result, error, { userId }) => [
        { type: 'User', id: userId }
      ],
    }),
  }),
});

// Export hooks for use in components
export const {
  // Conversations
  useGetConversationsQuery,
  useGetConversationDetailQuery,
  useCreateConversationMutation,
  useDeleteConversationMutation,
  
  // Messages
  useSendMessageMutation,
  useMarkMessagesAsReadMutation,
  
  // Search
  useSearchMessagesQuery,
  useSearchUsersQuery,
  
  // Users
  useGetUsersQuery,
  useGetUserStatusQuery,
} = messagingApi;

// Export the reducer
export default messagingApi.reducer;