/**
 * Follow API types
 * User following, followers, and discovery
 */

// === User List Item ===
export interface UserListItem {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  profile_picture_url?: string;
  followers_count: string; // Backend returns formatted string like "12k"
  is_following: boolean;
  is_live: boolean;
}

// === User Profile (Follow Context) ===
export interface FollowUserProfile {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  profile_picture_url?: string;
  followers_count: number;
  following_count: number;
  is_following: boolean;
  vip_level: string;
  is_content_creator: boolean;
}

// === Follow Requests ===
export interface FollowRequest {
  user_id: number;
}

export interface UnfollowRequest {
  user_id: number;
}

// === Follow Responses ===
export interface FollowResponse {
  message: string;
  is_following: boolean;
}

export interface FollowListResponse {
  results: UserListItem[];
  count: number;
  next: string | null;
  previous: string | null;
}

// === Query Parameters ===
export interface FollowQueryParams {
  search?: string;
}

export interface DiscoverUsersParams {
  search?: string;
}

export interface GetFollowingParams {
  search?: string;
}

export interface GetFollowersParams {
  search?: string;
}

// === User Discovery ===
export interface DiscoverUsersResponse extends FollowListResponse {}

// === Legacy/Backward Compatibility ===
// Keep these for backward compatibility
export interface UserProfile extends FollowUserProfile {}