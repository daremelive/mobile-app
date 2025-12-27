import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';
import type { RootState } from './index';
import { API_BASE_URL } from '../config/env';

// Import centralized types
import type {
  UserListItem,
  FollowUserProfile,
  FollowRequest,
  UnfollowRequest,
  FollowResponse,
  FollowListResponse,
  FollowQueryParams,
  DiscoverUsersParams,
  GetFollowingParams,
  GetFollowersParams,
  DiscoverUsersResponse,
} from '../../types/api/follow';

// Re-export for backward compatibility
export type {
  UserListItem,
  FollowRequest,
  FollowResponse,
  FollowListResponse,
  UserProfile,
} from '../../types/api/follow';

// Create API with base query that includes token
const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  timeout: 15000, // 15 second timeout for faster failure detection
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
  tagTypes: ['Following', 'Followers', 'Users', 'Search', 'UserProfile'],
  endpoints: (builder) => ({
        // Follow a user
    followUser: builder.mutation<FollowResponse, FollowRequest>({
      query: (data) => ({
        url: '/users/follow/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { user_id }) => [
        'Following', 
        'Users', 
        'Search',
        { type: 'Users', id: user_id },
        { type: 'UserProfile', id: user_id }
      ],
      // Optimistically update the cache
      async onQueryStarted({ user_id }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Force refresh of all user-related queries
          dispatch(followApi.util.invalidateTags(['Following', 'Users']));
        } catch {
          // Handle error if needed
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
      invalidatesTags: (result, error, { user_id }) => [
        'Following', 
        'Users', 
        'Search',
        { type: 'Users', id: user_id },
        { type: 'UserProfile', id: user_id }
      ],
      // Optimistically update the cache
      async onQueryStarted({ user_id }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Force refresh of all user-related queries
          dispatch(followApi.util.invalidateTags(['Following', 'Users']));
        } catch {
          // Handle error if needed
        }
      },
    }),

    // Get list of users the current user is following
    getFollowing: builder.query<UserListItem[], GetFollowingParams>({
      query: ({ search = '' }) => ({
        url: '/users/following/',
        params: search ? { search } : {},
      }),
      providesTags: ['Following'],
      transformResponse: (response: FollowListResponse) => response.results,
      // Add more aggressive cache invalidation for live status
      keepUnusedDataFor: 0, // Don't cache this data
    }),

    // Get list of users following the current user
    getFollowers: builder.query<UserListItem[], GetFollowersParams>({
      query: ({ search = '' }) => ({
        url: '/users/followers/',
        params: search ? { search } : {},
      }),
      providesTags: ['Followers'],
      transformResponse: (response: FollowListResponse) => response.results,
    }),

    // Discover users to follow
    discoverUsers: builder.query<UserListItem[], DiscoverUsersParams>({
      query: ({ search = '' }) => ({
        url: '/users/discover/',
        params: search ? { search } : {},
      }),
      providesTags: ['Users'],
      transformResponse: (response: DiscoverUsersResponse) => response.results,
      // Add more aggressive cache invalidation for follow status updates
      keepUnusedDataFor: 0, // Don't cache this data for too long
    }),

    // Get user profile with follow status
    getUserProfile: builder.query<FollowUserProfile, number>({
      query: (userId) => ({
        url: `/users/${userId}/`,
        method: 'GET',
      }),
      providesTags: (result, error, userId) => [{ type: 'Users', id: userId }],
    }),
  }),
});

export const {
  useFollowUserMutation,
  useUnfollowUserMutation,
  useGetFollowingQuery,
  useGetFollowersQuery,
  useDiscoverUsersQuery,
  useGetUserProfileQuery,
} = followApi;
