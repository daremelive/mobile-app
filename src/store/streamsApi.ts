import { createApi, fetchBaseQuery, BaseQueryFn } from '@reduxjs/toolkit/query/react';
import { RootState } from './index';
import Constants from 'expo-constants';
import IPDetector from '../utils/ipDetector';

const dynamicBaseQuery: BaseQueryFn = async (args, api, extraOptions) => {
  let baseUrl = 'https://daremelive.pythonanywhere.com/api/'; // Production fallback
  
  try {
    // In development mode, always use IP detector
    if (__DEV__) {
      baseUrl = await IPDetector.getAPIBaseURL();
      console.log('🔧 [DEV] Using IP detector URL:', baseUrl);
    } else {
      // In production, check for environment variables from EAS build
      const envApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL;
      
      if (envApiBaseUrl) {
        // Use environment variable from EAS build configuration
        baseUrl = envApiBaseUrl.endsWith('/api/') ? envApiBaseUrl : `${envApiBaseUrl}/api/`;
        console.log('🌐 [PROD] Using EAS environment URL:', baseUrl);
      } else {
        console.log('⚠️ [PROD] No environment variables found, using fallback:', baseUrl);
      }
    }
  } catch (error) {
    console.log('⚠️ URL detection failed, using fallback:', baseUrl, error);
  }

  // Create a temporary baseQuery with the detected URL
  const baseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.accessToken;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  });

  return baseQuery(args, api, extraOptions);
};

// Types for Stream functionality
export interface StreamHost {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  vip_level: 'basic' | 'premium' | 'vip' | 'vvip';
  profile_picture_url?: string | null;
}

export interface StreamParticipant {
  id: number;
  user: StreamHost;
  participant_type: 'host' | 'guest' | 'viewer';
  joined_at: string;
  left_at: string | null;
  is_active: boolean;
  seat_number: number | null;
}

export interface StreamMessage {
  id: number;
  user: StreamHost;
  message: string;
  message_type: string;
  created_at: string;
  gift: any | null;
  gift_quantity: number;
  gift_receiver: StreamHost | null;
}

export interface Gift {
  id: number;
  name: string;
  icon_url: string;
  cost: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SendGiftRequest {
  gift_id: number;
  recipient_user_id?: number; // Optional for multi-user streams
}

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

export interface SearchResults {
  query: string;
  results: {
    streams: SearchStream[];
    users: SearchUser[];
  };
  total_results: number;
  search_type: string;
}

export interface Stream {
  id: string;
  host: StreamHost;
  title: string;
  mode: 'single' | 'multi';
  channel: 'video' | 'game' | 'truth-or-dare' | 'banter';
  max_seats: number;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  viewer_count: number;
  total_viewers: number;
  likes_count: number;
  gifts_received: number;
  created_at: string;
  updated_at: string;
  duration: number | null;
  is_live: boolean;
  // Recording fields
  is_recorded: boolean;
  recording_url: string | null;
  recording_status: 'pending' | 'processing' | 'completed' | 'failed';
  recording_file_size: number | null;
  has_recording: boolean;
  is_recording_available: boolean;
  participants: StreamParticipant[];
  messages: StreamMessage[];
}

export interface CreateStreamRequest {
  title: string;
  mode: 'single' | 'multi';
  channel: 'video' | 'game' | 'truth-or-dare' | 'banter';
  max_seats: number;
  scheduled_at?: string;
  is_recorded?: boolean;
}

export interface JoinStreamRequest {
  participant_type: 'host' | 'guest' | 'viewer';
  seat_number?: number;
}

export interface StreamActionRequest {
  action: 'start' | 'end';
}

export interface SendMessageRequest {
  message: string;
}

// GetStream token response interface
export interface GetStreamTokenResponse {
  token: string;
  user_id: string;
  api_key: string;
  app_id: string;
}

export const streamsApi = createApi({
  reducerPath: 'streamsApi',
  baseQuery: dynamicBaseQuery,
  tagTypes: ['Stream', 'StreamMessage', 'Gift', 'Search', 'Users'],
  endpoints: (builder) => ({
    // Get all streams
    getStreams: builder.query<Stream[], { status?: string; channel?: string; search?: string }>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.status) searchParams.append('status', params.status);
        if (params.channel) searchParams.append('channel', params.channel);
        if (params.search) searchParams.append('search', params.search);
        
        return {
          url: `/streams/?${searchParams.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['Stream'],
    }),

    // Get live streams from users the current user is following
    getFollowingLiveStreams: builder.query<Stream[], void>({
      query: () => ({
        url: '/streams/?status=live&following=true',
        method: 'GET',
      }),
      providesTags: ['Stream'],
    }),

    // Get user's streams
    getMyStreams: builder.query<Stream[], void>({
      query: () => ({
        url: '/streams/my-streams/',
        method: 'GET',
      }),
      providesTags: ['Stream'],
    }),

    // Get popular live streams
    getPopularStreams: builder.query<Stream[], void>({
      query: () => ({
        url: '/streams/popular/',
        method: 'GET',
      }),
      providesTags: ['Stream'],
    }),

    // Get single stream
    getStream: builder.query<Stream, string>({
      query: (streamId) => ({
        url: `/streams/${streamId}/`,
        method: 'GET',
      }),
      providesTags: (result, error, streamId) => [{ type: 'Stream', id: streamId }],
    }),

    // Create stream
    createStream: builder.mutation<Stream, CreateStreamRequest>({
      query: (data) => ({
        url: '/streams/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Stream'],
    }),

    // Update stream
    updateStream: builder.mutation<Stream, { id: string; data: Partial<CreateStreamRequest> }>({
      query: ({ id, data }) => ({
        url: `/streams/${id}/`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Stream', id }],
    }),

    // Delete stream
    deleteStream: builder.mutation<void, string>({
      query: (streamId) => ({
        url: `/streams/${streamId}/`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Stream'],
    }),

    // Stream actions (start/end)
    streamAction: builder.mutation<{ message: string; stream?: Stream; stream_id?: string; title?: string }, { streamId: string; action: StreamActionRequest }>({
      query: ({ streamId, action }) => ({
        url: `/streams/${streamId}/action/`,
        method: 'POST',
        body: action,
      }),
      invalidatesTags: (result, error, { streamId }) => [{ type: 'Stream', id: streamId }],
    }),

    // Join stream
    joinStream: builder.mutation<{ message: string; participant: any }, { streamId: string; data: JoinStreamRequest }>({
      query: ({ streamId, data }) => ({
        url: `/streams/${streamId}/join/`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { streamId }) => [{ type: 'Stream', id: streamId }],
    }),

    // Leave stream
    leaveStream: builder.mutation<{ message: string }, string>({
      query: (streamId) => ({
        url: `/streams/${streamId}/leave/`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, streamId) => [{ type: 'Stream', id: streamId }],
    }),

    // Like stream
    likeStream: builder.mutation<{ message: string }, string>({
      query: (streamId) => ({
        url: `/streams/${streamId}/like/`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, streamId) => [{ type: 'Stream', id: streamId }],
    }),

    // Get stream messages
    getStreamMessages: builder.query<StreamMessage[], string>({
      query: (streamId) => ({
        url: `/streams/${streamId}/messages/`,
        method: 'GET',
      }),
      providesTags: (result, error, streamId) => [{ type: 'StreamMessage', id: streamId }],
    }),

    // Send message
    sendMessage: builder.mutation<StreamMessage, { streamId: string; data: SendMessageRequest }>({
      query: ({ streamId, data }) => ({
        url: `/streams/${streamId}/messages/send/`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { streamId }) => [{ type: 'StreamMessage', id: streamId }],
    }),

    // Guest management endpoints
    inviteGuest: builder.mutation<{ message: string; guest: any }, { streamId: string; username: string }>({
      query: ({ streamId, username }) => ({
        url: `/streams/${streamId}/invite/`,
        method: 'POST',
        body: { username },
      }),
    }),

    // Invite multiple users to stream
    inviteUsersToStream: builder.mutation<
      { message: string; invited_users: any[]; invitation_count: number; errors?: string[] }, 
      { streamId: string; userIds?: number[]; username?: string }
    >({
      query: ({ streamId, userIds = [], username }) => ({
        url: `/streams/${streamId}/invite-users/`,
        method: 'POST',
        body: { user_ids: userIds, username },
      }),
    }),

    acceptInvite: builder.mutation<{ message: string; participant: any }, string>({
      query: (streamId) => ({
        url: `/streams/${streamId}/accept-invite/`,
        method: 'POST',
      }),
    }),

    removeGuest: builder.mutation<{ message: string; guest_id: string }, { streamId: string; guestId: string }>({
      query: ({ streamId, guestId }) => ({
        url: `/streams/${streamId}/remove-guest/`,
        method: 'POST',
        body: { guest_id: guestId },
      }),
    }),

    // Stream controls
    toggleCamera: builder.mutation<{ message: string; camera_enabled: boolean }, { streamId: string; enabled: boolean }>({
      query: ({ streamId, enabled }) => ({
        url: `/streams/${streamId}/toggle-camera/`,
        method: 'POST',
        body: { enabled },
      }),
    }),

    toggleMicrophone: builder.mutation<{ message: string; microphone_enabled: boolean }, { streamId: string; enabled: boolean }>({
      query: ({ streamId, enabled }) => ({
        url: `/streams/${streamId}/toggle-microphone/`,
        method: 'POST',
        body: { enabled },
      }),
    }),

    // GetStream token endpoint
    getStreamToken: builder.mutation<GetStreamTokenResponse, void>({
      query: () => ({
        url: '/streams/token/',
        method: 'POST',
      }),
    }),

    // Gifts endpoints
    getGifts: builder.query<Gift[], void>({
      query: () => ({
        url: '/gifts/',
        method: 'GET',
      }),
      transformResponse: (response: { results: Gift[]; count: number; next: string | null; previous: string | null }) => {
        // Extract the results array from the paginated response
        return response.results || [];
      },
    }),

    sendGift: builder.mutation<{ message: string }, { streamId: string; data: SendGiftRequest }>({
      query: ({ streamId, data }) => ({
        url: `/streams/${streamId}/send-gift/`,
        method: 'POST',
        body: data,
      }),
    }),

    search: builder.query<SearchResults, string>({
      query: (query) => ({
        url: `/streams/search/?q=${encodeURIComponent(query)}`,
        method: 'GET',
      }),
      providesTags: ['Search', 'Users'],
    }),
  }),
});

export const {
  useGetStreamsQuery,
  useGetFollowingLiveStreamsQuery,
  useGetMyStreamsQuery,
  useGetPopularStreamsQuery,
  useGetStreamQuery,
  useCreateStreamMutation,
  useUpdateStreamMutation,
  useDeleteStreamMutation,
  useStreamActionMutation,
  useJoinStreamMutation,
  useLeaveStreamMutation,
  useLikeStreamMutation,
  useGetStreamMessagesQuery,
  useSendMessageMutation,
  useInviteGuestMutation,
  useInviteUsersToStreamMutation,
  useAcceptInviteMutation,
  useRemoveGuestMutation,
  useToggleCameraMutation,
  useToggleMicrophoneMutation,
  useGetStreamTokenMutation,
  useGetGiftsQuery,
  useSendGiftMutation,
  useSearchQuery,
} = streamsApi; 