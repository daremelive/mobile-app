import { createApi, fetchBaseQuery, BaseQueryFn } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';
import IPDetector from '../utils/ipDetector';

// Dynamic base query that handles IP detection
const dynamicBaseQuery: BaseQueryFn = async (args, api, extraOptions) => {
  let baseUrl = 'http://172.20.10.3:8000/api/notifications/'; // Default fallback
  
  if (__DEV__) {
    try {
      baseUrl = await IPDetector.getAPIBaseURL('notifications');
      console.log('🔗 [NotificationAPI] Using detected URL:', baseUrl);
    } catch (error) {
      console.error('❌ [NotificationAPI] IP detection failed, using fallback:', error);
    }
  }
  
  // Create a temporary baseQuery with the detected URL
  const baseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: async (headers) => {
      try {
        const token = await SecureStore.getItemAsync('accessToken');
        if (token) {
          headers.set('authorization', `Bearer ${token}`);
        }
      } catch (error) {
        console.error('❌ [NotificationAPI] Error getting auth token:', error);
      }
      return headers;
    },
  });
  
  return baseQuery(args, api, extraOptions);
};

export interface NotificationSetting {
  id: number;
  user: number;
  live_notifications: boolean;
  reward_notifications: boolean;
  push_notifications: boolean;
  email_notifications: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  created_at: string;
  updated_at: string;
}

export interface AccountNotificationSetting {
  id: number;
  user: number;
  following_user: {
    id: number;
    username: string;
    email: string;
    avatar?: string;
  };
  live_notifications: boolean;
  new_content_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface InboxNotification {
  id: number;
  recipient: number;
  sender?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    profile_picture_url?: string;
  };
  notification_type: 'follow' | 'live_start' | 'live_end' | 'stream_invite' | 'reward' | 'gift' | 'new_content' | 'system';
  title: string;
  message: string;
  extra_data: Record<string, any>;
  is_read: boolean;
  is_sent: boolean;
  created_at: string;
  read_at?: string;
}

export interface Notification {
  id: number;
  user: number;
  title: string;
  message: string;
  notification_type: 'follow' | 'live_start' | 'reward' | 'announcement' | 'profile_activity';
  is_read: boolean;
  created_at: string;
  sender_username?: string;
  sender_avatar?: string;
}

export const notificationApi = createApi({
  reducerPath: 'notificationApi',
  baseQuery: dynamicBaseQuery,
  tagTypes: ['NotificationSettings', 'AccountNotificationSettings', 'Notifications'],
  endpoints: (builder) => ({
    // Get user's notification settings
    getNotificationSettings: builder.query<NotificationSetting, void>({
      query: () => 'settings/',
      providesTags: ['NotificationSettings'],
    }),

    // Update user's notification settings
    updateNotificationSettings: builder.mutation<
      NotificationSetting,
      Partial<Omit<NotificationSetting, 'id' | 'user' | 'created_at' | 'updated_at'>>
    >({
      query: (data) => ({
        url: 'settings/',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['NotificationSettings'],
    }),

    // Get account notification settings (for specific followed users)
    getAccountNotificationSettings: builder.query<AccountNotificationSetting[], void>({
      query: () => 'account-settings/',
      transformResponse: (response: { results: AccountNotificationSetting[] }) => response.results,
      providesTags: ['AccountNotificationSettings'],
    }),

    // Update account notification setting for a specific followed user
    updateAccountNotificationSetting: builder.mutation<
      AccountNotificationSetting,
      { 
        following_user_id: number;
        data: Partial<Omit<AccountNotificationSetting, 'id' | 'user' | 'following_user' | 'created_at' | 'updated_at'>>;
      }
    >({
      query: ({ following_user_id, data }) => ({
        url: `account-settings/${following_user_id}/`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['AccountNotificationSettings'],
    }),

    // Get user's notifications
    getNotifications: builder.query<
      { 
        count: number;
        next: string | null;
        previous: string | null;
        results: Notification[];
      },
      { page?: number; page_size?: number } | void
    >({
      query: (params) => ({
        url: 'list/',
        params: params || {},
      }),
      providesTags: ['Notifications'],
    }),

    // Mark notification as read
    markNotificationAsRead: builder.mutation<Notification, number>({
      query: (notificationId) => ({
        url: `${notificationId}/mark-read/`,
        method: 'POST',
      }),
      invalidatesTags: ['Notifications'],
    }),

    // Mark all notifications as read
    markAllNotificationsAsRead: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: 'mark-all-read/',
        method: 'POST',
      }),
      invalidatesTags: ['Notifications'],
    }),

    // Get user's notification inbox (in-app notifications)
    getInboxNotifications: builder.query<InboxNotification[], void>({
      query: () => ({
        url: 'inbox/',
        method: 'GET',
      }),
      providesTags: ['InboxNotifications'],
    }),

    // Mark inbox notification as read
    markInboxNotificationAsRead: builder.mutation<{ message: string; notification_id: number }, number>({
      query: (notificationId) => ({
        url: `inbox/${notificationId}/read/`,
        method: 'PATCH',
      }),
      invalidatesTags: ['InboxNotifications', 'Notifications'],
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
} = notificationApi;
