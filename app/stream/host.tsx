import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, ActivityIndicator, Text, SafeAreaView, Share, Alert, TouchableOpacity, TouchableWithoutFeedback, Keyboard, AppState } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser, selectAccessToken } from '../../src/store/authSlice';
import { StreamHeader, StreamChatOverlay, StreamInputBar, MultiParticipantInputBar, StreamControls, useStreamState, useStreamChat, useGiftAnimations, useEndStream, EndStreamModal, MembersListModal } from '../../components/stream';
import { StreamVideo, StreamCall, useCallStateHooks, VideoRenderer } from '@stream-io/video-react-native-sdk';
import ipDetector from '../../src/utils/ipDetector';
import { useGetProfileQuery } from '../../src/store/authApi';
import { useCreateStreamMutation, useStreamActionMutation, streamsApi } from '../../src/store/streamsApi';
import AddTeamIcon from '../../assets/icons/add-team.svg';
import GiftAnimation from '../../components/animations/GiftAnimation';
import { useStreamHeartbeat } from '../../src/hooks/useStreamHeartbeat';
import { StreamWebSocketService } from '../../src/services/StreamWebSocketService';

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
  
  // Determine mode from params or existing streamId
  const modeFromParams = (params.mode as string) || '';
  const [streamMode, setStreamMode] = useState<'single' | 'multi'>(
    modeFromParams === 'multi' ? 'multi' : 'single'
  );
  
  const [streamId, setStreamId] = useState(streamIdFromParams);
  const [title, setTitle] = useState(titleFromParams);
  const [isCreatingStream, setIsCreatingStream] = useState(false);

  const { data: freshUserData } = useGetProfileQuery();
  const userData = freshUserData || currentUser;

  const [createStream] = useCreateStreamMutation();
  const [streamAction] = useStreamActionMutation();
  const [profilePictureUrl, setProfilePictureUrl] = useState<string>('');
  const [membersModalVisible, setMembersModalVisible] = useState(false);

  // Memoize the useStreamState parameters to prevent unnecessary re-renders
  const streamStateParams = useMemo(() => ({
    streamId: streamId,
    userRole: 'host' as const
  }), [streamId]);

  const { state, actions, streamDetails, messages: streamMessages } = useStreamState(streamStateParams);

  const chat = useStreamChat({
    streamId,
    userId: userData?.id?.toString(),
    username: userData?.username,
    isHost: true,
    profilePicture: profilePictureUrl,
  });

  // REAL-TIME CHAT: WebSocket for instant messaging
  const [webSocketService, setWebSocketService] = useState<StreamWebSocketService | null>(null);
  const [realtimeMessages, setRealtimeMessages] = useState<any[]>([]);
  const [wsConnectionAttempts, setWsConnectionAttempts] = useState(0);
  const maxWsAttempts = 3; // Limit WebSocket connection attempts
  const initialHeartbeatSent = useRef(false); // Track if initial heartbeat was sent

  // Initialize WebSocket for real-time chat with better error handling
  useEffect(() => {
    console.log('[HostScreen] 🔍 WebSocket useEffect triggered:', {
      streamId: streamId ? 'exists' : 'missing',
      userId: userData?.id ? 'exists' : 'missing', 
      hasJoined: state.hasJoined,
      token: accessToken ? 'exists' : 'missing',
      wsConnectionAttempts,
      maxWsAttempts
    });

    // Debug currentUser object
    console.log('[HostScreen] 🔍 currentUser debug:', {
      hasCurrentUser: !!currentUser,
      currentUserKeys: currentUser ? Object.keys(currentUser) : 'none',
      hasAccessToken: !!accessToken,
      tokenLength: accessToken ? accessToken.length : 0,
      userId: currentUser?.id || currentUser?.user_id
    });

    if (!streamId || !userData?.id || !state.hasJoined || !accessToken) {
      console.log('[HostScreen] ❌ WebSocket initialization skipped - missing requirements');
      return;
    }
    
    // Prevent excessive connection attempts
    if (wsConnectionAttempts >= maxWsAttempts) {
      console.log('[HostScreen] Max WebSocket connection attempts reached, skipping');
      return;
    }

    console.log('[HostScreen] Initializing WebSocket for real-time chat...');

    const wsService = new StreamWebSocketService({
      streamId,
      userId: userData.id.toString(),
      token: accessToken,
      onGuestInvited: (guest, invitedBy) => {
        console.log('Guest invited:', guest);
      },
      onGuestJoined: (participant) => {
        console.log('Guest joined:', participant);
      },
      onGuestDeclined: (guest) => {
        console.log('Guest declined:', guest);
      },
      onGuestRemoved: (guestId, removedBy) => {
        console.log('Guest removed:', guestId);
      },
      onUserRemoved: (message, removedBy) => {
        console.log('[HostScreen] 📢 User removed notification:', message);
        // Host doesn't get removed, so this is just for logging
      },
      onParticipantRemoved: (userId, message) => {
        console.log('[HostScreen] 📢 Participant removed:', userId, message);
        // The UI will automatically refresh when the WebSocket receives the update
        // Force a small delay to ensure backend has processed the removal
        setTimeout(() => {
          actions.refetchMessages();
        }, 500);
      },
      onCameraToggled: (userId, enabled) => {
        console.log('Camera toggled:', userId, enabled);
      },
      onMicrophoneToggled: (userId, enabled) => {
        console.log('Microphone toggled:', userId, enabled);
      },
      onStreamMessage: (message) => {
        console.log('[HostScreen] 📨 Real-time message received:', message);
        
        // Don't add messages from the current user since they already added them locally
        const currentUserId = userData?.id?.toString();
        const messageUserId = message.user?.id?.toString();
        if (messageUserId === currentUserId) {
          console.log('[HostScreen] 🔄 Ignoring own message to prevent duplicate');
          return;
        }
        
        // Add to real-time messages for instant display
        setRealtimeMessages(prev => [...prev.slice(-49), message]);
      },
      onStreamState: (state) => {
        console.log('Stream state update:', state);
      },
      onError: (error) => {
        console.error('[HostScreen] WebSocket error:', error);
        // Don't increment attempts for regular errors, only for connection failures
      },
    });

    // Connect to WebSocket with timeout and error handling
    const connectTimeout = setTimeout(() => {
      console.log('[HostScreen] WebSocket connection timeout, cleaning up...');
      wsService.disconnect();
      setWsConnectionAttempts(prev => prev + 1);
    }, 10000); // 10 second timeout

    wsService.connect().then(() => {
      clearTimeout(connectTimeout);
      console.log('[HostScreen] ✅ WebSocket connected for real-time chat');
      setWebSocketService(wsService);
      setWsConnectionAttempts(0); // Reset attempts on successful connection
    }).catch((error) => {
      clearTimeout(connectTimeout);
      console.error('[HostScreen] ❌ WebSocket connection failed:', error);
      setWsConnectionAttempts(prev => prev + 1);
      
      // If it's a 403 error, don't retry as it's likely an auth issue
      if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
        console.log('[HostScreen] Authentication error detected, not retrying WebSocket');
        setWsConnectionAttempts(maxWsAttempts); // Stop further attempts
      }
    });

    return () => {
      clearTimeout(connectTimeout);
      console.log('[HostScreen] Cleaning up WebSocket connection...');
      wsService.gracefulDisconnect(); // Use graceful disconnect
      setWebSocketService(null);
    };
  }, [streamId, userData?.id, state.hasJoined]); // Removed token and baseURL to prevent constant recreation

  // Merge WebSocket messages with existing chat messages for instant display
  const allMessages = React.useMemo(() => {
    const chatMessages = chat.messages || [];
    
    // Convert real-time WebSocket messages to chat format
    const convertedRealtimeMessages = realtimeMessages.map((msg: any) => {
      // Safely handle timestamp conversion
      let timestamp;
      if (typeof msg.timestamp === 'string') {
        // Already in ISO format (from new backend)
        timestamp = msg.timestamp;
      } else if (typeof msg.timestamp === 'number') {
        // Handle numeric timestamps carefully
        if (msg.timestamp > 946684800 && msg.timestamp < 946684800000) {
          // Looks like Unix timestamp, convert to milliseconds then to ISO
          timestamp = new Date(msg.timestamp * 1000).toISOString();
        } else if (msg.timestamp > 946684800000) {
          // Already in milliseconds
          timestamp = new Date(msg.timestamp).toISOString();
        } else {
          // Invalid or very small timestamp, use current time
          timestamp = new Date().toISOString();
        }
      } else {
        // No timestamp or invalid format
        timestamp = new Date().toISOString();
      }

      return {
        id: `ws-${msg.timestamp || Date.now()}`,
        username: msg.user?.username || msg.user?.first_name || 'User',
        message: msg.message || '',
        timestamp: timestamp,
        isHost: msg.user?.id === userData?.id,
        userId: msg.user?.id?.toString(),
        profilePicture: msg.user?.profile_picture_url
      };
    });

    // Combine and deduplicate messages
    const combined = [...chatMessages, ...convertedRealtimeMessages];
    const seen = new Set();
    return combined.filter(msg => {
      const key = `${msg.message}-${msg.username}-${msg.timestamp.substring(0, 19)}`; // Ignore milliseconds
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => {
      // Safe timestamp comparison
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      
      // Handle invalid dates
      if (isNaN(timeA) && isNaN(timeB)) return 0;
      if (isNaN(timeA)) return 1; // Put invalid dates at the end
      if (isNaN(timeB)) return -1;
      
      return timeA - timeB;
    });
  }, [chat.messages, realtimeMessages, userData?.id]);

  // Clear processed real-time messages periodically to prevent memory leaks
  useEffect(() => {
    const cleanup = setInterval(() => {
      setRealtimeMessages(prev => prev.slice(-20)); // Keep only last 20
    }, 30000); // Clean up every 30 seconds

    return () => clearInterval(cleanup);
  }, []);

  const giftAnimations = useGiftAnimations({
    messages: allMessages || [], // Use combined messages for gift detection
    baseURL: state.baseURL || '',
  });

  const endStreamSystem = useEndStream({
    streamId,
    onStreamEnd: () => {
      if (state.call) {
        state.call.leave().catch(console.error);
      }
      actions.handleLeaveStream();
      // Reset heartbeat tracking when stream ends
      initialHeartbeatSent.current = false;
    },
  });

  // Add heartbeat to keep stream alive
  const { sendHeartbeat } = useStreamHeartbeat(
    streamId, 
    state.hasJoined && !endStreamSystem.isEndingStream // Stop heartbeat when ending stream
  );

  // Debug: Log heartbeat status
  useEffect(() => {
    const heartbeatActive = state.hasJoined && !endStreamSystem.isEndingStream;
    console.log(`[HostScreen] Heartbeat status - streamId: ${streamId}, hasJoined: ${state.hasJoined}, isEndingStream: ${endStreamSystem.isEndingStream}, heartbeatActive: ${heartbeatActive}`);
  }, [streamId, state.hasJoined, endStreamSystem.isEndingStream]);

  // FORCE-CLOSE PROTECTION: Additional cleanup on app initialization
  // This helps clean up streams that were orphaned by force-close
  useEffect(() => {
    if (!userData?.id) return;

    const cleanupOrphanedStreams = async () => {
      try {
        console.log('[HostScreen] Checking for orphaned streams from previous session...');
        
        // Get user's streams to check if any are stuck live
        const response = await fetch(`${state.baseURL}/streams/my-streams/`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const liveStreams = data.results?.filter((s: any) => s.status === 'live') || [];
          
          if (liveStreams.length > 0) {
            console.log(`[HostScreen] Found ${liveStreams.length} orphaned live streams, cleaning up...`);
            
            // End each orphaned stream
            for (const orphanStream of liveStreams) {
              // Only clean up if it's not the current stream we're about to start
              if (orphanStream.id !== streamId) {
                try {
                  await streamAction({
                    streamId: orphanStream.id,
                    action: { action: 'end' }
                  }).unwrap();
                  console.log(`[HostScreen] ✅ Cleaned up orphaned stream: ${orphanStream.title}`);
                } catch (error) {
                  console.log(`[HostScreen] ⚠️ Could not clean up orphaned stream ${orphanStream.id}:`, error);
                  // Don't fail the whole process if one cleanup fails
                }
              }
            }
            
            // Invalidate cache after cleanup
            dispatch(streamsApi.util.invalidateTags(['Stream']));
          } else {
            console.log('[HostScreen] No orphaned streams found - good!');
          }
        }
      } catch (error) {
        console.log('[HostScreen] Could not check for orphaned streams:', error);
        // Don't fail the app if this check fails
      }
    };

    cleanupOrphanedStreams();
  }, [userData?.id, state.baseURL, accessToken, streamAction, dispatch, streamId]);

  const messages = allMessages || []; // Use combined real-time + chat messages

  // Auto-detect mode from existing stream details if not set
  useEffect(() => {
    if (streamDetails && !modeFromParams) {
      const detectedMode = streamDetails.mode || (streamDetails.max_seats && streamDetails.max_seats > 1 ? 'multi' : 'single');
      setStreamMode(detectedMode);
    }
  }, [streamDetails, modeFromParams]);

  useEffect(() => {
    const createStreamFromTitleScreen = async () => {
      if (fromTitleScreen && !streamId && userData?.id && !isCreatingStream) {
        setIsCreatingStream(true);
        
        try {
          const streamData = {
            title: titleFromParams.trim() || `${userData.username || 'User'}'s ${streamMode === 'multi' ? 'Multi ' : ''}Live Stream`,
            mode: streamMode,
            channel: channel as 'video' | 'game' | 'truth-or-dare' | 'banter',
            max_seats: streamMode === 'multi' ? maxSeats : 1,
          };

          const newStream = await createStream(streamData).unwrap();
          
          setStreamId(newStream.id);
          setTitle(newStream.title);
          
        } catch (error: any) {
          Alert.alert(
            'Stream Creation Failed',
            error?.data?.error || error?.message || 'Failed to create stream. Please try again.',
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
  }, [fromTitleScreen, userData?.id, titleFromParams, channel, maxSeats, streamMode]); // CRITICAL: Removed streamId and isCreatingStream to prevent infinite re-render loops

  const handleShare = async () => {
    try {
      const baseURL = await ipDetector.getAPIBaseURL();
      const webURL = baseURL?.replace('/api/', '') || 'https://daremelive.pythonanywhere.com';
      const shareUrl = `${webURL}/stream/${streamId}?utm_source=mobile_share&utm_medium=social&host=${userData?.username}`;
      
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

  const getProfilePictureUrl = async () => {
    if (userData?.profile_picture_url) {
      return userData.profile_picture_url;
    }
    
    if (userData?.profile_picture) {
      if (userData.profile_picture.startsWith('http')) {
        return userData.profile_picture;
      }
      try {
        const baseURL = await ipDetector.getAPIBaseURL();
        const webURL = baseURL?.replace('/api/', '') || 'https://daremelive.pythonanywhere.com';
        return `${webURL}${userData.profile_picture}`;
      } catch (error) {
        return `https://daremelive.pythonanywhere.com${userData.profile_picture}`;
      }
    }
    
    return null;
  };

  useEffect(() => {
    getProfilePictureUrl().then(setProfilePictureUrl);
  }, [userData?.profile_picture, userData?.profile_picture_url]);

  // Initialize stream when user data and stream ID are available  
  useEffect(() => {
    if (currentUser?.id && streamId && !state.hasJoined && !state.isOperationInProgress) {
      console.log('[HostScreen] Initializing stream...');
      actions.initializeStream();
    }
  }, [currentUser?.id, streamId]); // Remove hasJoined and isOperationInProgress from deps to prevent re-initialization

  // CRITICAL: Send immediate heartbeat when stream is joined to start it
  useEffect(() => {
    if (state.hasJoined && streamId && sendHeartbeat && !initialHeartbeatSent.current) {
      console.log('[HostScreen] Stream joined! Sending immediate heartbeat to start stream...');
      initialHeartbeatSent.current = true; // Mark as sent to prevent re-execution
      
      // Add a small delay to prevent race conditions with initialization
      const timer = setTimeout(() => {
        sendHeartbeat().then(() => {
          dispatch(streamsApi.util.invalidateTags(['Stream']));
        }).catch((error) => {
          streamAction({
            streamId,
            action: { action: 'start' }
          }).unwrap().then(() => {
            dispatch(streamsApi.util.invalidateTags(['Stream']));
          }).catch((startError) => {
          });
        });
      }, 1000); // 1 second delay to ensure initialization is complete
      
      return () => clearTimeout(timer);
    }
  }, [state.hasJoined, streamId, sendHeartbeat, streamAction, dispatch]); // Added state.hasJoined back with other stable dependencies

  // Industry Standard Stream Cleanup - End stream when app is force closed or host leaves
  useEffect(() => {
    if (!streamId || !state.hasJoined) return;

    let backgroundTimer: number | null = null;
    let isCleanupInProgress = false;
    let cleanupExecuted = false; // Prevent multiple cleanup executions

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
        
        // CRITICAL: Immediately invalidate all stream caches to remove from popular channels
        dispatch(streamsApi.util.invalidateTags(['Stream']));
        
        // Also try to leave the GetStream call
        if (state.call) {
          state.call.leave().catch(console.error);
        }
        
      } catch (error: any) {

        
        // Even if the API call failed, invalidate cache in case it was a network issue
        dispatch(streamsApi.util.invalidateTags(['Stream']));
        
        // Only retry if it's not a 404 (stream already deleted) or 400 (bad request)
        if (error?.status !== 404 && error?.status !== 400) {
         
          setTimeout(() => {
            if (!cleanupExecuted) { // Only retry if cleanup hasn't succeeded yet
              streamAction({ streamId, action: { action: 'end' } }).unwrap()
                .then(() => {
                 
                  dispatch(streamsApi.util.invalidateTags(['Stream']));
                  cleanupExecuted = true;
                })
                .catch(e => {
                 
                  cleanupExecuted = true; // Stop further attempts
                });
            }
          }, 2000);
        } else {
         
          cleanupExecuted = true;
        }
      } finally {
        isCleanupInProgress = false;
      }
    };

    const handleAppStateChange = (nextAppState: string) => {
      
      
      if (nextAppState === 'background') {
        // For mobile streaming apps, immediate cleanup is critical for force-close scenarios
        // This ensures streams don't stay "ghost" live when user force closes
       
        if (state.hasJoined && !cleanupExecuted) {
          // Execute cleanup immediately without any delay for force-close scenarios
          executeStreamCleanup('App backgrounded (IMMEDIATE force-close protection)');
        }
        
      } else if (nextAppState === 'inactive') {
        // iOS-specific: When app is about to be terminated
      
        if (state.hasJoined && !cleanupExecuted) {
          // Pre-emptive cleanup for iOS app termination
          executeStreamCleanup('App inactive (iOS termination protection)');
        }
        
      } else if (nextAppState === 'active') {
        // Clear backup timer if user returns quickly
        if (backgroundTimer) {
         
          clearTimeout(backgroundTimer);
          backgroundTimer = null;
        }
        // Don't reset cleanupExecuted here - once cleanup is done, it's done
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Global cleanup insurance - runs when component unmounts
    return () => {
      subscription?.remove();
      
      if (backgroundTimer) {
        clearTimeout(backgroundTimer);
      }
      
      // Reset heartbeat tracking when component unmounts
      initialHeartbeatSent.current = false;
      
      // Emergency cleanup for component unmount (navigation, force close)
      if (state.hasJoined && streamId && !cleanupExecuted) {
      
        cleanupExecuted = true; // Mark as executed to prevent race conditions
        
        // Fire-and-forget cleanup (don't await since component is unmounting)
        streamAction({ 
          streamId, 
          action: { action: 'end' } 
        }).unwrap()
        .then(() => {
          
          // Invalidate cache even on unmount
          dispatch(streamsApi.util.invalidateTags(['Stream']));
        })
        .catch((error) => {
         
          // Still invalidate cache in case it was a network issue
          dispatch(streamsApi.util.invalidateTags(['Stream']));
        });
        
        // Also try to leave the call
        if (state.call) {
          state.call.leave().catch(console.error);
        }
      }
    };
  }, [streamId, state.hasJoined, state.call]); // Removed streamAction and dispatch to prevent re-render loops

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Send via WebSocket for instant delivery
    if (webSocketService) {
      console.log('[HostScreen] 🚀 Sending message via WebSocket:', message);
      webSocketService.sendChatMessage(message.trim());
      
      // Also add to local chat immediately for instant feedback
      chat.addMessage({
        id: `local-${Date.now()}`,
        username: userData?.username || 'You',
        message: message.trim(),
        timestamp: new Date().toISOString(),
        isHost: true,
        userId: userData?.id?.toString(),
        profilePicture: profilePictureUrl
      });
    } else {
      // Fallback to regular API call if WebSocket not available
      console.log('[HostScreen] WebSocket not available, using API fallback...');
      if (chat?.sendMessage) {
        await chat.sendMessage(message);
      }
    }
  };

  const handleAddParticipant = () => {
    setMembersModalVisible(true);
  };

  // Single participant video component
  const SingleParticipantVideo = () => {
    if (!state.call || !state.streamClient) return null;
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
    const { useParticipants } = useCallStateHooks();
    const participants = useParticipants();
    
    const localParticipant = participants.find((p: any) => p.isLocalParticipant);
    const remoteParticipants = participants.filter((p: any) => !p.isLocalParticipant);
    
    // Only consider remote participants with active video streams as actual participants
    // Viewers don't have video streams, so they shouldn't trigger screen division
    // This ensures the host screen remains full when viewers join, and only splits when actual participants join
    const activeRemoteParticipants = remoteParticipants.filter((p: any) => p.videoStream);
    
    return (
      <View className="flex-1 bg-black">
        {activeRemoteParticipants.length === 0 ? (
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
              const allActiveParticipants = [localParticipant, ...activeRemoteParticipants].filter(Boolean);
              return allActiveParticipants.map((participant: any, index: number) => (
                <View 
                  key={participant.sessionId} 
                  className={`bg-gray-800 ${allActiveParticipants.length <= 2 ? 'w-full h-1/2' : allActiveParticipants.length <= 4 ? 'w-1/2 h-1/2' : 'w-1/3 h-1/3'}`}
                >
                  <VideoRenderer participant={participant} objectFit="cover" />
                  <View className="absolute bottom-2 left-2 bg-black/60 rounded px-2 py-1">
                    <Text className="text-white text-xs">
                      {participant.isLocalParticipant ? 'You' : participant.name || 'Guest'}
                    </Text>
                  </View>
                </View>
              ));
            })()}
          </View>
        )}
      </View>
    );
  };

  // Dynamic video component based on mode
  const VideoLayer = () => {
    if (!state.call || !state.streamClient) return null;
    
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
        {state.isConnecting || !state.hasJoined ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#C42720" />
            <Text className="text-white mt-4">Starting your {streamMode === 'multi' ? 'multi-' : ''}stream…</Text>
          </View>
        ) : (
          state.streamClient && state.call && (
            <StreamVideo client={state.streamClient}>
              <StreamCall call={state.call}>
                <VideoLayer />
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
          baseURL={state.baseURL}
          hostId={userData?.id}
        />

        {/* Dynamic Input Bar based on mode */}
        {streamMode === 'multi' ? (
          <MultiParticipantInputBar
            onSendMessage={handleSendMessage}
            onAddParticipant={handleAddParticipant}
            hasJoined={state.hasJoined}
            keyboardHeight={chat.keyboardHeight}
            isKeyboardVisible={chat.isKeyboardVisible}
          />
        ) : (
          <StreamInputBar
            onSendMessage={chat.sendMessage}
            onGiftPress={() => {}}
            hasJoined={state.hasJoined}
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
        />

        <MembersListModal
          visible={membersModalVisible}
          onClose={() => setMembersModalVisible(false)}
          streamId={streamId}
          participants={streamDetails?.participants?.filter(p => p.participant_type === 'guest').map(p => ({
            id: p.user.id,
            participant_id: p.id, // StreamParticipant ID needed for removal
            username: p.user.username,
            first_name: p.user.first_name,
            last_name: p.user.last_name,
            full_name: p.user.full_name,
            followers_count: undefined, // Not available in StreamHost
            profile_picture_url: p.user.profile_picture_url || undefined,
            is_online: p.is_active, // Use is_active as online status
            participant_type: p.participant_type,
            is_streaming: p.is_active
          })) || []}
          viewers={streamDetails?.participants?.filter(p => p.participant_type === 'viewer').map(p => ({
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
          onRefresh={() => {
            // Trigger refresh of stream data
            console.log('Refreshing stream data...');
          }}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

export default React.memo(UnifiedHostStreamScreen);
