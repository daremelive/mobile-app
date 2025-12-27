import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from './index';
import { API_BASE_URL } from '../config/env';

import {
  Stream,
  StreamHost,
  StreamParticipant,
  StreamMessage,
  Gift
} from '../../types/stream';

import {
  CreateStreamRequest,
  JoinStreamRequest,
  StreamQueryParams
} from '../../types/api/streams';

import {
  SearchResults,
  SearchUser,
  SearchStream
} from '../../types/api/search';

import {
  StreamActionRequest,
  SendMessageRequest,
  SendGiftRequest
} from '../../types/stream/actions';

import type {
  ParticipantSummary,
  GuestInvitationMetadata,
} from '../../types/services/websocket';

interface GuestInvitationResponse {
  message: string;
  guest: ParticipantSummary;
  invitation: GuestInvitationMetadata;
}

interface GuestPromotionResponse {
  message: string;
  participant: ParticipantSummary;
}

import {
  GetStreamTokenResponse
} from '../../types/api';

// Base query with production-optimized timeouts and retry logic
const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  timeout: __DEV__ ? 15000 : 45000, // Extended timeout for production (45s)
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    // Add production-specific headers for better connectivity
    if (!__DEV__) {
      headers.set('Connection', 'keep-alive');
      headers.set('Keep-Alive', 'timeout=30, max=100');
    }
    return headers;
  },
});

export const streamsApi = createApi({
  reducerPath: 'streamsApi',
  baseQuery: baseQuery,
  tagTypes: ['Stream', 'UserStreams', 'FollowingStreams', 'PopularStreams', 'StreamMessage', 'Search', 'Users'],
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
      query: (streamId) => {
        // Validate streamId before making request
        if (!streamId || typeof streamId !== 'string' || streamId.trim().length === 0) {
          throw new Error('Invalid streamId provided to getStream');
        }
        
        // Only run expensive UUID validation in development
        if (__DEV__) {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(streamId)) {
            throw new Error(`Invalid UUID format for streamId: ${streamId}`);
          }
        }
        
        return {
          url: `/streams/${streamId}/`,
          method: 'GET',
        };
      },
      providesTags: (result, error, streamId) => [{ type: 'Stream', id: streamId }],
    }),

        // Create a new stream with production timeout
    createStream: builder.mutation<Stream, CreateStreamRequest>({
      query: (data) => ({
        url: '/streams/',
        method: 'POST',
        body: data,
        // Extended timeout for stream creation in production
        timeout: __DEV__ ? 15000 : 45000,
      }),
      invalidatesTags: ['Stream', 'UserStreams'],
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
      query: ({ streamId, action }) => {
        // Validate streamId before making request
        if (!streamId || typeof streamId !== 'string' || streamId.trim().length === 0) {
          throw new Error('Invalid streamId provided to streamAction');
        }
        
        // Only run expensive UUID validation in development
        if (__DEV__) {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(streamId)) {
            throw new Error(`Invalid UUID format for streamId: ${streamId}`);
          }
        }
        
        return {
          url: `/streams/${streamId}/action/`,
          method: 'POST',
          body: action,
          // Critical for stream start/end actions in production
          timeout: __DEV__ ? 15000 : 45000,
        };
      },
      invalidatesTags: (result, error, { streamId, action }) => {
        // For end actions, invalidate all stream lists to refresh UI
        if (action.action === 'end') {
          return ['Stream'];  // This invalidates all Stream queries
        }
        return [{ type: 'Stream', id: streamId }];
      },
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
      query: (streamId) => {
        // Validate streamId before making request
        if (!streamId || typeof streamId !== 'string' || streamId.trim().length === 0) {
          throw new Error('Invalid streamId provided to getStreamMessages');
        }
        
        // Only run expensive UUID validation in development
        if (__DEV__) {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(streamId)) {
            throw new Error(`Invalid UUID format for streamId: ${streamId}`);
          }
        }
        
        return {
          url: `/streams/${streamId}/messages/`,
          method: 'GET',
        };
      },
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
    inviteGuest: builder.mutation<GuestInvitationResponse, { streamId: string; username: string }>({
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

    acceptInvite: builder.mutation<GuestPromotionResponse, string>({
      query: (streamId) => ({
        url: `/streams/${streamId}/accept-invite/`,
        method: 'POST',
      }),
    }),

    declineInvite: builder.mutation<{ message: string }, string>({
      query: (streamId) => ({
        url: `/streams/${streamId}/decline-invitation/`,
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

    removeParticipant: builder.mutation<{ message: string; participant_id: string }, { streamId: string; participantId: string }>({
      query: ({ streamId, participantId }) => ({
        url: `/streams/${streamId}/remove-participant/`,
        method: 'POST',
        body: { participant_id: participantId },
      }),
    }),

    // Seamless promotion
    promoteViewerToGuest: builder.mutation<GuestPromotionResponse, { streamId: string; userId: number }>({
      query: ({ streamId, userId }) => ({
        url: `/streams/${streamId}/promote-viewer/`,
        method: 'POST',
        body: { user_id: userId },
      }),
      invalidatesTags: (result, error, { streamId }) => [{ type: 'Stream', id: streamId }],
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

    // GetStream token endpoint with extended timeout for production
    getStreamToken: builder.mutation<GetStreamTokenResponse, void>({
      query: () => ({
        url: '/streams/token/',
        method: 'POST',
        // Critical endpoint - extend timeout even further for production
        timeout: __DEV__ ? 15000 : 60000, // 60s for production token fetch
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
      keepUnusedDataFor: 0, // Don't cache search results
    }),

    // Emergency cleanup mutation - ends all active streams for the user
    emergencyCleanupStreams: builder.mutation<{message: string, streams_ended: number}, void>({
      query: () => ({
        url: '/streams/cleanup/',
        method: 'POST',
      }),
      invalidatesTags: ['Stream'],  // Invalidate all stream queries after cleanup
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
  useDeclineInviteMutation,
  useRemoveGuestMutation,
  useRemoveParticipantMutation,
  usePromoteViewerToGuestMutation,
  useToggleCameraMutation,
  useToggleMicrophoneMutation,
  useGetStreamTokenMutation,
  useGetGiftsQuery,
  useSendGiftMutation,
  useSearchQuery,
  useEmergencyCleanupStreamsMutation,
} = streamsApi;


export type {
  Stream,
  StreamHost,
  StreamParticipant,
  StreamMessage,
  Gift
} from '../../types/stream';

export type {
  CreateStreamRequest,
  JoinStreamRequest
} from '../../types/api/streams';

export type {
  StreamActionRequest,
  SendMessageRequest,
  SendGiftRequest
} from '../../types/stream/actions';

export type {
  SearchResults,
  SearchUser,
  SearchStream
} from '../../types/api/search';

export type {
  GetStreamTokenResponse
} from '../../types/api'; 