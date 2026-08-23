import { BRAND_GRADIENT } from '@/constants/Gradients';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Modal, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser } from '../../../src/store/authSlice';
import {
  useAcceptInviteMutation,
  useJoinStreamMutation,
  useLeaveStreamMutation,
  useStreamActionMutation,
  streamsApi,
} from '../../../src/store/streamsApi';
import { StreamCall, StreamVideo, VideoRenderer, useCallStateHooks, hasVideo, hasAudio } from '@stream-io/video-react-native-sdk';
import { Camera } from 'expo-camera';
import { createStreamClient, createStreamUser } from '../../../src/utils/streamClient';
import CancelIcon from '../../../assets/icons/cancel.svg';
import DareMeLiveIcon from '../../../assets/icons/daremelive.svg';
import { LinearGradient } from 'expo-linear-gradient';
import {
  StreamClientState,
  StreamCallState,
} from '../../../types/stream';
import { logger } from '../../../src/utils/logger';

export default function MultiParticipantJoinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);

  const streamId = (params.id as string) || '';
  const isHost = params.isHost === 'true';
  const mode = params.mode as string;

  const [acceptInvite] = useAcceptInviteMutation();
  const [joinStream] = useJoinStreamMutation();
  const [leaveStream] = useLeaveStreamMutation();
  const [streamAction] = useStreamActionMutation();

  const [streamClient, setStreamClient] = useState<StreamClientState>(null);
  const [call, setCall] = useState<StreamCallState>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [leaveConfirmationVisible, setLeaveConfirmationVisible] = useState(false);
  const [cameraRetryCount, setCameraRetryCount] = useState(0);
  const [lastCameraError, setLastCameraError] = useState<string | null>(null);
  const [connectionTimeout, setConnectionTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [hostParticipantCheckTimeout, setHostParticipantCheckTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [forceHostSplitScreen, setForceHostSplitScreen] = useState(false);
  const [forceGridUpdate, setForceGridUpdate] = useState(0);
  const initTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);



  useEffect(() => {
    if (currentUser?.id && streamId) {
      initializeParticipant();

      // Set timeout for promoted participants who might get stuck
      if (!isHost && params.promoted === 'true') {
        const timeout = setTimeout(() => {
          // Only retry if still connecting, hasn't joined, and call state isn't already successful
          if (isConnecting && !hasJoined && (!call || call.state.callingState !== 'joined')) {
            setIsConnecting(false);
            setTimeout(() => initializeParticipant(), 1000);
          } else {
          }
        }, 15000); // 15 second timeout
        setConnectionTimeout(timeout);

        // Additional aggressive camera enabling for promoted participants
        const cameraCheckInterval = setInterval(() => {
          if (call && hasJoined) {
            const cameraStatus = call.camera.state.status;
            const localParticipant = call.state.localParticipant;
            const hasVideoTrack = localParticipant?.publishedTracks?.some((track: any) => track.kind === 'video');


            // Aggressive auto-fix: If camera is not working, automatically retry
            if ((cameraStatus !== 'enabled' || !hasVideoTrack) && cameraRetryCount < 5) {
              retryCameraEnabling().catch(logger.error);
            }
          }
        }, 3000); // Check every 3 seconds for more responsive experience

        // Clear interval on cleanup
        const originalClearFn = () => {
          if (initTimeout.current) clearTimeout(initTimeout.current);
          if (connectionTimeout) clearTimeout(connectionTimeout);
          if (hostParticipantCheckTimeout) clearTimeout(hostParticipantCheckTimeout);
          clearInterval(cameraCheckInterval);
          if (hasJoined) {
            handleLeave();
          }
        };

        return originalClearFn;
      }
    }
    return () => {
      if (initTimeout.current) clearTimeout(initTimeout.current);
      if (connectionTimeout) clearTimeout(connectionTimeout);
      if (hostParticipantCheckTimeout) clearTimeout(hostParticipantCheckTimeout);
      if (hasJoined) {
        handleLeave();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, streamId]);

  useEffect(() => {
    if (!streamId || !hasJoined) return;

    let backgroundTime: number | null = null;

    const handleAppStateChange = (nextAppState: any) => {
      if (nextAppState === 'background') {
        backgroundTime = Date.now();

      } else if (nextAppState === 'active') {
        backgroundTime = null;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();

      if (hasJoined && streamId && isHost) {
        streamAction({
          streamId,
          action: { action: 'end' }
        }).unwrap().catch((error) => {
          // Stream end error handled silently
        });
      }
    };
  }, [streamId, hasJoined, isHost, streamAction]);

  // Add real-time call state monitoring for promoted participants
  useEffect(() => {
    if (!call || !hasJoined || params.promoted !== 'true') return;


    const monitorInterval = setInterval(() => {
      try {
        const localParticipant = call.state.localParticipant;
        const publishedTracks = localParticipant?.publishedTracks || [];
        const videoTracks = publishedTracks.filter((track: any) => track.kind === 'video');
        const audioTracks = publishedTracks.filter((track: any) => track.kind === 'audio');


        // Alert if we're in an inconsistent state
        if (call.camera.state.status === 'enabled' && videoTracks.length === 0) {
        }

      } catch (monitorErr) {
      }
    }, 3000); // Monitor every 3 seconds

    // Clean up monitoring after 2 minutes
    const cleanupTimeout = setTimeout(() => {
      clearInterval(monitorInterval);
    }, 120000);

    return () => {
      clearInterval(monitorInterval);
      clearTimeout(cleanupTimeout);
    };
  }, [call, hasJoined, params.promoted, currentUser]);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        if (hasJoined && !isBusy) {
          handleLeave();
        }
      };
    }, [hasJoined, isBusy])
  );

  const initializeParticipant = async () => {
    if (isBusy) return;
    setIsBusy(true);
    setIsConnecting(true);

    try {
      const streamUser = createStreamUser(currentUser!);

      const client = await createStreamClient(streamUser);
      if (!client) throw new Error('Failed to initialize streaming client');
      setStreamClient(client);

      if (!isHost) {
        try {
          await acceptInvite(streamId).unwrap();
        } catch (e) {
          // Non-blocking
        }
      }

      const isPromotedParticipant = !isHost && params.promoted === 'true';

      const participantType = isHost ? 'host' : 'guest';

      if (!isPromotedParticipant) {
        try {
          await joinStream({ streamId, data: { participant_type: participantType } }).unwrap();
        } catch (err: any) {
          if (err?.data?.error && !String(err.data.error).includes('already in')) {
            throw err;
          }
        }
      }

      const callId = `stream_${streamId}`;

      const callType = 'livestream';

      const gCall = client.call(callType, callId);

      try {
        if (isPromotedParticipant) {

          // For promoted participants, we need to JOIN the existing call (not create)
          // The call already exists, created by the host
          try {
            // First, get the call to ensure we have it
            await gCall.get();
          } catch (getErr) {
            await gCall.getOrCreate();
          }

          // NOW ACTUALLY JOIN THE CALL - This is the critical step!
          await gCall.join({ create: false });

          // Small delay to let join settle
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          try {
            await gCall.join({ create: true });
          } catch {
            await gCall.join({ create: false });
          }
        }
      } catch (joinErr) {
        throw new Error('Could not join the stream call');
      }

      // Request permissions and publish camera and microphone
      try {
        const cam = await Camera.requestCameraPermissionsAsync();
        const mic = await Camera.requestMicrophonePermissionsAsync();

        if (cam.status !== 'granted' || mic.status !== 'granted') {
          Alert.alert('Permissions Required', 'Please allow camera and microphone to join as a participant.');
          throw new Error('Permissions not granted');
        }
      } catch (permErr) {
        // Permission error handled
      }

      try {

        if (isPromotedParticipant) {
          // Promoted participants should already have permissions granted by the host
          // Just wait for the call state to settle after joining
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Check capabilities
          const capabilities = gCall.state.ownCapabilities || [];
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        // Enable camera
        await gCall.camera.enable();

        // Enable microphone
        await gCall.microphone.enable();

        // Wait for tracks to be published
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verify media is working
        const cameraStatus = gCall.camera.state.status;
        const micStatus = gCall.microphone.state.status;

      } catch (mediaErr: any) {
        // Keep session even if media enabling fails
      }

      // Clear any connection timeout
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        setConnectionTimeout(null);
      }

      setCall(gCall);
      setHasJoined(true);
      setIsConnecting(false);

      // CRITICAL: Final track publishing verification for promoted participants
      if (isPromotedParticipant) {
        setTimeout(async () => {
          try {

            const currentParticipant = gCall.state.localParticipant;
            const currentVideoTracks = currentParticipant?.publishedTracks?.filter((track: any) => track.kind === 'video').length || 0;
            const currentAudioTracks = currentParticipant?.publishedTracks?.filter((track: any) => track.kind === 'audio').length || 0;


            // If camera is enabled but no video tracks published, force publishing
            if (currentVideoTracks === 0) {

              try {
                // NUCLEAR OPTION 1: Complete permission reset and re-request
                await gCall.requestPermissions({
                  permissions: ['send-video', 'send-audio', 'read-call', 'join-call']
                });
                await new Promise(resolve => setTimeout(resolve, 1000));

                // NUCLEAR OPTION 2: Force disable/enable cycle with longer delays
                await gCall.camera.disable();
                await gCall.microphone.disable();
                await new Promise(resolve => setTimeout(resolve, 1000));

                await gCall.camera.enable();
                await new Promise(resolve => setTimeout(resolve, 1000));
                await gCall.microphone.enable();
                await new Promise(resolve => setTimeout(resolve, 1000));

                // NUCLEAR OPTION 3: Check call state and force track creation
                const afterCycle = gCall.state.localParticipant;
                const afterCycleVideoTracks = afterCycle?.publishedTracks?.filter((track: any) => track.kind === 'video').length || 0;


                // NUCLEAR OPTION 4: If still no tracks, try rejoin approach
                if (afterCycleVideoTracks === 0) {

                  try {
                    // Leave and rejoin the call
                    await gCall.leave();
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    await gCall.join({ create: false });
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // Re-enable everything
                    await gCall.camera.enable();
                    await gCall.microphone.enable();
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    const afterRejoin = gCall.state.localParticipant;
                    const rejoinVideoTracks = afterRejoin?.publishedTracks?.filter((track: any) => track.kind === 'video').length || 0;


                  } catch (rejoinErr) {
                  }
                }

              } catch (nuclearErr) {

                // FINAL FALLBACK: Show user that manual action may be needed
              }
            } else {
            }

          } catch (finalCheckErr) {
          }
        }, 2000); // Wait 2 seconds after join to ensure everything is settled
      }

      // For hosts, add a delayed check to detect promoted participants
      if (isHost) {

        const participantCheckTimeout = setTimeout(() => {
          // Force split screen if we suspect there should be participants
          const hasCallParticipants = gCall?.state?.participants?.length > 1;
          const hasCallMembers = gCall?.state?.members?.length > 1;

          if (hasCallParticipants || hasCallMembers) {
            setForceHostSplitScreen(true);
          }

          // Force Grid component to re-render to trigger detection
          setForceGridUpdate(prev => prev + 1);

          setHostParticipantCheckTimeout(null);
        }, 3000);
        setHostParticipantCheckTimeout(participantCheckTimeout);

        // Also add a more frequent check for host
        const gridUpdateInterval = setInterval(() => {
          setForceGridUpdate(prev => prev + 1);
        }, 5000);

        // Clear interval after 30 seconds
        setTimeout(() => {
          clearInterval(gridUpdateInterval);
        }, 30000);
      }

      // For promoted participants, add extra validation and fallback logic
      if (isPromotedParticipant) {
        // Give a moment for state to settle then validate connection
        setTimeout(() => {
          const currentCapabilities = gCall.state.ownCapabilities || [];

          if (currentCapabilities.length === 0) {

            // Strategy 1: Request permissions through the call
            gCall.requestPermissions({
              permissions: ['send-video', 'send-audio']
            }).then(() => {
            }).catch((reqErr) => {

              // Strategy 2: Leave and rejoin with different parameters
              gCall.leave().then(() => {
                return new Promise(resolve => setTimeout(resolve, 1000));
              }).then(() => {
                return gCall.join({
                  create: false,
                  data: {
                    custom: {
                      promoted: true,
                      participant_type: 'guest'
                    }
                  }
                });
              }).then(() => {
                // Try permissions again after rejoin
                return gCall.requestPermissions({
                  permissions: ['send-video', 'send-audio']
                });
              }).catch((rejoinErr) => {
              });
            });
          } else {
          }
        }, 2000);

        // Also add a longer timeout to check if the user can actually enable media
        setTimeout(() => {
          const mediaCapabilities = gCall.state.ownCapabilities || [];
          const canSendVideo = mediaCapabilities.includes('send-video');
          const canSendAudio = mediaCapabilities.includes('send-audio');

          if (!canSendVideo && !canSendAudio) {

            // Try one more aggressive approach to get media permissions
            (async () => {
              try {

                // Simple approach: Leave and rejoin with explicit media request
                await gCall.leave();
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Rejoin with media-focused configuration
                await gCall.join({
                  create: false,
                  data: {
                    settings_override: {
                      audio: {
                        mic_default_on: true,
                        default_device: 'speaker'
                      },
                      video: {
                        camera_default_on: true,
                        target_resolution: { width: 1280, height: 720 }
                      }
                    }
                  }
                });

                // Request media permissions immediately after rejoin
                await new Promise(resolve => setTimeout(resolve, 1000));
                await gCall.requestPermissions({
                  permissions: ['send-video', 'send-audio']
                });


              } catch (rejoinErr) {


                // Show a helpful user message but don't block the experience
                Alert.alert(
                  'Media Setup Notice',
                  'You have successfully joined as a participant. Media permissions are still being configured. You can view the stream and participate in chat. If you need to use camera/microphone, try leaving and rejoining the stream.',
                  [{ text: 'OK' }]
                );
              }
            })();
          }
        }, 5000);
      }

    } catch (error: any) {
      setIsConnecting(false);

      const errorMessage = error?.data?.error || error?.message || 'Unable to join as participant';
      const isNetworkError = errorMessage.includes('timeout') || errorMessage.includes('network') || errorMessage.includes('connection');
      const isGetStreamError = errorMessage.includes('GetStream');
      const isPermissionError = error?.status === 403 || errorMessage.includes('permission') || errorMessage.includes('403');

      let alertTitle = 'Join Failed';
      let alertMessage = errorMessage;

      if (isPermissionError) {
        alertTitle = 'Permission Issue';
        alertMessage = 'There was a permission issue joining the stream. This can happen with promoted participants due to Stream.io security settings. The connection should still work for viewing and basic participation.';

        // For permission errors, don't show a blocking alert, just log and continue

        // Set a minimal connected state so user can at least view
        if (streamClient) {
          const callId = `stream_${streamId}`;
          const callType = 'livestream';
          const gCall = streamClient.call(callType, callId);

          try {
            await gCall.join({ create: false });
            setCall(gCall);
            setHasJoined(true);
            return; // Exit early, don't show error alert
          } catch (fallbackErr) {
          }
        }
      } else if (isGetStreamError) {
        alertTitle = 'Streaming Service Error';
        alertMessage = 'There was an issue connecting to the streaming service. This might be temporary - please try again in a moment.';
      } else if (isNetworkError) {
        alertTitle = 'Network Error';
        alertMessage = 'Unable to connect to the streaming servers. Please check your internet connection and try again.';
      }

      Alert.alert(
        alertTitle,
        alertMessage,
        [
          { text: 'Go Back', onPress: () => router.back() },
          {
            text: 'Retry', onPress: () => {
              // Add small delay before retry to avoid overwhelming the service
              setTimeout(() => initializeParticipant(), 1000);
            }
          }
        ]
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleLeave = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      if (streamId) {
        try { await leaveStream(streamId).unwrap(); } catch { }
        dispatch(streamsApi.util.invalidateTags(['Stream']));
      }
      if (call) {
        try {
          await Promise.all([
            call.microphone.disable().catch(() => { }),
            call.camera.disable().catch(() => { }),
          ]);
          await call.leave();
        } catch { }
      }
      setHasJoined(false);
      router.back();
    } finally {
      setIsBusy(false);
    }
  };

  const handleConfirmedLeave = async () => {
    await handleLeave();
  };

  const retryCameraEnabling = async () => {
    if (!call || isBusy) return;

    setLastCameraError(null);

    try {
      const currentCapabilities = call.state.ownCapabilities || [];
      const hasVideoCapability = currentCapabilities.includes('send-video');

      if (!hasVideoCapability) {
        try {
          await call.requestPermissions({
            permissions: ['send-video', 'send-audio']
          });
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (permErr) {
        }
      }

      // Aggressive camera enabling sequence with reduced delays
      try {
        await call.camera.disable();
        await new Promise(resolve => setTimeout(resolve, 250)); // Reduced from 500ms

        await call.camera.enable();
        await new Promise(resolve => setTimeout(resolve, 750)); // Reduced from 1500ms

        // Check if video is being published
        const localParticipant = call.state.localParticipant;
        const hasVideoTrack = localParticipant?.publishedTracks?.some((track: any) => track.kind === 'video');

        if (!hasVideoTrack) {
          // Try alternative enabling method with faster timing
          await call.camera.disable();
          await new Promise(resolve => setTimeout(resolve, 500)); // Reduced from 1000ms
          await call.camera.enable();
          await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced from 2000ms
        }
      } catch (enableErr) {
        throw enableErr;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      const status = call.camera.state.status;

      if (status !== 'enabled') {
        throw new Error(`Camera status is ${status} after enable`);
      }

      setCameraRetryCount(prev => prev + 1);

    } catch (error: any) {
      setLastCameraError(error.message || 'Failed to enable camera');

      if (error?.message?.includes('permission') || error?.message?.includes('publish')) {
        Alert.alert(
          'Camera Permission Issue',
          'Camera could not be enabled due to permission restrictions. This can happen with promoted participants.\n\nTry:\n• Leaving and rejoining the stream\n• Checking if another app is using the camera\n• Ensuring camera permissions are granted in device Settings',
          [{ text: 'OK' }]
        );
      }

      throw error;
    }
  };

  // Enhanced video detection that checks multiple sources
  const hasActualVideo = (participant: any) => {
    if (!participant) return false;

    // Check 1: Stream.io hasVideo function
    const streamHasVideo = hasVideo(participant);

    // Check 2: Published video tracks
    const hasVideoTrack = participant.publishedTracks?.some((track: any) => track.kind === 'video');

    // Check 3: Video stream object
    const hasVideoStream = !!participant.videoStream;

    // Debug logging for promoted participants
    if (!participant.isLocalParticipant && params.promoted === 'true') {
    }

    // Return true if any method detects video
    return streamHasVideo || hasVideoTrack || hasVideoStream;
  };

  // Helper function to render a participant tile with audio-only fallback (Zoom/Meet style)
  const renderParticipantTile = (
    participant: any,
    cameraState: any,
    ownCapabilities: any,
    useActualVideo: boolean = false
  ) => {
    const isLocal = participant.isLocalParticipant;
    const hasVideoFn = useActualVideo ? hasActualVideo : hasVideo;
    const participantHasVideo = hasVideoFn(participant);

    if (isLocal) {
      // Local participant (promoted guest or host) - ALWAYS use VideoRenderer when camera is enabled
      if (cameraState.status === 'enabled' || participantHasVideo) {
        return <VideoRenderer participant={participant} objectFit="cover" />;
      } else {
        // Audio-only fallback for local participant
        return (
          <View className="flex-1 bg-gray-800 items-center justify-center">
            <View className="w-14 h-14 rounded-full bg-gray-700 items-center justify-center mb-2">
              <Ionicons name="mic" size={24} color="white" />
            </View>
            <Text className="text-white text-lg font-semibold">You</Text>
            <Text className="text-gray-400 text-sm mt-1">Audio Only</Text>
          </View>
        );
      }
    } else if (participantHasVideo) {
      // Remote participant with video
      return <VideoRenderer participant={participant} objectFit="cover" />;
    } else {
      // Remote participant audio-only
      return (
        <View className="flex-1 bg-gray-800 items-center justify-center">
          <View className="w-14 h-14 rounded-full bg-gray-700 items-center justify-center mb-2">
            <Ionicons name="mic" size={24} color="white" />
          </View>
          <Text className="text-white text-lg font-semibold">
            {participant.name || 'Guest'}
          </Text>
          <Text className="text-gray-400 text-sm mt-1">Audio Only</Text>
        </View>
      );
    }
  };

  // CameraStateMonitor component removed - auto camera enabling happens in background without UI prompts

  const Grid = () => {
    const {
      useParticipants,
      useLocalParticipant,
      useCameraState,
      useMicrophoneState,
      useOwnCapabilities
    } = useCallStateHooks();

    const participants = useParticipants();
    const localParticipant = useLocalParticipant();
    const cameraState = useCameraState();
    const microphoneState = useMicrophoneState();
    const ownCapabilities = useOwnCapabilities();

    const activeParticipants = participants.filter((p: any) => {
      // Use SDK helpers which properly handle reactive publishedTracks
      const participantHasVideo = hasVideo(p);
      const participantHasAudio = hasAudio(p);

      // Fallback: Check for actual video/audio stream objects
      const hasVideoStream = !!p.videoStream;
      const hasAudioStream = !!p.audioStream;

      // Include if SDK helpers OR stream objects detect broadcasting
      const isPublishing = participantHasVideo || participantHasAudio || hasVideoStream || hasAudioStream;


      // For local participant, also include if they have camera enabled (about to publish)
      if (p.isLocalParticipant) {
        return isPublishing || cameraState.status === 'enabled';
      }

      // Include remote participants if they are broadcasting
      return isPublishing;
    });


    // IMPORTANT FIX: For hosts, they might not see promoted participants in their useParticipants() hook
    // This is a Stream.io limitation where promoted participants aren't immediately visible to hosts
    // We need to ensure both host and promoted participant see the same participant count
    let active = activeParticipants;

    // Enhanced host participant detection - but with strict deduplication
    if (isHost) {

      // Only add additional participants if we have ZERO remote participants
      // This prevents duplicate entries while still enabling screen splitting
      if (activeParticipants.filter(p => !p.isLocalParticipant).length === 0) {
        const callParticipants = call?.state?.participants || [];

        // Find actual additional participants (not synthetic ones)
        const additionalParticipants = callParticipants.filter((p: any) =>
          !p.isLocalParticipant &&
          p.userId !== currentUser?.id?.toString() &&
          p.userId && // Ensure valid userId
          !activeParticipants.find(ap => ap.userId === p.userId) // No duplicates
        );

        if (additionalParticipants.length > 0) {

          // Only add actual participants, no synthetic ones
          active = [...activeParticipants, ...additionalParticipants];
        }
      }
    }

    // PROMOTED PARTICIPANT FIX: Similar to host fix, promoted participants might not see host initially
    if (!isHost && params.promoted === 'true') {

      // If we have no remote participants (can't see host), try to get from call state
      const remoteInActive = activeParticipants.filter(p => !p.isLocalParticipant);
      if (remoteInActive.length === 0) {
        const callParticipants = call?.state?.participants || [];

        // Find the host (any remote participant that's not us)
        const hostParticipants = callParticipants.filter((p: any) =>
          !p.isLocalParticipant &&
          p.userId !== currentUser?.id?.toString() &&
          p.userId &&
          !activeParticipants.find(ap => ap.userId === p.userId)
        );

        if (hostParticipants.length > 0) {
          active = [...activeParticipants, ...hostParticipants];
        }
      }
    }

    const local = localParticipant || activeParticipants.find((p: any) => p.isLocalParticipant);

    // For promoted participants, be more lenient with connection detection
    const isPromotedParticipant = !isHost && params.promoted === 'true';

    // Enhanced connection detection for promoted participants
    const hasBasicCapabilities = ownCapabilities && ownCapabilities.length > 0;
    const isCallConnected = call && call.state.callingState === 'joined';
    const hasValidConnection = call && (local || (isPromotedParticipant && (hasBasicCapabilities || isCallConnected)));
    const shouldShowConnecting = !hasValidConnection && isConnecting;


    // Clear timeout if promoted participant has successfully connected using useEffect to avoid setState during render
    React.useEffect(() => {
      if (isPromotedParticipant && hasValidConnection && connectionTimeout) {
        clearTimeout(connectionTimeout);
        setConnectionTimeout(null);
      }
    }, [isPromotedParticipant, hasValidConnection, connectionTimeout]);

    // For promoted participants without local participant, create a synthetic local participant for the grid
    let effectiveLocal = local;

    // Check if the current user is already in the participants list (to avoid duplicates)
    const currentUserInParticipants = active.find(p =>
      p.userId === currentUser?.id?.toString() ||
      p.name === currentUser?.username
    );

    if (isPromotedParticipant && !local && call && (hasBasicCapabilities || isCallConnected) && !currentUserInParticipants) {
      // Only create a synthetic participant if the user is not already in the participants list
      effectiveLocal = {
        userId: currentUser?.id?.toString() || 'unknown',
        name: currentUser?.username || 'You',
        isLocalParticipant: true,
        // Add other required properties as needed
      } as any;

    } else if (currentUserInParticipants) {
      // Use the existing participant as the effective local
      effectiveLocal = currentUserInParticipants;
    }

    // Special handling for promoted participants who are connected but might not have full local participant yet
    if (isPromotedParticipant && call && !local && (hasBasicCapabilities || isCallConnected)) {
      const hasMediaCapabilities = ownCapabilities?.includes('send-video') || ownCapabilities?.includes('send-audio');

      // Only show waiting screen if we TRULY have no participants at all
      // active.length === 0 means no host found AND no local participant
      // But we should also check if we have any remote participants we could show
      const hasAnyRemoteParticipant = active.length > 0 || (call?.state?.participants?.length || 0) > 1;

      if (active.length === 0 && !hasAnyRemoteParticipant) {
        return (
          <View className="flex-1 bg-black">
            <View className="flex-1 bg-gray-800 items-center justify-center">
              <Text className="text-white text-lg font-semibold">You</Text>
              <Text className="text-gray-400 text-sm mt-1">
                {hasMediaCapabilities ?
                  (cameraState.status === 'enabled' ? 'Camera ready' : 'Setting up media...') :
                  'Connected - Configuring media permissions...'}
              </Text>
            </View>
            <View className="absolute top-4 left-4 bg-black/60 rounded px-2 py-1">
              <Text className="text-white text-xs">
                {!hasMediaCapabilities ? 'Setting up...' :
                  cameraState.status === 'disabled' ? 'Audio only' :
                    cameraState.status === 'enabled' ? 'Camera ready' : 'Audio only'}
              </Text>
            </View>
            {/* CameraStateMonitor removed - auto camera enabling happens in background */}

            {/* Show a helpful button if media capabilities are missing */}
            {hasBasicCapabilities && !hasMediaCapabilities && (
              <View className="absolute bottom-20 left-4 right-4 bg-blue-600/90 rounded-lg p-4 z-10">
                <Text className="text-white font-semibold mb-2">Setting up media permissions...</Text>
                <Text className="text-white text-sm">
                  Camera and microphone are being configured automatically.
                </Text>
              </View>
            )}
          </View>
        );
      }
      // If we have other participants, fall through to normal grid logic with synthetic participant
    }

    // Update the effectiveLocal if it hasn't been set yet and we need a synthetic participant
    // (This check is now redundant since we handle this above, but keeping for safety)
    if (isPromotedParticipant && !effectiveLocal && call && (hasBasicCapabilities || isCallConnected)) {
      // Check again if the current user is already in the participants list
      const currentUserInParticipants = active.find(p =>
        p.userId === currentUser?.id?.toString() ||
        p.name === currentUser?.username
      );

      if (!currentUserInParticipants) {
        // Create a synthetic participant object for the promoted user
        effectiveLocal = {
          userId: currentUser?.id?.toString() || 'unknown',
          name: currentUser?.username || 'You',
          isLocalParticipant: true,
          // Add other required properties as needed
        } as any;

      } else {
        effectiveLocal = currentUserInParticipants;
      }
    }

    if (shouldShowConnecting) {
      return (
        <View className="flex-1 items-center justify-center bg-black">
          <ActivityIndicator size="large" color="#C42720" />
          <Text className="text-white mt-3">Connecting…</Text>
          <Text className="text-gray-400 text-xs mt-2">
            Participants: {activeParticipants.length}
          </Text>
          {isPromotedParticipant && (
            <TouchableOpacity
              onPress={() => {
                setIsConnecting(false);
                setTimeout(() => initializeParticipant(), 1000);
              }}
              className="mt-4 bg-[#C42720] px-6 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold">Retry Connection</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    // For promoted participants, if we don't have a local participant but we have other participants,
    // we should still show the grid with the available participants
    if (isPromotedParticipant && !local && active.length > 0) {
      // Continue to normal grid logic below
    } else if (!effectiveLocal && !(isPromotedParticipant && (hasBasicCapabilities || isCallConnected))) {
      return (
        <View className="flex-1 items-center justify-center bg-black">
          <Text className="text-white text-lg">Unable to connect</Text>
          <Text className="text-gray-400 text-sm mt-2">
            {isPromotedParticipant ? 'Promoted participant connection issue' : 'Connection failed'}
          </Text>
          <TouchableOpacity
            onPress={() => initializeParticipant()}
            className="mt-4 bg-[#C42720] px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Include the local participant in the active participants list if needed
    let allActiveParticipants = [...active];

    // For hosts: ensure they see all participants including promoted ones
    // For promoted participants: ensure they see themselves + host

    // Only add effectiveLocal if it's not already in the active participants
    const effectiveLocalAlreadyInActive = effectiveLocal && active.find(p =>
      p.userId === effectiveLocal.userId ||
      (p.isLocalParticipant && effectiveLocal.isLocalParticipant)
    );

    if (effectiveLocal && !effectiveLocalAlreadyInActive) {
      // For promoted participants, put them first; for hosts, add them to the list
      if (isPromotedParticipant) {
        allActiveParticipants = [effectiveLocal, ...active];
      } else {
        allActiveParticipants = [...active, effectiveLocal];
      }
    } else if (effectiveLocalAlreadyInActive) {
    }

    // Enhanced final check: If we're a host and still only see ourselves, do one more comprehensive check
    // This ensures hosts see split screen when there are promoted participants
    if (isHost && allActiveParticipants.length === 1 && allActiveParticipants[0].isLocalParticipant) {

      // Check call members for promoted participants that might not be showing up anywhere else
      const callMembers = call?.state?.members || [];
      const callParticipants = call?.state?.participants || [];


      // Find any member/participant that's not the current user and not already in allActiveParticipants
      const missingMembers = callMembers.filter((member: any) =>
        member.user_id !== currentUser?.id?.toString() &&
        !allActiveParticipants.find(p => p.userId === member.user_id)
      );

      const missingParticipants = callParticipants.filter((participant: any) =>
        participant.userId !== currentUser?.id?.toString() &&
        !participant.isLocalParticipant &&
        !allActiveParticipants.find(p => p.userId === participant.userId)
      );

      // Combine and deduplicate
      const allMissing = [...missingParticipants];
      missingMembers.forEach((member: any) => {
        if (!allMissing.find(p => p.userId === member.user_id)) {
          allMissing.push({
            userId: member.user_id,
            name: member.user?.name || `User ${member.user_id}`,
            isLocalParticipant: false,
            isSyntheticFromFinalCheck: true,
            roles: [member.role || 'user']
          });
        }
      });

      if (allMissing.length > 0) {

        allActiveParticipants = [...allActiveParticipants, ...allMissing];

      } else {
      }
    }

    // Final debug info for the grid

    // Handle the case where we have active participants but no local participant (promoted participant case)
    if (allActiveParticipants.length === 0 && effectiveLocal) {
      return (
        <View className="flex-1 bg-black">
          {effectiveLocal.isLocalParticipant ? (
            <View className="flex-1 bg-gray-800 items-center justify-center">
              <Text className="text-white text-lg font-semibold">You</Text>
              <Text className="text-gray-400 text-sm mt-1">
                {cameraState.status === 'enabled' ? 'Camera ready' : 'Audio only'}
              </Text>
            </View>
          ) : hasVideo(effectiveLocal) ? (
            <VideoRenderer participant={effectiveLocal} objectFit="cover" />
          ) : (
            <View className="flex-1 bg-gray-800 items-center justify-center">
              <Text className="text-white text-lg font-semibold">You</Text>
              <Text className="text-gray-400 text-sm mt-1">Audio only</Text>
            </View>
          )}
          <View className="absolute top-4 left-4 bg-black/60 rounded px-2 py-1">
            <Text className="text-white text-xs">
              {cameraState.status === 'disabled' ? 'Audio only' :
                cameraState.status === 'enabled' ? 'Camera ready' : 'Audio only'}
            </Text>
          </View>

          {/* CameraStateMonitor removed - auto camera enabling happens in background */}
        </View>
      );
    }

    if (allActiveParticipants.length === 1) {
      const participant = allActiveParticipants[0];
      return (
        <View className="flex-1 bg-black">
          {renderParticipantTile(participant, cameraState, ownCapabilities, true)}
          <View className="absolute bottom-4 left-4 bg-black/60 rounded-full px-3 py-1">
            <Text className="text-white text-xs font-semibold">
              {participant.isLocalParticipant ? 'You' : participant.name || 'Guest'}
            </Text>
          </View>

          {/* CameraStateMonitor removed - auto camera enabling happens in background */}
        </View>
      );
    }

    if (allActiveParticipants.length === 2) {
      return (
        <View className="flex-1 bg-black">
          <View className="flex-1">
            {renderParticipantTile(allActiveParticipants[0], cameraState, ownCapabilities, true)}
            <View className="absolute bottom-4 left-4 bg-black/60 rounded-full px-3 py-1">
              <Text className="text-white text-xs font-semibold">
                {allActiveParticipants[0].isLocalParticipant ? 'You' : allActiveParticipants[0].name || 'Guest'}
              </Text>
            </View>
          </View>
          <View className="flex-1">
            {renderParticipantTile(allActiveParticipants[1], cameraState, ownCapabilities, true)}
            <View className="absolute bottom-4 left-4 bg-black/60 rounded-full px-3 py-1">
              <Text className="text-white text-xs font-semibold">
                {allActiveParticipants[1].isLocalParticipant ? 'You' : allActiveParticipants[1].name || 'Guest'}
              </Text>
            </View>
          </View>

          {/* Camera automatically retries in background for promoted participants */}
          {!isHost && params.promoted === 'true' && (
            <View className="absolute top-4 left-4 bg-black/60 rounded px-2 py-1">
              <View className="flex-row items-center">
                <Ionicons
                  name={cameraState.status === 'enabled' ? 'videocam' : 'mic'}
                  size={12}
                  color="white"
                />
                <Text className="text-white text-xs ml-1">
                  {cameraState.status === 'enabled' ? 'Camera ready' : 'Audio only'}
                </Text>
              </View>
            </View>
          )}
        </View>
      );
    }

    return (
      <View className="flex-1 bg-black">
        <View className="flex-1 flex-row">
          <View className="flex-1">
            {renderParticipantTile(allActiveParticipants[0], cameraState, ownCapabilities, false)}
          </View>
          <View className="flex-1">
            {allActiveParticipants[1] && renderParticipantTile(allActiveParticipants[1], cameraState, ownCapabilities, false)}
          </View>
        </View>
        <View className="flex-1 flex-row">
          <View className="flex-1">
            {allActiveParticipants[2] && renderParticipantTile(allActiveParticipants[2], cameraState, ownCapabilities, false)}
          </View>
          {allActiveParticipants[3] && (
            <View className="flex-1">
              {renderParticipantTile(allActiveParticipants[3], cameraState, ownCapabilities, false)}
            </View>
          )}
        </View>

        {/* Add camera state monitor for promoted participants */}
        {/* CameraStateMonitor removed - auto camera enabling happens in background */}
      </View>
    );
  };

  const renderBody = () => {
    if (isConnecting) {
      const connectingMessage = isHost
        ? (mode === 'single' ? 'Starting your stream…' : 'Preparing host session…')
        : 'Joining as participant…';
      return (
        <View className="flex-1 items-center justify-center bg-black">
          <ActivityIndicator size="large" color="#C42720" />
          <Text className="text-white text-lg mt-4">{connectingMessage}</Text>
        </View>
      );
    }

    if (!streamClient || !call) {
      return (
        <View className="flex-1 items-center justify-center bg-black">
          <Text className="text-white text-lg">Connection error</Text>
          <TouchableOpacity onPress={initializeParticipant} className="mt-4 bg-[#C42720] px-4 py-2 rounded-lg">
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View className="flex-1 bg-black">
        <StreamVideo client={streamClient}>
          <StreamCall call={call}>
            <Grid />
          </StreamCall>
        </StreamVideo>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar style="light" />
      <View className="flex-1">
        {renderBody()}
      </View>

      {/* Top overlay with leave button */}
      {hasJoined && (
        <View className="absolute top-16 right-4" style={{ zIndex: 10 }}>
          <TouchableOpacity onPress={() => setLeaveConfirmationVisible(true)} className="w-10 h-10 rounded-full items-center justify-center">
            <CancelIcon width={25} height={25} />
          </TouchableOpacity>
        </View>
      )}

      {/* Leave Stream Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={leaveConfirmationVisible}
        onRequestClose={() => setLeaveConfirmationVisible(false)}
      >
        <View className="flex-1 bg-black/70 items-center justify-center px-6">
          <View className="bg-gray-800/95 rounded-3xl p-8 w-full max-w-sm items-center">
            {/* Icon */}
            <View className="w-20 h-20 rounded-full bg-gray-700 items-center justify-center mb-6">
              <DareMeLiveIcon width={40} height={40} />
            </View>

            {/* Title */}
            <Text className="text-white text-2xl font-bold text-center mb-3">
              Leave Stream
            </Text>

            {/* Description */}
            <Text className="text-gray-300 text-base text-center leading-6 mb-8">
              Are you sure you want to leave as a guest? You’ll no longer be able to speak in this stream and will return to viewer mode.
            </Text>

            {/* Buttons */}
            <View className="w-full space-y-3">
              {/* Stay as Guest Button */}
              <View className="w-full h-[52px] rounded-full overflow-hidden mb-6">
                <LinearGradient
                  colors={BRAND_GRADIENT}
                  locations={[0, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="w-full h-full"
                >
                  <TouchableOpacity
                    className="w-full h-full items-center justify-center"
                    onPress={() => setLeaveConfirmationVisible(false)}
                  >
                    <Text className="text-white text-[17px] font-semibold">Stay as Guest</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>

              {/* Leave as Guest Button */}
              <View className="w-full h-[52px] rounded-full overflow-hidden">
                <LinearGradient
                  colors={['#4A5568', '#2D3748']}
                  locations={[0, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="w-full h-full"
                >
                  <TouchableOpacity
                    className="w-full h-full items-center justify-center"
                    onPress={() => {
                      setLeaveConfirmationVisible(false);
                      handleConfirmedLeave();
                    }}
                  >
                    <Text className="text-white text-[17px] font-semibold">Leave as Guest</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
