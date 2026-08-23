import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthenticatedBaseQuery } from '../api/authenticatedBaseQuery';
import { API_ROOT } from '../config/env';
import type {
  DiscoverUsersParams,
  DiscoverUsersResponse,
  FollowListResponse,
  FollowRequest,
  FollowResponse,
  FollowUserProfile,
  GetFollowersParams,
  GetFollowingParams,
  UserListItem,
} from '../../types/api/follow';

export type {
  FollowListResponse,
  FollowRequest,
  FollowResponse,
  UserListItem,
  UserProfile,
} from '../../types/api/follow';

const transformUserList = (response: FollowListResponse): UserListItem[] => response.results;

export const followApi = createApi({
  reducerPath: 'followApi',
  baseQuery: createAuthenticatedBaseQuery(API_ROOT),
  tagTypes: ['Following', 'Followers', 'Users', 'Search', 'UserProfile'],
  endpoints: (builder) => {
    const relationshipMutation = (url: string) => builder.mutation<FollowResponse, FollowRequest>({
      query: (data) => ({ url, method: 'POST', body: data }),
      invalidatesTags: (_result, _error, { user_id }) => [
        'Following',
        'Users',
        'Search',
        { type: 'Users', id: user_id },
        { type: 'UserProfile', id: user_id },
      ],
    });

    return {
      followUser: relationshipMutation('/users/follow/'),
      unfollowUser: relationshipMutation('/users/unfollow/'),

      getFollowing: builder.query<UserListItem[], GetFollowingParams>({
        query: ({ search = '' }) => ({
          url: '/users/following/',
          params: search ? { search } : {},
        }),
        providesTags: ['Following'],
        transformResponse: transformUserList,
        keepUnusedDataFor: 0,
      }),

      getFollowers: builder.query<UserListItem[], GetFollowersParams>({
        query: ({ search = '' }) => ({
          url: '/users/followers/',
          params: search ? { search } : {},
        }),
        providesTags: ['Followers'],
        transformResponse: transformUserList,
      }),

      discoverUsers: builder.query<UserListItem[], DiscoverUsersParams>({
        query: ({ search = '' }) => ({
          url: '/users/discover/',
          params: search ? { search } : {},
        }),
        providesTags: ['Users'],
        transformResponse: (response: DiscoverUsersResponse) => response.results,
        keepUnusedDataFor: 0,
      }),

      getUserProfile: builder.query<FollowUserProfile, number>({
        query: (userId) => ({ url: `/users/${userId}/`, method: 'GET' }),
        providesTags: (_result, _error, userId) => [{ type: 'Users', id: userId }],
      }),
    };
  },
});

export const {
  useDiscoverUsersQuery,
  useFollowUserMutation,
  useGetFollowersQuery,
  useGetFollowingQuery,
  useGetUserProfileQuery,
  useUnfollowUserMutation,
} = followApi;
