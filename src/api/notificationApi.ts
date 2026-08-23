import { createApi } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../config/env';
import { createAuthenticatedBaseQuery } from './authenticatedBaseQuery';

// Import centralized types
import type {
  NotificationSetting,
  AccountNotificationSetting,
  InboxNotification,
  Notification,
  UpdateNotificationSettingsRequest,
  UpdateAccountNotificationSettingRequest,
  InboxNotificationQueryParams,
  InboxNotificationListResponse,
  AccountNotificationSettingsResponse,
  NotificationStatsResponse,
  NotificationActionResponse,
  NotificationReadResponse,
  ClearNotificationResponse,
} from '../../types/api/notifications';

// Re-export for backward compatibility
export type {
  NotificationSetting,
  AccountNotificationSetting,
  InboxNotification,
  Notification,
};

// Create base query for notification endpoints
const baseQuery = createAuthenticatedBaseQuery(`${API_BASE_URL}notifications/`);

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
  useGetInboxNotificationsQuery,
  useMarkInboxNotificationAsReadMutation,
  useClearAllInboxNotificationsMutation,
  useClearInboxNotificationMutation,
  useGetNotificationStatsQuery,
} = notificationApi;
