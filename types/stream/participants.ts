/**
 * Stream participant types
 * Participant management and seat handling
 */

import { ParticipantType, StreamHost } from './index';

// Participant with seat info
export interface ParticipantWithSeat {
  id: string;
  user: StreamHost;
  participant_type: ParticipantType;
  seat_number?: number;
  camera_enabled: boolean;
  microphone_enabled: boolean;
  is_local?: boolean;
  has_video?: boolean;
  has_audio?: boolean;
}

// Participant list item
export interface ParticipantListItem {
  id: string;
  username: string;
  full_name: string;
  profile_picture_url?: string;
  participant_type: ParticipantType;
  is_active: boolean;
  joined_at: string;
}

// Seat management
export interface SeatInfo {
  number: number;
  is_occupied: boolean;
  participant?: ParticipantWithSeat;
  is_available: boolean;
}

// Multi-participant stream data
export interface MultiParticipantData {
  max_seats: number;
  occupied_seats: number;
  available_seats: SeatInfo[];
  participants: ParticipantWithSeat[];
}