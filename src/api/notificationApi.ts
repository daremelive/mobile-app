import { createApi, fetchBaseQuery, BaseQueryFn } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config/env';

// Import centralized types
import type {
  NotificationSetting,
  AccountNotificationSetting,
  InboxNotification,
  Notification,
  UpdateNotificationSettingsRequest,
  UpdateAccountNotificationSettingRequest,
  NotificationQueryParams,
  InboxNotificationQueryParams,
  NotificationListResponse,
  InboxNotificationListResponse,
  AccountNotificationSettingsResponse,
  NotificationStatsResponse,
  NotificationActionResponse,
  NotificationReadResponse,
  ClearNotificationResponse,
  MarkAllReadResponse,
} from '../../types/api/notifications';
import { logger } from '../utils/logger';

// Re-export for backward compatibility
export type {
  NotificationSetting,
  AccountNotificationSetting,
  InboxNotification,
  Notification,
};

// Create base query for notification endpoints
const baseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE_URL}notifications/`,
  prepareHeaders: async (headers) => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
    } catch (error) {
      logger.error('[NotificationAPI] Error getting auth token:', error);
    }
    return headers;
  },
});

export const notificationApi = createApi({
  reducerPath: 'notificationApi',
  baseQuery: baseQuery,
  tagTypes: ['NotificationSettings', 'AccountNotificationSettings', 'Notifications', 'InboxNotifications', 'NotificationStats'],
  endpoints: (builder) => ({
    // Get user's notification settings
    getNotificationSettings: builder.query<NotificationSetting, void>({
      query: () => 'settings/',
      providesTags: ['NotificationSettings'],
    }),

    // Update user's notification settings
    updateNotificationSettings: builder.mutation<NotificationSetting, UpdateNotificationSettingsRequest>({
      query: (data: UpdateNotificationSettingsRequest) => ({
        url: 'settings/',
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['NotificationSettings'],
    }),

    // Get account notification settings (for specific followed users)
    getAccountNotificationSettings: builder.query<AccountNotificationSetting[], void>({
      query: () => 'account-settings/',
      transformResponse: (response: AccountNotificationSettingsResponse) => response.results,
      providesTags: ['AccountNotificationSettings'],
    }),

    // Update account notification setting for a specific followed user
    updateAccountNotificationSetting: builder.mutation<AccountNotificationSetting, UpdateAccountNotificationSettingRequest>({
      query: ({ following_user_id, data }: UpdateAccountNotificationSettingRequest) => ({
        url: `account-settings/update/`,
        method: 'PATCH',
        body: { 
          following_user_id,
          ...data 
        },
      }),
      invalidatesTags: ['AccountNotificationSettings'],
    }),

    // Get user's notifications
    getNotifications: builder.query<NotificationListResponse, NotificationQueryParams | void>({
      query: (params: NotificationQueryParams | void) => ({
        url: 'list/',
        params: params || {},
      }),
      providesTags: ['Notifications'],
    }),

    // Mark notification as read
    markNotificationAsRead: builder.mutation<Notification, number>({
      query: (notificationId: number) => ({
        url: `${notificationId}/mark-read/`,
        method: 'POST',
      }),
      invalidatesTags: ['Notifications'],
    }),

    // Mark all notifications as read
    markAllNotificationsAsRead: builder.mutation<MarkAllReadResponse, void>({
      query: () => ({
        url: 'mark-all-read/',
        method: 'POST',
      }),
      invalidatesTags: ['Notifications'],
    }),

    // Clear all inbox notifications
    clearAllInboxNotifications: builder.mutation<void, void>({
      query: () => ({
        url: 'inbox/clear-all/',
        method: 'DELETE',
      }),
      invalidatesTags: ['InboxNotifications', 'Notifications', 'NotificationStats'],
    }),

    // Clear a specific inbox notification
    clearInboxNotification: builder.mutation<ClearNotificationResponse, number>({
      query: (notificationId: number) => ({
        url: `inbox/${notificationId}/clear/`,
        method: 'DELETE',
      }),
      invalidatesTags: ['InboxNotifications', 'Notifications', 'NotificationStats'],
    }),

    // Get user's notification inbox (in-app notifications)
    getInboxNotifications: builder.query<InboxNotificationListResponse, InboxNotificationQueryParams | void>({
      query: (params: InboxNotificationQueryParams | void) => ({
        url: 'inbox/',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['InboxNotifications'],
    }),

    // Mark inbox notification as read
    markInboxNotificationAsRead: builder.mutation<NotificationReadResponse, number>({
      query: (notificationId: number) => ({
        url: `inbox/${notificationId}/read/`,
        method: 'PATCH',
      }),
      invalidatesTags: ['InboxNotifications', 'Notifications', 'NotificationStats'],
    }),

    // Get notification stats (total and unread count)
    getNotificationStats: builder.query<NotificationStatsResponse, void>({
      query: () => ({
        url: 'stats/',
        method: 'GET',
      }),
      providesTags: ['NotificationStats'],
    }),
  }),
});

export const {
  useGetNotificationSettingsQuery,
  useUpdateNotificationSettingsMutation,
  useGetAccountNotificationSettingsQuery,
  useUpdateAccountNotificationSettingMutation,
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useGetInboxNotificationsQuery,
  useMarkInboxNotificationAsReadMutation,
  useClearAllInboxNotificationsMutation,
  useClearInboxNotificationMutation,
  useGetNotificationStatsQuery,
} = notificationApi;
