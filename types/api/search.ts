/**
 * Search API types
 * Search functionality for users and streams
 */

import { Stream, StreamHost } from '../stream';

// Search user result
export interface SearchUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  profile_picture_url: string | null;
  is_following: boolean;
  follower_count: number;
  following_count: number;
  is_online: boolean;
}

// Search stream result
export interface SearchStream {
  id: string;
  title: string;
  channel: string;
  mode: 'single' | 'multi';
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  viewer_count: number;
  total_participant_count: number;
  host: StreamHost;
  created_at: string;
  started_at: string | null;
}

// Search results response
export interface SearchResults {
  query: string;
  results: {
    streams: SearchStream[];
    users: SearchUser[];
  };
  total_results: number;
  search_type: string;
}