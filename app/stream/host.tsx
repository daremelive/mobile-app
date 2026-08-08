import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, ActivityIndicator, Text, SafeAreaView, Share, Alert, TouchableOpacity, TouchableWithoutFeedback, Keyboard, AppState, Platform } from 'react-native';
import { ScreenCapturePickerView } from '@stream-io/react-native-webrtc';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser, selectAccessToken } from '../../src/store/authSlice';
import { StreamHeader, StreamChatOverlay, StreamInputBar, MultiParticipantInputBar, StreamControls, useStreamState, useHybridStreamChat, useGiftAnimations, useEndStream, EndStreamModal, MembersListModal } from '../../components/stream';
import { StreamVideo, StreamCall, useCallStateHooks, VideoRenderer, hasVideo, hasAudio, ScreenShareToggleButton, useScreenShareButton } from '@stream-io/video-react-native-sdk';
import { API_BASE_URL, MEDIA_BASE_URL, buildProfilePictureURL, buildAvatarFallbackURL } from '../../src/config/env';
import { useGetProfileQuery } from '../../src/store/authApi';
import { useGetUserStreamPrivilegesQuery } from '../../src/api/levelsApi';
import { useCreateStreamMutation, useStreamActionMutation, useInviteUsersToStreamMutation, streamsApi } from '../../src/store/streamsApi';
import GiftAnimation from '../../components/animations/GiftAnimation';
import {
  StreamMode,
  StreamChannel,
  RealtimeMessages
} from '../../types/stream';
import { logger } from '../../src/utils/logger';

/**
 * Raises the system screen-broadcast picker as soon as the call is live.
 *
 * On iOS this is the OS sheet driven by ScreenCapturePickerView; on Android
 * the SDK shows the equivalent system dialog. Either way the picker needs a
 * joined call behind it, so the broadcast step lives on the host screen rather
 * than as its own route ahead of it. Declared at module scope so the
 * "already prompted" ref survives the host screen re-rendering.
 */
const ScreenBroadcastPrompt = () => {
  const pickerRef = useRef(null);
  const { onPress } = useScreenShareButton(pickerRef);
  const hasPrompted = useRef(false);

  useEffect(() => {
    // onPress stays undefined until the call reports screensharing as enabled.
    if (!onPress || hasPrompted.current) return;
    hasPrompted.current = true;
    onPress();
  }, [onPress]);

  return Platform.OS === 'ios' ? <ScreenCapturePickerView ref={pickerRef} /> : null;
};

function UnifiedHostStreamScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser) as any;
  const accessToken = useSelector(selectAccessToken);

  const streamIdFromParams = (params.id as string) || '';
  const titleFromParams = (params.title as string) || '';
  const channel = (params.channel as string) || 'video';
  const maxSeats = parseInt((params.maxSeats as string) || '6');
  const fromTitleScreen = params.fromTitleScreen === 'true';
  // Guests picked on the title screen, invited once the stream exists.
  const pendingGuestIds = ((params.guestIds as string) || '')
    .split(',')
    .map((id) => parseInt(id, 10))
    .filter((id) => Number.isFinite(id) && id > 0);

  const modeFromParams = (params.mode as string) || '';
  const [streamMode, setStreamMode] = useState<StreamMode>(
    modeFromParams === 'multi' ? 'multi' : 'single'
  );

  const [streamId, setStreamId] = useState(streamIdFromParams);
  const [title, setTitle] = useState(titleFromParams);
  const [isCreatingStream, setIsCreatingStream] = useState(false);
  const [realtimeMessages, setRealtimeMessages] = useState<RealtimeMessages>([]);

  const { data: freshUserData } = useGetProfileQuery();
  const userData = freshUserData || currentUser;

  // Screen broadcast is a per-channel capability set in the admin, not a
  // property of the channel's name — so read it from the channel record.
  const { data: privileges } = useGetUserStreamPrivilegesQuery();
  const allowsScreenShare = Boolean(
    privileges?.accessible_channels?.find(ch => ch.code === channel)?.allow_screen_share
  );

  // A single game stream broadcasts the screen, so it opens with the system
  // broadcast picker rather than the camera. Multi-live is unaffected.
  const requiresScreenBroadcast =
    streamMode === 'single' && (channel === 'game' || allowsScreenShare);

  const [createStream] = useCreateStreamMutation();
  const [streamAction] = useStreamActionMutation();
  const [inviteUsersToStream] = useInviteUsersToStreamMutation();
  const [profilePictureUrl, setProfilePictureUrl] = useState<string>('');
  const [membersModalVisible, setMembersModalVisible] = useState(false);

  // Memoize the useStreamState parameters to prevent unnecessary re-renders
  const streamStateParams = useMemo(() => ({
    streamId: streamId,
    userRole: 'host' as const
  }), [streamId]);

  const streamStateHook = useStreamState(streamStateParams);
  const {
    // State properties
    streamClient,
    call,
    hasJoined,
    isConnecting,
    isOperationInProgress,
    connectionState,
    videoLoadError,

    // Actions
    initializeStream,
    handleLeaveStream,
    resetConnectionState,
    refetchStreamDetails,

    // Data
    streamData: streamDetails,
    messagesData: streamMessages
  } = streamStateHook;

  const chat = useHybridStreamChat({
    streamId,
    streamTitle: title || streamDetails?.title || `${streamMode === 'multi' ? 'Multi ' : ''}Live Stream`,
    userId: userData?.id?.toString(),
    username: userData?.username,
    isHost: true,
    hostId: streamDetails?.host?.id?.toString() || userData?.id?.toString(),
    profilePicture: '',
    useStreamChat: true,
    baseURL: API_BASE_URL,
  });

  const initialHeartbeatSent = useRef(false);

  const allMessages = React.useMemo(() => {
    const chatMessages = chat.messages || [];
    const safeRealtimeMessages = Array.isArray(realtimeMessages) ? realtimeMessages : [];

    // Transform RealtimeMessage to match the expected interface
    const transformedRealtimeMessages = safeRealtimeMessages.map((msg: any) => ({
      ...msg,
      timestamp: msg.created_at || msg.timestamp, // Add timestamp field from created_at
    }));

    // Combine and sort by timestamp (same as viewer)
    const combined = [...chatMessages, ...transformedRealtimeMessages];

    // Remove duplicates and sort by timestamp
    const uniqueMessages = combined.filter((message, index, array) => {
      const firstIndex = array.findIndex(msg => msg.id === message.id);
      return firstIndex === index;
    });

    // Sort by timestamp
    return uniqueMessages.sort((a, b) => {
      const getTimestamp = (msg: any) => {
        if (msg.timestamp instanceof Date) {
          return msg.timestamp.getTime();
        }

        if (typeof msg.timestamp === 'string') {
          const parsed = new Date(msg.timestamp);
          return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
        }

        if (typeof msg.timestamp === 'number') {
          return msg.timestamp > 1000000000000 ? msg.timestamp : msg.timestamp * 1000;
        }

        return 0;
      };

      const timeA = getTimestamp(a);
      const timeB = getTimestamp(b);
      return timeA - timeB;
    });
  }, [chat.messages, realtimeMessages, chat.chatProvider, streamDetails?.host?.id, userData?.id]);

  const giftAnimations = useGiftAnimations({
    messages: allMessages || [],
    baseURL: MEDIA_BASE_URL,
  });

  React.useEffect(() => {
  }, [giftAnimations.activeGiftAnimations, allMessages]);

  const endStreamSystem = useEndStream({
    streamId,
    onStreamEnd: () => {
      if (call) {
        call.leave().catch(logger.error);
      }
      handleLeaveStream();
      initialHeartbeatSent.current = false;
    },
  });

  useEffect(() => {
    if (!userData?.id) return;

    const cleanupOrphanedStreams = async () => {
      try {

        // Get user's streams to check if any are stuck live
        const response = await fetch(`${API_BASE_URL}/streams/my-streams/`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const liveStreams = data.results?.filter((s: any) => s.status === 'live') || [];

          if (liveStreams.length > 0) {
            // End each orphaned stream
            for (const orphanStream of liveStreams) {
              // Only clean up if it's not the current stream we're about to start
              if (orphanStream.id !== streamId) {
                try {
                  await streamAction({
                    streamId: orphanStream.id,
                    action: { action: 'end' }
                  }).unwrap();
                } catch (error) {
                  // Don't fail if cleanup fails
                }
              }
            }

            dispatch(streamsApi.util.invalidateTags(['Stream']));
          }
        }
      } catch (error) {
        // Don't fail if check fails
      }
    };

    cleanupOrphanedStreams();
  }, [userData?.id, accessToken, streamAction, dispatch, streamId]);

  const messages = allMessages || []; // Use combined real-time + chat messages

  // Auto-detect mode from existing stream details if not set
  useEffect(() => {
    if (streamDetails && !modeFromParams) {
      const detectedMode = streamDetails.mode || (streamDetails.max_seats && streamDetails.max_seats > 1 ? 'multi' : 'single');
      setStreamMode(detectedMode);
    }
  }, [streamDetails, modeFromParams]);

  // Monitor stream status for disconnection detection
  const previousStreamStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (streamDetails?.status) {
      const currentStatus = streamDetails.status;
      const previousStatus = previousStreamStatusRef.current;

      // Only auto-show end modal in development or if the user explicitly ended the stream
      if (previousStatus === 'live' && currentStatus === 'ended' && __DEV__) {
        // Show the modal with "already ended" context
        setTimeout(() => {
          endStreamSystem.showEndStreamModal();
        }, 1000); // Brief delay to let any animations finish
      } else if (previousStatus === 'live' && currentStatus === 'ended' && !__DEV__) {
        // In production, just log the status change but don't auto-show modal
        // This prevents network hiccups from ending streams prematurely
      }

      previousStreamStatusRef.current = currentStatus;
    }
  }, [streamDetails?.status, endStreamSystem]);

  useEffect(() => {
    const createStreamFromTitleScreen = async () => {
      if (fromTitleScreen && !streamId && userData?.id && !isCreatingStream) {
        setIsCreatingStream(true);

        try {
          // Check if user has uploaded a profile picture before creating stream
          const hasProfilePicture = !!(
            userData?.profile_picture_url ||
            userData?.profile_picture
          );

          if (!hasProfilePicture) {
            Alert.alert(
              'Profile Picture Required',
              'To create a professional stream experience, please upload your profile picture first. This helps viewers connect with you and makes your stream look amazing!',
              [
                { text: 'Cancel', onPress: () => router.back() },
                {
                  text: 'Upload Photo',
                  onPress: () => {
                    router.replace('/(tabs)/profile');
                  }
                }
              ]
            );
            return;
          }

          const streamData = {
            title: titleFromParams.trim() || `${userData.username || 'User'}'s ${streamMode === 'multi' ? 'Multi ' : ''}Live Stream`,
            mode: streamMode,
            channel: channel as StreamChannel,
            max_seats: streamMode === 'multi' ? maxSeats : 1,
          };

          const newStream = await createStream(streamData).unwrap();

          setStreamId(newStream.id);
          setTitle(newStream.title);

          if (pendingGuestIds.length > 0) {
            try {
              await inviteUsersToStream({
                streamId: newStream.id,
                userIds: pendingGuestIds,
              }).unwrap();
            } catch (inviteError) {
              // The stream is already live at this point, so a failed invite
              // must not take the host back out of it — they can re-invite
              // from the guest list.
              logger.error('Failed to invite guests picked on the title screen', inviteError);
            }
          }

        } catch (error: any) {
          // Determine specific error message
          let errorMessage = 'Failed to create stream. Please try again.';

          if (error?.data?.error) {
            errorMessage = error.data.error;
          } else if (error?.data?.detail) {
            errorMessage = error.data.detail;
          } else if (error?.message) {
            errorMessage = error.message;
          } else if (error?.status === 401) {
            errorMessage = 'Authentication failed. Please log in again.';
          } else if (error?.status === 403) {
            errorMessage = 'Your account doesn\'t have permission to create streams. Please upgrade your tier level.';
          } else if (error?.status === 400) {
            errorMessage = 'Invalid stream data. Please check your settings and try again.';
          }

          Alert.alert(
            'Stream Creation Failed',
            errorMessage,
            [
              { text: 'Go Back', onPress: () => router.back() },
              { text: 'Retry', onPress: () => createStreamFromTitleScreen() }
            ]
          );
        } finally {
          setIsCreatingStream(false);
        }
      }
    };

    createStreamFromTitleScreen();
  }, [fromTitleScreen, userData?.id, titleFromParams, channel, maxSeats, streamMode]);

  const handleShare = async () => {
    try {
      const shareUrl = `${MEDIA_BASE_URL}/stream/${streamId}?utm_source=mobile_share&utm_medium=social&host=${userData?.username}`;

      const modeText = streamMode === 'multi' ? 'multi-live stream' : 'live stream';
      const channelText = streamMode === 'multi' ? `\n\nChannel: ${channel}` : '';

      await Share.share({
        message: `Join my ${modeText} on DareMe! 🔴\n\n"${title || `${streamMode === 'multi' ? 'Multi ' : ''}Live Stream`}"${channelText}\n\n${shareUrl}`,
        url: shareUrl,
        title: `${userData?.first_name || userData?.username}'s ${streamMode === 'multi' ? 'Multi ' : ''}Live Stream`
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share stream');
    }
  };

  const getProfilePictureUrl = () => {
    if (userData?.profile_picture_url) {
      return userData.profile_picture_url;
    }

    if (userData?.profile_picture) {
      if (userData.profile_picture.startsWith('http')) {
        return userData.profile_picture;
      }
      return buildProfilePictureURL(userData.profile_picture);
    }

    const name = userData?.first_name || userData?.username || 'User';
    return buildAvatarFallbackURL(name);
  };

  useEffect(() => {
    setProfilePictureUrl(getProfilePictureUrl());
  }, [userData?.profile_picture, userData?.profile_picture_url]);

  // Initialize stream when user data and stream ID are available  
  useEffect(() => {
    if (currentUser?.id && streamId && !hasJoined && !isOperationInProgress) {
      initializeStream();
    }
  }, [currentUser?.id, streamId]); // Remove hasJoined and isOperationInProgress from deps to prevent re-initialization

  useEffect(() => {
    // Heartbeat system disabled - no initial heartbeat needed
    // Streams will persist until manually ended
  }, [hasJoined, streamId, streamAction, dispatch]);

  useEffect(() => {
    if (!streamId || !hasJoined) return;

    let backgroundTimer: number | null = null;
    let isCleanupInProgress = false;
    let cleanupExecuted = false; // Prevent multiple cleanup executions
    let backgroundStartTime: number | null = null; // Track when app went to background

    const executeStreamCleanup = async (reason: string) => {
      if (isCleanupInProgress || cleanupExecuted) {
        return;
      }

      isCleanupInProgress = true;
      cleanupExecuted = true;

      try {
        // Direct API call for immediate cleanup (more reliable than endStreamSystem for force close)
        await streamAction({
          streamId,
          action: { action: 'end' }
        }).unwrap();

        dispatch(streamsApi.util.invalidateTags(['Stream']));

        if (call) {
          call.leave().catch(logger.error);
        }

      } catch (error: any) {

        dispatch(streamsApi.util.invalidateTags(['Stream']));

        // Always leave the call regardless of API success
        if (call) {
          call.leave().catch(logger.error);
        }

        // Don't retry for any error - just mark as complete
        // User experience is more important than perfect cleanup
        cleanupExecuted = true;

      } finally {
        isCleanupInProgress = false;
      }
    };

    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background') {
        backgroundStartTime = Date.now();
        // Heartbeat system disabled - no automatic cleanup on background
        // Stream will persist when app is backgrounded

      } else if (nextAppState === 'inactive') {
        // iOS specific - don't cleanup immediately on inactive
        // This happens during notifications, control center, etc.

      } else if (nextAppState === 'active') {
        // Clear any pending cleanup timer
        if (backgroundTimer) {
          clearTimeout(backgroundTimer);
          backgroundTimer = null;
        }

        // Check if we need to reinitialize after returning from background
        if (backgroundStartTime && hasJoined && !cleanupExecuted) {
          const timeInBackground = Date.now() - backgroundStartTime;

          // If we were in background for more than 5 seconds, reinitialize camera
          if (timeInBackground > 5000) {
            // First reset the connection state if call doesn't exist
            if (!call) {
              resetConnectionState();
              // Then reinitialize
              setTimeout(() => {
                initializeStream();
              }, 100);
            } else {
              // Try to re-enable camera and microphone on existing call
              call.camera.enable().catch((err: any) => {
                // Silent fail
              });
              call.microphone.enable().catch((err: any) => {
                // Silent fail
              });
            }
          }
        }

        backgroundStartTime = null;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();

      if (backgroundTimer) {
        clearTimeout(backgroundTimer);
      }

      initialHeartbeatSent.current = false;

      if (hasJoined && streamId && !cleanupExecuted) {
        cleanupExecuted = true;

        // Additional safety: Only end stream if we're actually the host
        // and this is a genuine component unmount, not a state change

        streamAction({
          streamId,
          action: { action: 'end' }
        }).unwrap()
          .then(() => {
            dispatch(streamsApi.util.invalidateTags(['Stream']));
          })
          .catch((error) => {
            dispatch(streamsApi.util.invalidateTags(['Stream']));
          });

        if (call) {
          call.leave().catch(logger.error);
        }
      }
    };
  }, [streamId, hasJoined, call, initializeStream, resetConnectionState]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    await chat.sendMessage(message.trim());
  };

  const handleAddParticipant = () => {
    setMembersModalVisible(true);
  };

  // Single participant video component
  const SingleParticipantVideo = () => {
    if (!call || !streamClient) return null;
    const { useParticipants } = useCallStateHooks();
    const participants = useParticipants();
    const local = participants.find((p: any) => p.isLocalParticipant);
    return (
      <View className="flex-1 bg-black">
        {local ? (
          <VideoRenderer participant={local} objectFit="cover" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-white/60 text-sm">Initializing camera…</Text>
          </View>
        )}
      </View>
    );
  };

  // Multi-participant video grid component
  const MultiParticipantVideoGrid = () => {
    const { useParticipants, useCallSettings } = useCallStateHooks();
    const participants = useParticipants();
    const callSettings = useCallSettings();

    // Get list of guest user IDs from backend data (streamDetails is from parent scope)
    // This is the SOURCE OF TRUTH for who is a guest vs viewer
    const guestUserIds = useMemo(() => {
      const guests = streamDetails?.participants?.filter(
        (p: any) => p.participant_type === 'guest' && p.is_active && p.user
      ) || [];
      return guests.map((p: any) => p.user.id?.toString() || p.user.toString());
    }, [streamDetails?.participants]);

    const localParticipant = participants.find((p: any) => p.isLocalParticipant);
    const remoteParticipants = participants.filter((p: any) => !p.isLocalParticipant);

    // For the HOST screen, show participants who are GUESTS (promoted) according to backend
    // This is more reliable than checking published tracks which can have timing issues
    const activeRemoteParticipants = remoteParticipants.filter((p: any) => {
      // PRIMARY CHECK: Is this user a guest according to backend?
      const participantUserId = p.userId?.toString();
      const isGuestAccordingToBackend = guestUserIds.includes(participantUserId);

      // SECONDARY CHECK: Also check if they're publishing (for immediate detection before backend sync)
      const participantHasVideo = hasVideo(p);
      const participantHasAudio = hasAudio(p);
      const hasVideoStream = !!p.videoStream;
      const hasAudioStream = !!p.audioStream;

      // Check if participant has any published tracks (multiple approaches)
      const publishedTracksValue = p.publishedTracks;
      let hasAnyPublishedTracks = false;

      // Approach 1: Direct number check
      if (typeof publishedTracksValue === 'number') {
        hasAnyPublishedTracks = publishedTracksValue > 0;
      }
      // Approach 2: Array check
      else if (Array.isArray(publishedTracksValue)) {
        hasAnyPublishedTracks = publishedTracksValue.length > 0;
      }
      // Approach 3: Object with length or size
      else if (publishedTracksValue && typeof publishedTracksValue === 'object') {
        if (typeof publishedTracksValue.length === 'number') {
          hasAnyPublishedTracks = publishedTracksValue.length > 0;
        } else if (typeof publishedTracksValue.size === 'number') {
          hasAnyPublishedTracks = publishedTracksValue.size > 0;
        } else {
          // Approach 4: Check if it's a TrackType enum/Set - iterate keys
          const keys = Object.keys(publishedTracksValue);
          hasAnyPublishedTracks = keys.length > 0;
        }
      }

      // Additional checks for active publishing state
      const isActivelyPublishing = p.isSpeaking || (typeof p.audioLevel === 'number' && p.audioLevel > 0);

      // ALSO check if participant has media subscription (means they're publishing something)
      const hasTrackSubscriptions = !!(p.trackSubscriptions && Object.keys(p.trackSubscriptions).length > 0);

      // Check if publishing media (for secondary detection)
      const isPublishingMedia = participantHasVideo || participantHasAudio || hasVideoStream || hasAudioStream || hasAnyPublishedTracks || isActivelyPublishing || hasTrackSubscriptions;

      // FINAL DECISION: Include if they are a GUEST according to backend OR if they're publishing media
      // Primary: Backend guest list (most reliable - prevents viewers from appearing)
      // Secondary: Publishing media (for immediate detection before backend syncs)
      const shouldInclude = isGuestAccordingToBackend || isPublishingMedia;

      return shouldInclude;
    });

    // NO FALLBACK: Only show participants who are guests or actively publishing
    const finalActiveRemoteParticipants = activeRemoteParticipants;

    return (
      <View className="flex-1 bg-black">
        {finalActiveRemoteParticipants.length === 0 ? (
          localParticipant ? (
            <VideoRenderer participant={localParticipant} objectFit="cover" />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-white/60 text-sm">Initializing camera...</Text>
            </View>
          )
        ) : (
          <View className="flex-1 flex-wrap flex-row">
            {/* Include local participant + active remote participants (those with video streams) */}
            {(() => {
              const allActiveParticipants = [localParticipant, ...finalActiveRemoteParticipants].filter(Boolean);

              return allActiveParticipants.map((participant: any, index: number) => {
                // Check if participant has video
                const participantHasVideo = hasVideo(participant);
                const hasVideoTrack = participant.publishedTracks?.some((track: any) => track.kind === 'video') || false;

                // AGGRESSIVE: For remote participants, ALWAYS try VideoRenderer first
                // The SDK's hasVideo function might not detect video immediately after promotion
                // For local participant, use camera state; for remote, always try to show video
                const shouldShowVideo = participant.isLocalParticipant
                  ? (participantHasVideo || hasVideoTrack)  // Local: check if has video
                  : true;  // Remote: always try VideoRenderer - it will show blank if no video

                return (
                  <View
                    key={participant.sessionId || `participant-${index}`}
                    className={`bg-gray-800 ${allActiveParticipants.length <= 2 ? 'w-full h-1/2' : allActiveParticipants.length <= 4 ? 'w-1/2 h-1/2' : 'w-1/3 h-1/3'}`}
                  >
                    {shouldShowVideo ? (
                      <VideoRenderer participant={participant} objectFit="cover" />
                    ) : (
                      // Fallback for participants without video streams (audio only mode - Zoom/Meet style)
                      <View className="flex-1 bg-gray-700 items-center justify-center">
                        <View className="w-12 h-12 rounded-full bg-gray-600 items-center justify-center mb-2">
                          <Text className="text-white text-2xl">🎙️</Text>
                        </View>
                        <Text className="text-white text-sm font-medium">
                          {participant.isLocalParticipant ? 'You' : participant.name || 'Guest'}
                        </Text>
                        <Text className="text-gray-400 text-xs mt-1">Audio Only</Text>
                      </View>
                    )}
                    <View className="absolute bottom-2 left-2 bg-black/60 rounded px-2 py-1">
                      <Text className="text-white text-xs">
                        {participant.isLocalParticipant ? 'You' : participant.name || 'Guest'}
                      </Text>
                    </View>
                  </View>
                );
              });
            })()}
          </View>
        )}
      </View>
    );
  };

  // Dynamic video component based on mode
  const VideoLayer = () => {
    if (!call || !streamClient) return null;

    if (streamMode === 'multi') {
      return <MultiParticipantVideoGrid />;
    } else {
      return <SingleParticipantVideo />;
    }
  };

  if (!userData?.id) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#fff" />
        <Text className="text-white mt-4">Loading user data...</Text>
      </SafeAreaView>
    );
  }

  if (fromTitleScreen && isCreatingStream) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#fff" />
        <Text className="text-white mt-4">Creating {streamMode === 'multi' ? 'multi-' : ''}live stream...</Text>
        {streamMode === 'multi' && (
          <>
            <Text className="text-gray-400 mt-2">Channel: {channel.replace('-', ' ')}</Text>
            <Text className="text-gray-400">Max Participants: {maxSeats}</Text>
          </>
        )}
      </SafeAreaView>
    );
  }

  if (!streamId) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <Text className="text-white">Missing stream ID</Text>
        <TouchableOpacity
          className="mt-4 bg-red-500 px-6 py-3 rounded-lg"
          onPress={() => router.back()}
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View className="flex-1 bg-black">
        {/* Stream Video Container */}
        {connectionState.isRateLimited ? (
          <View className="flex-1 items-center justify-center px-6">
            <View className="bg-red-500/20 border border-red-500 rounded-lg p-6 max-w-sm">
              <Text className="text-red-400 text-lg font-semibold mb-2 text-center">
                Service Temporarily Unavailable
              </Text>
              <Text className="text-white text-center mb-4">
                Too many connection attempts. Please wait a moment before trying again.
              </Text>
              <Text className="text-gray-300 text-sm text-center mb-4">
                Next attempt available: {new Date(connectionState.nextAllowedConnection).toLocaleTimeString()}
              </Text>
              <TouchableOpacity
                className="bg-red-600 py-3 px-6 rounded-lg"
                onPress={() => {
                  // Refresh stream to retry
                  refetchStreamDetails();
                }}
              >
                <Text className="text-white text-center font-semibold">Retry Connection</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : isConnecting || !hasJoined ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#C42720" />
            <Text className="text-white mt-4">Starting your {streamMode === 'multi' ? 'multi-' : ''}stream…</Text>
            {connectionState.consecutiveFailures > 0 && (
              <Text className="text-yellow-400 text-xs mt-2">
                Connection issues detected. Retrying...
              </Text>
            )}
          </View>
        ) : (
          streamClient && call && (
            <StreamVideo client={streamClient}>
              <StreamCall call={call}>
                <VideoLayer />
                {requiresScreenBroadcast && <ScreenBroadcastPrompt />}
                {(allowsScreenShare || requiresScreenBroadcast) && (
                  // Screen broadcast is opt-in per channel (set in the admin),
                  // so the control only exists where it is permitted — plus on
                  // single game streams, which always broadcast.
                  <View className="absolute right-4 top-40">
                    <ScreenShareToggleButton />
                  </View>
                )}
              </StreamCall>
            </StreamVideo>
          )
        )}

        <StreamHeader
          streamTitle={title || streamDetails?.title || `${streamMode === 'multi' ? 'Multi ' : ''}Live Stream`}
          hostFirstName={userData?.first_name}
          hostLastName={userData?.last_name}
          hostUsername={userData?.username}
          hostProfilePicture={profilePictureUrl || undefined}
          viewerCount={streamDetails?.viewer_count ?? 0}
          likesCount={streamDetails?.likes_count ?? 0}
          giftsCount={streamDetails?.gifts_received ?? 0}
          onToggleFollow={() => {
            // For host view, this could be disabled or show different behavior
          }}
          onShare={handleShare}
          disableFollow={true} // Disable follow button for host's own stream
          onClose={endStreamSystem.showEndStreamModal}
        />

        <StreamChatOverlay
          messages={messages}
          keyboardHeight={chat.keyboardHeight}
          isKeyboardVisible={chat.isKeyboardVisible}
          inputBarHeight={72}
          baseURL={MEDIA_BASE_URL}
          hostId={streamDetails?.host?.id || userData?.id}
        />

        {/* Dynamic Input Bar based on mode */}
        {streamMode === 'multi' ? (
          <MultiParticipantInputBar
            onSendMessage={handleSendMessage}
            onAddParticipant={handleAddParticipant}
            hasJoined={hasJoined}
            keyboardHeight={chat.keyboardHeight}
            isKeyboardVisible={chat.isKeyboardVisible}
          />
        ) : (
          <StreamInputBar
            onSendMessage={chat.sendMessage}
            onGiftPress={() => { }}
            // Camera beautify filters are not implemented yet, so this control
            // is visual only — same as the one on the pre-live title screen.
            onBeautifyPress={() => { }}
            onAddParticipant={handleAddParticipant}
            hasJoined={hasJoined}
            keyboardHeight={chat.keyboardHeight}
            isKeyboardVisible={chat.isKeyboardVisible}
            showGiftButton={false}
          />
        )}

        {/* Stream Controls for single mode only */}
        {streamMode === 'single' && <StreamControls isHost />}

        {/* Gift Animations */}
        {giftAnimations.activeGiftAnimations.map((animation) => (
          <GiftAnimation
            key={animation.id}
            gift={animation.gift}
            sender={animation.sender}
            animationKey={animation.animationKey}
            onAnimationComplete={() => giftAnimations.handleGiftAnimationComplete(animation.id)}
          />
        ))}

        <EndStreamModal
          visible={endStreamSystem.isEndStreamModalVisible}
          onCancel={endStreamSystem.hideEndStreamModal}
          onEndStream={endStreamSystem.handleEndStream}
          isLoading={endStreamSystem.isEndingStream}
          streamStatus={streamDetails?.status as 'live' | 'ended' | 'disconnected' | null}
        />

        <MembersListModal
          visible={membersModalVisible}
          onClose={() => setMembersModalVisible(false)}
          streamId={streamId}
          participants={streamDetails?.participants?.filter((p: any) => p.participant_type === 'guest' && p.user).map((p: any) => ({
            id: p.user!.id,
            participant_id: p.id, // StreamParticipant ID needed for removal
            username: p.user!.username,
            first_name: p.user!.first_name,
            last_name: p.user!.last_name,
            full_name: p.user!.full_name,
            followers_count: undefined, // Not available in StreamHost
            profile_picture_url: p.user!.profile_picture_url || undefined,
            is_online: p.is_active, // Use is_active as online status
            participant_type: p.participant_type,
            is_streaming: p.is_active
          })) || []}
          viewers={streamDetails?.participants?.filter((p: any) => p.participant_type === 'viewer').map((p: any) => ({
            id: p.user.id,
            participant_id: p.id, // StreamParticipant ID needed for removal
            username: p.user.username,
            first_name: p.user.first_name,
            last_name: p.user.last_name,
            full_name: p.user.full_name,
            followers_count: undefined, // Not available in StreamHost
            profile_picture_url: p.user.profile_picture_url || undefined,
            is_online: p.is_active, // Use is_active as online status
            joined_at: p.joined_at,
            last_seen: p.left_at
          })) || []}
          currentUserRole="host"
          call={call}
          onRefresh={() => {
            // Trigger refresh of stream data
            refetchStreamDetails();
          }}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

export default React.memo(UnifiedHostStreamScreen);
