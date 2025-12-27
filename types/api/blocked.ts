/**
 * Blocked Users API types
 * User blocking and unblocking functionality
 */

// === Blocked User ===
export interface BlockedUserInfo {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  profile_picture_url?: string;
  followers_count: string;
  is_following: boolean;
  is_live: boolean;
}

export interface BlockedUser {
  id: number;
  blocked_user: BlockedUserInfo;
  created_at: string;
}

// === Request Types ===
export interface BlockUserRequest {
  user_id: number;
  reason?: string;
}

export interface UnblockUserRequest {
  user_id: number;
}

// === Response Types ===
export interface BlockedUsersResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: BlockedUser[];
}

export interface BlockedUsersCountResponse {
  count: number;
}

export interface BlockUserResponse {
  message?: string;
  status?: string;
}

export interface UnblockUserResponse {
  message?: string;
  status?: string;
}

// === Search Parameters ===
export interface SearchBlockedUsersParams {
  search: string;
}