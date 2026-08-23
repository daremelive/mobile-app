import { createApi } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../config/env';
import { createAuthenticatedBaseQuery } from './authenticatedBaseQuery';

// Import centralized types
import type {
  BlockedUser,
  BlockedUsersResponse,
  BlockedUsersCountResponse,
  BlockUserRequest,
  UnblockUserRequest,
  BlockUserResponse,
  UnblockUserResponse,
  SearchBlockedUsersParams,
} from '../../types/api/blocked';

// Re-export for backward compatibility
export type {
  BlockedUser,
  BlockedUsersResponse,
};

// Create base query for blocked users endpoints
const baseQuery = createAuthenticatedBaseQuery(`${API_BASE_URL}blocked/`);

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
    getBlockedUsersCount: builder.query<BlockedUsersCountResponse, void>({
      query: () => 'count/',
      providesTags: ['BlockedUser'],
    }),

    // Block a user
    blockUser: builder.mutation<BlockUserResponse, BlockUserRequest>({
      query: (data: BlockUserRequest) => ({
        url: 'block/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['BlockedUser'],
    }),

    // Unblock a user
    unblockUser: builder.mutation<UnblockUserResponse, UnblockUserRequest>({
      query: (data: UnblockUserRequest) => ({
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
