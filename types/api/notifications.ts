/**
 * Notification API types
 * Push notifications, in-app notifications, and notification settings
 */

// === User for Notifications ===
export interface NotificationUser {
  id: number;
  username: string;
  email: string;
  profile_picture_url?: string;
}

export interface NotificationSender {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  profile_picture_url?: string;
}

// === Notification Settings ===
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
  following_user: NotificationUser;
  live_notifications: boolean;
  new_content_notifications: boolean;
  created_at: string;
  updated_at: string;
}

// === Notifications ===
export type NotificationType = 
  | 'follow' 
  | 'live_start' 
  | 'live_end' 
  | 'stream_invite' 
  | 'reward' 
  | 'gift' 
  | 'new_content' 
  | 'system'
  | 'announcement'
  | 'profile_activity';

export interface InboxNotification {
  id: number;
  recipient: number;
  sender?: NotificationSender;
  notification_type: NotificationType;
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
  notification_type: NotificationType;
  is_read: boolean;
  created_at: string;
  sender_username?: string;
  sender_avatar?: string;
}

// === Request Types ===
export interface UpdateNotificationSettingsRequest extends Partial<Omit<NotificationSetting, 'id' | 'user' | 'created_at' | 'updated_at'>> {}

export interface UpdateAccountNotificationSettingRequest {
  following_user_id: number;
  data: Partial<Omit<AccountNotificationSetting, 'id' | 'user' | 'following_user' | 'created_at' | 'updated_at'>>;
}

export interface NotificationQueryParams {
  page?: number;
  page_size?: number;
}

export interface InboxNotificationQueryParams {
  page?: number;
  page_size?: number;
}

// === Response Types ===
export interface NotificationListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Notification[];
}

export interface InboxNotificationListResponse {
  notifications: InboxNotification[];
  total_count: number;
  has_next: boolean;
}

export interface AccountNotificationSettingsResponse {
  results: AccountNotificationSetting[];
}

export interface NotificationStatsResponse {
  total_notifications: number;
  unread_notifications: number;
}

export interface NotificationActionResponse {
  message: string;
}

export interface NotificationReadResponse {
  message: string;
  notification_id: number;
}

// === Clear Notification Types ===
export interface ClearNotificationResponse {
  message: string;
}

export interface MarkAllReadResponse {
  message: string;
}