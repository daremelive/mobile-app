import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from './index';
import IPDetector from '../utils/ipDetector';

// Dynamic base query that detects the API URL
const dynamicBaseQuery = async (args: any, api: any, extraOptions: any) => {
  let baseUrl = 'http://172.20.10.2:8000/api/';
  
  try {
    if (IPDetector) {
      baseUrl = await IPDetector.getAPIBaseURL();
    }
  } catch (error) {
    // Use fallback silently
  }

  // Create a temporary baseQuery with the detected URL
  const baseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.accessToken;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  });

  return baseQuery(args, api, extraOptions);
};

// User profile interface
export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  short_name: string;
  phone_number: string;
  gender: 'male' | 'female';
  country: string;
  interests: string;
  language: string;
  vip_level: 'basic' | 'premium' | 'vip' | 'vvip';
  profile_picture: string | null;
  profile_picture_url: string | null;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  profile_completed: boolean;
  is_content_creator: boolean;
  followers_count: number;
  following_count: number;
  total_likes_count: number;
  is_following: boolean;
  created_at: string;
  updated_at: string;
}

export const usersApi = createApi({
  reducerPath: 'usersApi',
  baseQuery: dynamicBaseQuery,
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
    updateUserProfile: builder.mutation<UserProfile, Partial<UserProfile>>({
      query: (data) => ({
        url: '/users/profile/',
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['UserProfile', 'Users'],
    }),

    // Upload profile picture
    uploadProfilePicture: builder.mutation<{ profile_picture_url: string }, FormData>({
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
    blockUser: builder.mutation<{ message: string }, { user_id: number }>({
      query: (data) => ({
        url: '/users/block/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['UserProfile', 'Users'],
    }),

    // Unblock user
    unblockUser: builder.mutation<{ message: string }, { user_id: number }>({
      query: (data) => ({
        url: '/users/unblock/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['UserProfile', 'Users'],
    }),

    // Report user
    reportUser: builder.mutation<{ message: string }, { user_id: number; reason: string; description?: string }>({
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
  useGetBlockedUsersQuery,
} = usersApi;
