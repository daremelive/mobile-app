/**
 * User API types
 * User profile, management, and social features
 */

import { VipLevel } from '../stream';

// Core user profile interface
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
  vip_level: VipLevel;
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

// User profile update request
export interface UpdateUserProfileRequest extends Partial<UserProfile> {}

// Block/unblock user request
export interface BlockUserRequest {
  user_id: number;
}

export interface UnblockUserRequest {
  user_id: number;
}

// Report user request
export interface ReportUserRequest {
  user_id: number;
  reason: string;
  description?: string;
}

// Profile picture upload response
export interface ProfilePictureUploadResponse {
  profile_picture_url: string;
}

// API response wrappers
export interface UserActionResponse {
  message: string;
}