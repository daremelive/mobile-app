import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';
import type { RootState } from './index';
import { API_BASE_URL } from '../config/env';

// Silent operation - no logging

// Types for API responses and requests
export interface User {
  id: number;
  email: string;
  username: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  short_name: string;
  phone_number: string | null;
  gender: 'male' | 'female' | 'other' | null;
  country: string | null;
  interests: string | null; // Backend stores as comma-separated string
  language: string;
  profile_completed: boolean;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  is_content_creator: boolean;
  has_accepted_terms: boolean;
  vip_level: 'basic' | 'premium' | 'vip' | 'vvip';
  // Profile picture
  profile_picture: string | null;
  profile_picture_url: string | null;
  // Social stats
  followers_count: number;
  following_count: number;
  total_likes_count: number;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface SignupRequest {
  email: string;
  password: string;
  confirm_password: string;
}

export interface SigninRequest {
  email: string;
  password: string;
}

export interface VerifyOTPRequest {
  email: string;
  otp: string;
  purpose: 'signup' | 'reset';
}

export interface ProfileCompletionRequest {
  username: string;
  phone_number: string;
  gender: 'male' | 'female' | 'other'; // Backend expects lowercase
  country: string;
  has_accepted_terms: boolean;
}

export interface ProfileCompletionResponse {
  message: string;
  user: User;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
  new_password_confirm: string;
}

export interface UpdateProfileRequest {
  username?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  country?: string;
  interests?: string; // Backend expects string, not array
  language?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  email: string;
  otp: string;
  new_password: string;
  new_password_confirm: string;
}

// Create base query for authenticated requests
const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  timeout: 15000, // 15 second timeout for faster failure detection
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const token = state.auth.accessToken;
    const isAuthenticated = state.auth.isAuthenticated;
    
    if (token && isAuthenticated) {
      headers.set('authorization', `Bearer ${token}`);
    }
    headers.set('content-type', 'application/json');
    return headers;
  },
});

// Create base query for public endpoints (no auth)
const publicBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  timeout: 15000,
  prepareHeaders: (headers) => {
    headers.set('content-type', 'application/json');
    return headers;
  },
});

// Base query with automatic token refresh
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);
  
  // Don't attempt token refresh for public endpoints
  const publicEndpoints = [
    'passwordResetRequest', 
    'passwordResetConfirm', 
    'signup', 
    'resendOTP',
    'signin', 
    'verifyOTP',
    'refresh',
    'googleAuth'
  ];
  
  const endpoint = extraOptions?.endpoint || args?.endpoint;
  const isPublicEndpoint = publicEndpoints.includes(endpoint);
  
  console.log('[AuthAPI] baseQueryWithReauth:', { endpoint, isPublicEndpoint, status: result.error?.status });
  
  if (result.error && result.error.status === 401 && !isPublicEndpoint) {
    console.log('[AuthAPI] Attempting token refresh for protected endpoint:', endpoint);
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
        api.dispatch(authApi.util.resetApiState());
      }
    }
  } else if (result.error && result.error.status === 401 && isPublicEndpoint) {
    console.log('[AuthAPI] 401 on public endpoint - this should not happen:', endpoint);
  }
  
  return result;
};

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Auth'],
  endpoints: (builder) => ({
    // Registration
    signup: builder.mutation<{ message: string; email: string }, SignupRequest>({
      queryFn: async (credentials, _queryApi, _extraOptions) => {
        const result = await publicBaseQuery({
          url: '/users/register/',
          method: 'POST',
          body: credentials,
        }, _queryApi, _extraOptions);
        
        return result as any;
      },
    }),

    // Email verification
    verifyOTP: builder.mutation<AuthResponse, VerifyOTPRequest>({
      queryFn: async (data, _queryApi, _extraOptions) => {
        const result = await publicBaseQuery({
          url: '/auth/verify-otp/',
          method: 'POST',
          body: data,
        }, _queryApi, _extraOptions);
        
        return result as any;
      },
      invalidatesTags: ['Auth', 'User'],
    }),

    // Resend OTP
    resendOTP: builder.mutation<{ message: string }, { email: string; purpose: 'signup' | 'reset' }>({
      queryFn: async (data, _queryApi, _extraOptions) => {
        const result = await publicBaseQuery({
          url: '/auth/send-otp/',
          method: 'POST',
          body: data,
        }, _queryApi, _extraOptions);
        
        return result as any;
      },
    }),

    // Login
    signin: builder.mutation<AuthResponse, SigninRequest>({
      queryFn: async (credentials, _queryApi, _extraOptions) => {
        const result = await publicBaseQuery({
          url: '/auth/login/',
          method: 'POST',
          body: credentials,
        }, _queryApi, _extraOptions);
        
        return result as any;
      },
      invalidatesTags: ['Auth', 'User'],
    }),

    // Refresh token
    refresh: builder.mutation<{ access: string }, { refresh: string }>({
      query: (tokens) => ({
        url: '/auth/token/refresh/',
        method: 'POST',
        body: tokens,
      }),
    }),

    // Logout
    logout: builder.mutation<{ message: string }, { refresh: string }>({
      query: (data) => ({
        url: '/users/logout/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Auth', 'User'],
    }),

    // Profile completion (required after email verification)
    completeProfile: builder.mutation<ProfileCompletionResponse, ProfileCompletionRequest>({
      query: (data) => ({
        url: '/users/profile/complete/',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    // Get current user profile
    getProfile: builder.query<User, void>({
      query: () => '/users/profile/',
      providesTags: ['User'],
    }),

    // Update user profile
    updateProfile: builder.mutation<User, UpdateProfileRequest>({
      query: (data) => ({
        url: '/users/profile/',
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    // Upload profile picture
    uploadProfilePicture: builder.mutation<{ message: string; user: User }, FormData>({
      query: (formData) => ({
        url: '/users/profile/upload-picture/',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['User'],
    }),

    // Change password
    changePassword: builder.mutation<{ message: string }, ChangePasswordRequest>({
      query: (data) => ({
        url: '/users/change-password/',
        method: 'POST',
        body: data,
      }),
    }),

    // Deactivate account
    deactivateAccount: builder.mutation<{ message: string }, { reason?: string }>({
      query: (data) => ({
        url: '/users/deactivate/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Auth', 'User'],
    }),

    // Google OAuth
    googleAuth: builder.mutation<AuthResponse, { id_token: string }>({
      query: (data) => ({
        url: '/auth/google/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Auth', 'User'],
    }),

        // Password reset request
    passwordResetRequest: builder.mutation<{ message: string }, PasswordResetRequest>({
      queryFn: async (data, _queryApi, _extraOptions) => {
        const result = await publicBaseQuery({
          url: '/auth/password-reset/',
          method: 'POST',
          body: data,
        }, _queryApi, _extraOptions);
        
        return result as any; // Type assertion to match expected return type
      },
    }),

    // Password reset confirm
    passwordResetConfirm: builder.mutation<{ message: string }, PasswordResetConfirmRequest>({
      queryFn: async (data, _queryApi, _extraOptions) => {
        const result = await publicBaseQuery({
          url: '/auth/password-reset/confirm/',
          method: 'POST',
          body: data,
        }, _queryApi, _extraOptions);
        
        return result as any; // Type assertion to match expected return type
      },
    }),
  }),
});

export const {
  useSignupMutation,
  useVerifyOTPMutation,
  useResendOTPMutation,
  useSigninMutation,
  useRefreshMutation,
  useLogoutMutation,
  useCompleteProfileMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useUploadProfilePictureMutation,
  useChangePasswordMutation,
  useDeactivateAccountMutation,
  useGoogleAuthMutation,
  usePasswordResetRequestMutation,
  usePasswordResetConfirmMutation,
} = authApi; 