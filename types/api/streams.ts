/**
 * Stream API request and response types
 * All stream-related API calls
 */

import { Stream, StreamMode, StreamChannel, ParticipantType } from '../stream';

// Create stream request
export interface CreateStreamRequest {
  title: string;
  mode: StreamMode;
  channel: StreamChannel;
  max_seats: number;
  scheduled_at?: string;
  is_recorded?: boolean;
}

// Join stream request
export interface JoinStreamRequest {
  participant_type: ParticipantType;
  seat_number?: number;
}

// Stream query parameters
export interface StreamQueryParams {
  status?: string;
  channel?: string;
  search?: string;
}

// Stream list response
export interface StreamListResponse {
  results: Stream[];
  count: number;
  next: string | null;
  previous: string | null;
}

// Stream invitation request
export interface InviteUsersToStreamRequest {
  usernames: string[];
  message?: string;
}