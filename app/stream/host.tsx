import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, ActivityIndicator, Text, SafeAreaView, Share, Alert, TouchableOpacity, TouchableWithoutFeedback, Keyboard, AppState } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser, selectAccessToken } from '../../src/store/authSlice';
import { StreamHeader, StreamChatOverlay, StreamInputBar, MultiParticipantInputBar, StreamControls, useStreamState, useHybridStreamChat, useGiftAnimations, useEndStream, EndStreamModal, MembersListModal } from '../../components/stream';
import { StreamVideo, StreamCall, useCallStateHooks, VideoRenderer } from '@stream-io/video-react-native-sdk';
import ipDetector from '../../src/utils/ipDetector';
import { useGetProfileQuery } from '../../src/store/authApi';
import { useCreateStreamMutation, useStreamActionMutation, streamsApi } from '../../src/store/streamsApi';
import GiftAnimation from '../../components/animations/GiftAnimation';
import { useStreamHeartbeat } from '../../src/hooks/useStreamHeartbeat';

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
  
  const modeFromParams = (params.mode as string) || '';
  const [streamMode, setStreamMode] = useState<'single' | 'multi'>(
    modeFromParams === 'multi' ? 'multi' : 'single'
  );
  
  const [streamId, setStreamId] = useState(streamIdFromParams);
  const [title, setTitle] = useState(titleFromParams);
  const [isCreatingStream, setIsCreatingStream] = useState(false);
  const [realtimeMessages, setRealtimeMessages] = useState<any[]>([]);

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

  const chat = useHybridStreamChat({
    streamId,
    streamTitle: title || streamDetails?.title || `${streamMode === 'multi' ? 'Multi ' : ''}Live Stream`,
    userId: userData?.id?.toString(),
    username: userData?.username,
    isHost: true,
    hostId: streamDetails?.host?.id?.toString() || userData?.id?.toString(),
    profilePicture: '',
    useStreamChat: true,
    baseURL: state.baseURL,
  });

  const initialHeartbeatSent = useRef(false);

  const allMessages = React.useMemo(() => {
    const chatMessages = chat.messages || [];
    const safeRealtimeMessages = Array.isArray(realtimeMessages) ? realtimeMessages : [];
    
    // Combine and sort by timestamp (same as viewer)
    const combined = [...chatMessages, ...safeRealtimeMessages];
    
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
    baseURL: state.baseURL || '',
  });
  
  React.useEffect(() => {
  }, [giftAnimations.activeGiftAnimations, allMessages]);

  const endStreamSystem = useEndStream({
    streamId,
    onStreamEnd: () => {
      if (state.call) {
        state.call.leave().catch(console.error);
      }
      actions.handleLeaveStream();
      initialHeartbeatSent.current = false;
    },
  });

  // Add heartbeat to keep stream alive
  const { sendHeartbeat } = useStreamHeartbeat(
    streamId, 
    state.hasJoined && !endStreamSystem.isEndingStream // Stop heartbeat when ending stream
  );

  useEffect(() => {
    if (!userData?.id) return;

    const cleanupOrphanedStreams = async () => {
      try {
        
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
  }, [userData?.id, state.baseURL, accessToken, streamAction, dispatch, streamId]);

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
      
      if (previousStatus === 'live' && currentStatus === 'ended') {
        
        // Show the modal with "already ended" context
        setTimeout(() => {
          endStreamSystem.showEndStreamModal();
        }, 1000); // Brief delay to let any animations finish
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
              '📸 Profile Picture Required',
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
      actions.initializeStream();
    }
  }, [currentUser?.id, streamId]); // Remove hasJoined and isOperationInProgress from deps to prevent re-initialization

  useEffect(() => {
    if (state.hasJoined && streamId && sendHeartbeat && !initialHeartbeatSent.current) {
      initialHeartbeatSent.current = true;
      
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
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [state.hasJoined, streamId, sendHeartbeat, streamAction, dispatch]);

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
        
        dispatch(streamsApi.util.invalidateTags(['Stream']));
        
        if (state.call) {
          state.call.leave().catch(console.error);
        }
        
      } catch (error: any) {
        
        dispatch(streamsApi.util.invalidateTags(['Stream']));
        
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
          executeStreamCleanup('App backgrounded (IMMEDIATE force-close protection)');
        }
        
      } else if (nextAppState === 'inactive') {
        if (state.hasJoined && !cleanupExecuted) {
          executeStreamCleanup('App inactive (iOS termination protection)');
        }
        
      } else if (nextAppState === 'active') {
        if (backgroundTimer) {
          clearTimeout(backgroundTimer);
          backgroundTimer = null;
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
      
      if (backgroundTimer) {
        clearTimeout(backgroundTimer);
      }
      
      initialHeartbeatSent.current = false;
      
      if (state.hasJoined && streamId && !cleanupExecuted) {
        cleanupExecuted = true;
        
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
        
        if (state.call) {
          state.call.leave().catch(console.error);
        }
      }
    };
  }, [streamId, state.hasJoined, state.call]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    await chat.sendMessage(message.trim());
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
          hostId={streamDetails?.host?.id || userData?.id}
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
          streamStatus={streamDetails?.status as 'live' | 'ended' | 'disconnected' | null}
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
          }}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

export default React.memo(UnifiedHostStreamScreen);
