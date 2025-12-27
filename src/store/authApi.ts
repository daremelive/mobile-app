import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';
import type { RootState } from './index';
import { API_BASE_URL } from '../config/env';

// Import centralized types
import type {
  User,
  AuthResponse,
  SignupRequest,
  SignupResponse,
  SigninRequest,
  VerifyOTPRequest,
  ResendOTPRequest,
  ProfileCompletionRequest,
  ProfileCompletionResponse,
  UpdateProfileRequest,
  ProfilePictureUploadResponse,
  ChangePasswordRequest,
  PasswordResetRequest,
  PasswordResetConfirmRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  DeactivateAccountRequest,
  LogoutRequest,
  GoogleAuthRequest,
  AuthMessageResponse,
} from '../../types/api/auth';

// Re-export for backward compatibility
export type {
  User,
  AuthResponse,
  SignupRequest,
  SigninRequest,
  VerifyOTPRequest,
  ProfileCompletionRequest,
  ProfileCompletionResponse,
  ChangePasswordRequest,
  UpdateProfileRequest,
  PasswordResetRequest,
  PasswordResetConfirmRequest,
};

// Silent operation - no logging

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

// Create base query for public endpoints (no auth) with debug wrapper
const rawPublicBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  timeout: 15000,
  prepareHeaders: (headers) => {
    headers.set('content-type', 'application/json');
    return headers;
  },
});

// Wrapped public base query with debugging
const publicBaseQuery = async (args: any, api: any, extraOptions: any) => {
  const url = typeof args === 'string' ? args : args?.url;
  console.log('[AuthAPI] publicBaseQuery starting:', {
    url,
    baseUrl: API_BASE_URL,
    fullUrl: `${API_BASE_URL}${url}`,
    method: args?.method || 'GET',
  });

  const startTime = Date.now();
  const result = await rawPublicBaseQuery(args, api, extraOptions);
  const duration = Date.now() - startTime;

  if (result.error) {
    console.error('[AuthAPI] publicBaseQuery error:', {
      url,
      duration: `${duration}ms`,
      status: result.error.status,
      error: result.error,
    });
  } else {
    console.log('[AuthAPI] publicBaseQuery success:', {
      url,
      duration: `${duration}ms`,
    });
  }

  return result;
};

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
    signup: builder.mutation<SignupResponse, SignupRequest>({
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
    resendOTP: builder.mutation<AuthMessageResponse, ResendOTPRequest>({
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
    refresh: builder.mutation<RefreshTokenResponse, RefreshTokenRequest>({
      query: (tokens) => ({
        url: '/auth/token/refresh/',
        method: 'POST',
        body: tokens,
      }),
    }),

    // Logout
    logout: builder.mutation<AuthMessageResponse, LogoutRequest>({
      query: (data) => ({
        url: '/users/logout/',
        method: 'POST',
        body: data,
        timeout: 5000, // 5 second timeout for logout
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
    uploadProfilePicture: builder.mutation<ProfilePictureUploadResponse, FormData>({
      query: (formData) => ({
        url: '/users/profile/upload-picture/',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['User'],
    }),

    // Change password
    changePassword: builder.mutation<AuthMessageResponse, ChangePasswordRequest>({
      query: (data) => ({
        url: '/users/change-password/',
        method: 'POST',
        body: data,
      }),
    }),

    // Deactivate account
    deactivateAccount: builder.mutation<AuthMessageResponse, DeactivateAccountRequest>({
      query: (data) => ({
        url: '/users/deactivate/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Auth', 'User'],
    }),

    // Google OAuth
    googleAuth: builder.mutation<AuthResponse, GoogleAuthRequest>({
      queryFn: async (data, _queryApi, _extraOptions) => {
        // Use publicBaseQuery since this is an unauthenticated endpoint
        const result = await publicBaseQuery({
          url: 'auth/google/',  // No leading slash - baseUrl already ends with /
          method: 'POST',
          body: data,
        }, _queryApi, _extraOptions);

        return result as any;
      },
      invalidatesTags: ['Auth', 'User'],
    }),

    // Password reset request
    passwordResetRequest: builder.mutation<AuthMessageResponse, PasswordResetRequest>({
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
    passwordResetConfirm: builder.mutation<AuthMessageResponse, PasswordResetConfirmRequest>({
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