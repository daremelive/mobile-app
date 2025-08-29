import { createApi, fetchBaseQuery, BaseQueryFn } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config/env';

// Create base query for blocked users endpoints
const baseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE_URL}/blocked/`,
  prepareHeaders: async (headers) => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
    } catch (error) {
      console.error('❌ [BlockedAPI] Error getting auth token:', error);
    }
    return headers;
  },
});

export interface BlockedUser {
  id: number;
  blocked_user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    full_name: string;
    profile_picture_url?: string;
    followers_count: string;
    is_following: boolean;
    is_live: boolean;
  };
  created_at: string;
}

export interface BlockedUsersResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: BlockedUser[];
}

export const blockedApi = createApi({
  reducerPath: 'blockedApi',
  baseQuery: baseQuery,
  tagTypes: ['BlockedUser'],
  endpoints: (builder) => ({
    searchBlockedUsers: builder.query<BlockedUser[], string>({
      query: (search: string) => ({
        url: `search/?search=${encodeURIComponent(search)}`,
        method: 'GET',
      }),
      transformResponse: (response: BlockedUsersResponse) => response.results || [],
      providesTags: ['BlockedUser'],
    }),
    
    // Get all blocked users
    getAllBlockedUsers: builder.query<BlockedUser[], void>({
      query: () => '',
      transformResponse: (response: BlockedUsersResponse) => response.results || [],
      providesTags: ['BlockedUser'],
    }),

    // Get blocked users count
    getBlockedUsersCount: builder.query<{ count: number }, void>({
      query: () => 'count/',
      providesTags: ['BlockedUser'],
    }),
    
    // Block a user
    blockUser: builder.mutation<any, { user_id: number; reason?: string }>({
      query: (data: { user_id: number; reason?: string }) => ({
        url: 'block/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['BlockedUser'],
    }),
    
    // Unblock a user
    unblockUser: builder.mutation<any, { user_id: number }>({
      query: (data: { user_id: number }) => ({
        url: 'unblock/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['BlockedUser'],
    }),
  }),
});

export const {
  useSearchBlockedUsersQuery,
  useGetAllBlockedUsersQuery,
  useGetBlockedUsersCountQuery,
  useBlockUserMutation,
  useUnblockUserMutation,
} = blockedApi;
