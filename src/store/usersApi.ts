import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from './index';
import { API_ROOT } from '../config/env';

// Import centralized types
import {
  UserProfile,
  UpdateUserProfileRequest,
  BlockUserRequest,
  UnblockUserRequest,
  ReportUserRequest,
  ProfilePictureUploadResponse,
  UserActionResponse
} from '../../types/api/users';

// Create base query
const baseQuery = fetchBaseQuery({
  baseUrl: API_ROOT,
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

    // Get user profile by username
    getUserProfileByUsername: builder.query<UserProfile, string>({
      query: (username) => ({
        url: `/users/profile/${username}/`,
        method: 'GET',
      }),
      providesTags: (result, error, username) => [{ type: 'UserProfile', id: username }],
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

    // Upload profile picture
    uploadProfilePicture: builder.mutation<ProfilePictureUploadResponse, FormData>({
      query: (formData) => ({
        url: '/users/upload-profile-picture/',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['UserProfile', 'Users'],
    }),

    // Delete profile picture
    deleteProfilePicture: builder.mutation<void, void>({
      query: () => ({
        url: '/users/delete-profile-picture/',
        method: 'DELETE',
      }),
      invalidatesTags: ['UserProfile', 'Users'],
    }),

    // Block user
    blockUser: builder.mutation<UserActionResponse, BlockUserRequest>({
      query: (data) => ({
        url: '/users/block/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['UserProfile', 'Users'],
    }),

    // Unblock user
    unblockUser: builder.mutation<UserActionResponse, UnblockUserRequest>({
      query: (data) => ({
        url: '/users/unblock/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['UserProfile', 'Users'],
    }),

    // Report user
    reportUser: builder.mutation<UserActionResponse, ReportUserRequest>({
      query: (data) => ({
        url: '/users/report/',
        method: 'POST',
        body: data,
      }),
    }),

    // Get blocked users list
    getBlockedUsers: builder.query<UserProfile[], void>({
      query: () => ({
        url: '/users/blocked/',
        method: 'GET',
      }),
      providesTags: ['Users'],
    }),
  }),
});

export const {
  useGetUserProfileQuery,
  useGetUserProfileByUsernameQuery,
  useUpdateUserProfileMutation,
  useUploadProfilePictureMutation,
  useDeleteProfilePictureMutation,
  useBlockUserMutation,
  useUnblockUserMutation,
  useReportUserMutation,
  useGetBlockedUsersQuery, // Note: This is maintained for backward compatibility but use blockedApi instead
} = usersApi;
