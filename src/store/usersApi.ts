import { createApi } from '@reduxjs/toolkit/query/react';
import { API_ROOT } from '../config/env';
import { createAuthenticatedBaseQuery } from '../api/authenticatedBaseQuery';

// Import centralized types
import {
  UserProfile,
  UpdateUserProfileRequest,
} from '../../types/api/users';

// Create base query
const baseQuery = createAuthenticatedBaseQuery(API_ROOT);

export const usersApi = createApi({
  reducerPath: 'usersApi',
  baseQuery: baseQuery,
  tagTypes: ['UserProfile', 'Users'],
  endpoints: (builder) => ({
    // Get user profile by ID
    getUserProfile: builder.query<UserProfile, string>({
      query: (userId) => ({
        url: `/users/${userId}/`,
        method: 'GET',
      }),
      providesTags: (result, error, userId) => [{ type: 'UserProfile', id: userId }],
    }),

    // Update current user profile
    updateUserProfile: builder.mutation<UserProfile, UpdateUserProfileRequest>({
      query: (data) => ({
        url: '/users/profile/',
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['UserProfile', 'Users'],
    }),

  }),
});

export const {
  useGetUserProfileQuery,
  useUpdateUserProfileMutation,
} = usersApi;
