import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';
import type { RootState } from './index';

// Base URL for your Django backend
// Use the same base URL detection as authApi
const getBaseUrl = () => {
  if (__DEV__) {
    // @ts-ignore
    const { manifest } = require('expo-constants').default;
    
    if (manifest?.debuggerHost) {
      const ip = manifest.debuggerHost.split(':')[0];
      return `http://${ip}:8000/api`;
    }
    
    try {
      if (typeof window !== 'undefined' && window.location?.hostname) {
        const ip = window.location.hostname;
        if (ip !== 'localhost' && ip !== '127.0.0.1') {
          return `http://${ip}:8000/api`;
        }
      }
    } catch (e) {
      // Ignore errors in React Native environment
    }
  }
  
  return 'http://172.20.10.2:8000/api';
};

const BASE_URL = getBaseUrl();

// Types for Follow API
export interface UserListItem {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  profile_picture_url?: string;
  followers_count: string; // Backend returns formatted string like "12k"
  is_following: boolean;
  is_live: boolean;
}

export interface FollowRequest {
  user_id: number;
}

export interface FollowResponse {
  message: string;
  is_following: boolean;
}

export interface FollowListResponse {
  results: UserListItem[];
  count: number;
  next: string | null;
  previous: string | null;
}

// Create API with base query that includes token
const baseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    headers.set('content-type', 'application/json');
    return headers;
  },
});

// Base query with automatic token refresh (same as authApi)
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);
  
  if (result.error && result.error.status === 401) {
    // Try to get a new token
    const refreshToken = (api.getState() as RootState).auth.refreshToken;
    if (refreshToken) {
      const refreshResult = await baseQuery(
        {
          url: '/auth/token/refresh/',
          method: 'POST',
          body: { refresh: refreshToken },
        },
        api,
        extraOptions
      );
      
      if (refreshResult.data) {
        const refreshData = refreshResult.data as { access: string };
        const { access } = refreshData;
        // Store new token
        await SecureStore.setItemAsync('accessToken', access);
        // Retry original query with new token
        result = await baseQuery(args, api, extraOptions);
      } else {
        // Refresh failed, redirect to login
        api.dispatch(followApi.util.resetApiState());
      }
    }
  }
  
  return result;
};

export const followApi = createApi({
  reducerPath: 'followApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Following', 'Followers', 'Users', 'Search'],
  endpoints: (builder) => ({
    // Follow a user
    followUser: builder.mutation<FollowResponse, FollowRequest>({
      query: (data) => ({
        url: '/users/follow/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Following', 'Users', 'Search'],
      // Optimistic update
      async onQueryStarted({ user_id }, { dispatch, queryFulfilled }) {
        // Update following list
        const patchResult = dispatch(
          followApi.util.updateQueryData('getFollowing', { search: '' }, (draft) => {
            // Add user to following list if successful
          })
        );
        
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    // Unfollow a user
    unfollowUser: builder.mutation<FollowResponse, FollowRequest>({
      query: (data) => ({
        url: '/users/unfollow/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Following', 'Users', 'Search'],
      // Optimistic update
      async onQueryStarted({ user_id }, { dispatch, queryFulfilled }) {
        // Update following list
        const patchResult = dispatch(
          followApi.util.updateQueryData('getFollowing', { search: '' }, (draft) => {
            return draft.filter(user => user.id !== user_id);
          })
        );
        
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    // Get list of users the current user is following
    getFollowing: builder.query<UserListItem[], { search?: string }>({
      query: ({ search = '' }) => ({
        url: '/users/following/',
        params: search ? { search } : {},
      }),
      providesTags: ['Following'],
      transformResponse: (response: FollowListResponse) => response.results,
    }),

    // Get list of users following the current user
    getFollowers: builder.query<UserListItem[], { search?: string }>({
      query: ({ search = '' }) => ({
        url: '/users/followers/',
        params: search ? { search } : {},
      }),
      providesTags: ['Followers'],
      transformResponse: (response: FollowListResponse) => response.results,
    }),

    // Discover users to follow
    discoverUsers: builder.query<UserListItem[], { search?: string }>({
      query: ({ search = '' }) => ({
        url: '/users/discover/',
        params: search ? { search } : {},
      }),
      providesTags: ['Users'],
      transformResponse: (response: FollowListResponse) => response.results,
    }),
  }),
});

export const {
  useFollowUserMutation,
  useUnfollowUserMutation,
  useGetFollowingQuery,
  useGetFollowersQuery,
  useDiscoverUsersQuery,
} = followApi;
