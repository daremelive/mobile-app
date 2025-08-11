import { createApi, fetchBaseQuery, BaseQueryFn } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';
import IPDetector from '../utils/ipDetector';

// Dynamic base query that handles IP detection
const dynamicBaseQuery: BaseQueryFn = async (args, api, extraOptions) => {
  let baseUrl = 'https://daremelive.pythonanywhere.com/api/blocked/'; // Production fallback
  
  if (__DEV__) {
    try {
      baseUrl = await IPDetector.getAPIBaseURL('blocked');
      console.log('🔗 [BlockedAPI] Using detected URL:', baseUrl);
    } catch (error) {
      console.error('❌ [BlockedAPI] IP detection failed, using fallback:', error);
    }
  }
  
  // Create a temporary baseQuery with the detected URL
  const baseQuery = fetchBaseQuery({
    baseUrl,
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
  
  return baseQuery(args, api, extraOptions);
};

export interface BlockedUser {
  id: number;
  blocked_user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    full_name: string;
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
  baseQuery: dynamicBaseQuery,
  tagTypes: ['BlockedUsers'],
  endpoints: (builder) => ({
    // Get blocked users list
    getBlockedUsers: builder.query<BlockedUser[], string | void>({
      query: (search) => ({
        url: '',
        params: search ? { search } : {},
      }),
      transformResponse: (response: BlockedUsersResponse) => response.results,
      providesTags: ['BlockedUsers'],
    }),

    // Get blocked users count
    getBlockedUsersCount: builder.query<{ count: number }, void>({
      query: () => 'count/',
      providesTags: ['BlockedUsers'],
    }),

    // Block a user
    blockUser: builder.mutation<
      { message: string; blocked: boolean },
      { user_id: number }
    >({
      query: (data) => ({
        url: 'block/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['BlockedUsers'],
    }),

    // Unblock a user
    unblockUser: builder.mutation<
      { message: string; blocked: boolean },
      { user_id: number }
    >({
      query: (data) => ({
        url: 'unblock/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['BlockedUsers'],
    }),
  }),
});

export const {
  useGetBlockedUsersQuery,
  useGetBlockedUsersCountQuery,
  useBlockUserMutation,
  useUnblockUserMutation,
} = blockedApi;
