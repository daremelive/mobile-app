import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Alert, ActivityIndicator, SafeAreaView, Text, TouchableOpacity, TouchableWithoutFeedback, Keyboard, AppState, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectAccessToken } from '../../src/store/authSlice';
import {
  StreamHeader,
  StreamChatOverlay,
  useStreamState,
  useHybridStreamChat,
  useGiftAnimations,
  useFollowSystem,
  ViewerInputBar,
  GiftModal,
  CoinPurchaseModal,
  LeaveConfirmationModal
} from '../../components/stream';
import { StreamVideo, StreamCall, useCallStateHooks, VideoRenderer, CallContent, useCall } from '@stream-io/video-react-native-sdk';
import {
  StreamMode,
  RealtimeMessages
} from '../../types/stream';
import { MEDIA_BASE_URL, buildProfilePictureURL, buildAvatarFallbackURL } from '../../src/config/env';
import { useGetStreamQuery, useLikeStreamMutation, useLeaveStreamMutation, useSendGiftMutation, useJoinStreamMutation, useGetGiftsQuery } from '../../src/store/streamsApi';
import { useGetWalletSummaryQuery, usePurchaseCoinsMutation, useGetCoinPackagesQuery } from '../../src/api/walletApi';
import { useGetProfileQuery } from '../../src/store/authApi';
import GiftAnimation from '../../components/animations/GiftAnimation';

// Component that uses call state hooks - must be inside StreamCall
function StreamContent({
  streamDetails,
  giftAnimations,
  hasJoined,
  isConnecting,
  videoLoadError,
  joinAttemptCount,
  connectionState,
  refetchStreamQuery
}: any) {
  const { useParticipantCount, useRemoteParticipants, useParticipants, useLocalParticipant } = useCallStateHooks();
  const participantCount = useParticipantCount() || 0;
  const remoteParticipants = useRemoteParticipants();
  const allParticipants = useParticipants();
  const localParticipant = useLocalParticipant();
  const call = useCall();

  // STABILITY FIX: Keep track of last known remote participants
  // This prevents the video from disappearing when SDK temporarily clears participants
  const lastKnownParticipantsRef = React.useRef<any[]>([]);

  // Update ref only when we have valid participants
  React.useEffect(() => {
    if (remoteParticipants && remoteParticipants.length > 0) {
      lastKnownParticipantsRef.current = remoteParticipants;
    }
  }, [remoteParticipants]);

  // Use current remote participants, or fall back to last known if temporarily empty
  const stableRemoteParticipants = (remoteParticipants && remoteParticipants.length > 0)
    ? remoteParticipants
    : lastKnownParticipantsRef.current;

  // Helper function to render a participant tile with video or audio-only fallback
  const renderParticipantTile = (participant: any, label: string, forceVideo: boolean = false) => {
    // Check multiple ways if participant has video
    const hasVideoStream = !!participant.videoStream;
    const hasPublishedVideo = participant.publishedTracks?.some((t: any) => t.kind === 'video');
    const hasPublishedTracks = (participant.publishedTracks?.length || 0) > 0;
    const isRemoteParticipant = !participant.isLocalParticipant;

    // ALWAYS try VideoRenderer for remote participants - let the SDK handle it
    // The SDK knows better than us whether video is available
    const shouldTryVideo = forceVideo || isRemoteParticipant || hasVideoStream || hasPublishedVideo || hasPublishedTracks;

    // ALWAYS use VideoRenderer for remote participants - it handles video/audio gracefully
    if (shouldTryVideo) {
      return (
        <View style={{ flex: 1, backgroundColor: '#1a1a1a' }} key={`viewer-video-container-${participant.sessionId}`}>
          <VideoRenderer
            participant={participant}
            objectFit="cover"
            style={{ flex: 1 }}
          />
        </View>
      );
    } else {
      // Audio-only fallback (Zoom/Meet style)
      return (
        <View className="flex-1 bg-gray-800 items-center justify-center" key={`viewer-audio-${participant.sessionId}`}>
          <View className="w-16 h-16 rounded-full bg-gray-700 items-center justify-center mb-2">
            <Text className="text-white text-2xl">🎙️</Text>
          </View>
          <Text className="text-white text-lg font-semibold">
            {participant.name || label}
          </Text>
          <Text className="text-gray-400 text-sm mt-1">Audio Only</Text>
        </View>
      );
    }
  };

  // For viewers, look for participants with video streams (the host)
  // Try multiple approaches to find the host's video stream
  const hostParticipant = useMemo(() => {
    // Method 1: Look for non-local participants with active video streams
    let host = allParticipants?.find(p => !p.isLocalParticipant && p.videoStream);

    if (host) {
      return host;
    }

    // Method 2: Look for remote participants with video streams
    host = remoteParticipants?.find(p => p.videoStream);

    if (host) {
      return host;
    }

    // Method 3: Look for any participant with video stream
    host = allParticipants?.find(p => p.videoStream);

    if (host) {
      return host;
    }

    // Method 4: Check for any published tracks (Stream.io might take time to propagate)
    // Handle both number and array for publishedTracks
    host = allParticipants?.find(p => {
      if (p.isLocalParticipant) return false;
      const ptValue = p.publishedTracks;
      const ptCount = typeof ptValue === 'number' ? ptValue : (Array.isArray(ptValue) ? ptValue.length : 0);
      return ptCount > 0;
    });

    if (host) {
      return host;
    }

    // Method 5: Fallback to first non-local participant (even without video yet)
    host = allParticipants?.find(p => !p.isLocalParticipant);

    if (host) {
      return host;
    }

    // Method 6: Final fallback to any remote participant
    host = stableRemoteParticipants?.[0];

    return host;
  }, [allParticipants, stableRemoteParticipants]);

  // STABLE: Memoize active participants to prevent flickering during SDK state updates
  // Use stableRemoteParticipants which preserves last known state
  const activeParticipants = useMemo(() => {
    // For viewers, ALL remote participants are "active" (host + promoted co-hosts)
    // stableRemoteParticipants already excludes local participant and keeps last known state
    return stableRemoteParticipants || [];
  }, [stableRemoteParticipants]);

  // Force call state refresh if no video after reasonable time
  useEffect(() => {
    if (hasJoined && !hostParticipant?.videoStream && participantCount > 1) {
      const timeout = setTimeout(() => {
        // State check timeout - could trigger refresh logic here if needed
      }, 10000);

      return () => clearTimeout(timeout);
    }
  }, [hasJoined, hostParticipant?.videoStream, participantCount]);

  return (
    <View className="flex-1">
      <View className="flex-1 relative">
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
                  // Refresh stream details to retry
                  refetchStreamQuery();
                }}
              >
                <Text className="text-white text-center font-semibold">Retry Connection</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : isConnecting ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#C42720" />
            <Text className="text-white mt-4">Connecting to stream...</Text>
            <Text className="text-gray-400 text-sm mt-2">
              Attempt {joinAttemptCount} of 3
            </Text>
            {connectionState.consecutiveFailures > 0 && (
              <Text className="text-yellow-400 text-xs mt-1">
                Connection issues detected. Retrying...
              </Text>
            )}
          </View>
        ) : videoLoadError ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-white text-lg mb-4">{videoLoadError}</Text>
            <Text className="text-gray-400 mb-4">Please try refreshing or check your connection</Text>
          </View>
        ) : (() => {
          if (activeParticipants.length > 1) {
            // Multi-participant grid view - show ALL active participants (Zoom/Meet style)
            const displayParticipants = activeParticipants;

            return (
              <View style={{ flex: 1 }}>

                {/* Multi-participant grid layout */}
                <View className="flex-1">
                  {displayParticipants.length === 2 ? (
                    // Two participants - vertical split
                    <View className="flex-1">
                      <View className="flex-1">
                        {renderParticipantTile(displayParticipants[0], 'Participant 1')}
                        <View className="absolute bottom-2 left-2 bg-black/60 rounded px-2 py-1">
                          <Text className="text-white text-xs font-medium">
                            {displayParticipants[0].name || 'Participant 1'}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-1">
                        {renderParticipantTile(displayParticipants[1], 'Participant 2')}
                        <View className="absolute bottom-2 left-2 bg-black/60 rounded px-2 py-1">
                          <Text className="text-white text-xs font-medium">
                            {displayParticipants[1].name || 'Participant 2'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : displayParticipants.length === 3 ? (
                    // Three participants - one large, two small
                    <View className="flex-1">
                      <View className="flex-2">
                        {renderParticipantTile(displayParticipants[0], 'Host')}
                        <View className="absolute bottom-2 left-2 bg-black/60 rounded px-2 py-1">
                          <Text className="text-white text-xs font-medium">
                            {displayParticipants[0].name || 'Host'}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-1 flex-row">
                        <View className="flex-1">
                          {renderParticipantTile(displayParticipants[1], 'Guest 1')}
                          <View className="absolute bottom-1 left-1 bg-black/60 rounded px-1 py-0.5">
                            <Text className="text-white text-xs">
                              {displayParticipants[1].name || 'Guest 1'}
                            </Text>
                          </View>
                        </View>
                        <View className="flex-1">
                          {renderParticipantTile(displayParticipants[2], 'Guest 2')}
                          <View className="absolute bottom-1 left-1 bg-black/60 rounded px-1 py-0.5">
                            <Text className="text-white text-xs">
                              {displayParticipants[2].name || 'Guest 2'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ) : (
                    // Four or more participants - 2x2 grid
                    <View className="flex-1">
                      <View className="flex-1 flex-row">
                        <View className="flex-1">
                          {renderParticipantTile(displayParticipants[0], 'Participant 1')}
                          <View className="absolute bottom-1 left-1 bg-black/60 rounded px-1 py-0.5">
                            <Text className="text-white text-xs">
                              {displayParticipants[0].name || 'Participant 1'}
                            </Text>
                          </View>
                        </View>
                        <View className="flex-1">
                          {renderParticipantTile(displayParticipants[1], 'Participant 2')}
                          <View className="absolute bottom-1 left-1 bg-black/60 rounded px-1 py-0.5">
                            <Text className="text-white text-xs">
                              {displayParticipants[1].name || 'Participant 2'}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View className="flex-1 flex-row">
                        <View className="flex-1">
                          {renderParticipantTile(displayParticipants[2], 'Participant 3')}
                          <View className="absolute bottom-1 left-1 bg-black/60 rounded px-1 py-0.5">
                            <Text className="text-white text-xs">
                              {displayParticipants[2].name || 'Participant 3'}
                            </Text>
                          </View>
                        </View>
                        <View className="flex-1">
                          {displayParticipants[3] ? renderParticipantTile(displayParticipants[3], 'Participant 4') : renderParticipantTile(displayParticipants[0], 'Participant 4')}
                          <View className="absolute bottom-1 left-1 bg-black/60 rounded px-1 py-0.5">
                            <Text className="text-white text-xs">
                              {(displayParticipants[3] || displayParticipants[0]).name || 'Participant 4'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          } else if (activeParticipants.length === 1) {
            // Single participant view (typically host only)
            const participant = activeParticipants[0];
            return (
              <View style={{ flex: 1 }}>
                {renderParticipantTile(participant, participant.name || 'Host')}
              </View>
            );
          } else if (hostParticipant) {
            // Fallback: Try to show host participant if available
            return (
              <View style={{ flex: 1 }}>
                {renderParticipantTile(hostParticipant, hostParticipant.name || 'Host')}
              </View>
            );
          } else if (participantCount > 0) {
            // Fallback to CallContent
            return (
              <View style={{ flex: 1 }}>
                <CallContent />
              </View>
            );
          } else {
            // No participants
            return (
              <View className="flex-1 items-center justify-center">
                <Text className="text-white text-lg">Waiting for host to start video...</Text>
                <Text className="text-gray-400 text-sm mt-2">
                  {streamDetails?.status === 'live' ? 'Stream is live' : 'Stream not started yet'}
                </Text>
                <Text className="text-gray-400 text-xs mt-1">
                  Participants: {participantCount} | Remote: {remoteParticipants?.length || 0}
                </Text>
                {__DEV__ && hostParticipant && (
                  <Text className="text-red-400 text-xs mt-1">
                    Debug: Host found but no video stream detected
                  </Text>
                )}
              </View>
            );
          }
        })()}

        {giftAnimations.activeGiftAnimations.map((animation: any) => (
          <GiftAnimation
            key={animation.id}
            gift={animation.gift}
            sender={animation.sender}
            animationKey={animation.id}
            onAnimationComplete={() => giftAnimations.handleGiftAnimationComplete(animation.id)}
          />
        ))}
      </View>
    </View>
  );
}

export default function UnifiedViewerStreamScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const currentUser = useSelector(selectCurrentUser) as any;
  const accessToken = useSelector(selectAccessToken);

  const streamId = params.streamId as string;

  const [joinAttemptCount, setJoinAttemptCount] = useState(0);
  const [giftModalVisible, setGiftModalVisible] = useState(false);
  const [coinPurchaseModalVisible, setCoinPurchaseModalVisible] = useState(false);
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [shouldOpenGiftModalAfterPurchase, setShouldOpenGiftModalAfterPurchase] = useState(false);
  const [sendingGift, setSendingGift] = useState(false);
  const [selectedGiftId, setSelectedGiftId] = useState<number | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const [hostProfilePictureUrl, setHostProfilePictureUrl] = useState<string>('');
  const [viewerProfilePictureUrl, setViewerProfilePictureUrl] = useState<string>('');

  const initializationTimeoutRef = useRef<number | null>(null);

  const [realtimeMessages, setRealtimeMessages] = useState<RealtimeMessages>([]);

  // App state for smart polling
  const [appState, setAppState] = useState(AppState.currentState);

  const { data: freshUserData } = useGetProfileQuery();
  const userData = freshUserData || currentUser;

  const [joinStream] = useJoinStreamMutation();
  const [leaveStream] = useLeaveStreamMutation();
  const [sendGift] = useSendGiftMutation();
  const [likeStream] = useLikeStreamMutation();
  const [purchaseCoins] = usePurchaseCoinsMutation();

  const modeFromParams = (params.mode as string) || '';
  const [streamMode, setStreamMode] = useState<StreamMode>(
    modeFromParams === 'multi' ? 'multi' : 'single'
  );

  const {
    data: walletSummary,
    isLoading: walletLoading,
    refetch: refetchWallet
  } = useGetWalletSummaryQuery();

  const {
    data: gifts = [],
    isLoading: giftsLoading,
    refetch: refetchGifts
  } = useGetGiftsQuery();

  const {
    data: coinPackages = [],
    isLoading: coinPackagesLoading,
    refetch: refetchCoinPackages
  } = useGetCoinPackagesQuery();

  const {
    streamClient,
    call,
    hasJoined,
    isConnecting,
    isOperationInProgress,
    videoLoadError,
    connectionState,
    // Actions with renamed variables to avoid conflicts
    initializeStream: hookInitializeStream,
    handleLeaveStream: hookHandleLeaveStream,
    handleSendMessage: hookHandleSendMessage,
    setVideoLoadError: hookSetVideoLoadError,
    refetchMessages,
    resetConnectionState,
    refetchStreamDetails,
  } = useStreamState({
    streamId: streamId,
    userRole: 'viewer' // FORCE viewer role - viewers should never end streams
  });

  // Get stream details, loading state, and error from RTK Query
  const {
    data: streamDetails,
    isLoading: streamLoading,
    error: streamError,
    refetch: refetchStreamQuery
  } = useGetStreamQuery(streamId, {
    pollingInterval: 10000, // Poll every 10 seconds to detect promotion changes
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const chat = useHybridStreamChat({
    streamId,
    streamTitle: streamDetails?.title || 'Live Stream',
    userId: userData?.id?.toString(),
    username: userData?.username,
    isHost: false,
    hostId: streamDetails?.host?.id?.toString(),
    profilePicture: viewerProfilePictureUrl,
    useStreamChat: true,
    baseURL: MEDIA_BASE_URL,
  });

  const allMessages = React.useMemo(() => {
    const streamChatMessages = Array.isArray(chat.messages) ? chat.messages : [];
    const safeRealtimeMessages = Array.isArray(realtimeMessages) ? realtimeMessages : [];

    // Transform RealtimeMessage to match the expected interface
    const transformedRealtimeMessages = safeRealtimeMessages.map((msg: any) => ({
      ...msg,
      timestamp: msg.created_at || msg.timestamp, // Add timestamp field from created_at
    }));

    const combined = [...streamChatMessages, ...transformedRealtimeMessages];

    const uniqueMessages = combined.filter((message, index, array) => {
      if (!message || !message.message) return false;
      if (!message.id) return true;
      return index === array.findIndex(m => m?.id === message.id);
    });

    return uniqueMessages.sort((a, b) => {
      const getTimestamp = (msg: any) => {
        // Check for both timestamp and created_at properties
        const timeValue = msg?.timestamp || msg?.created_at;
        if (!timeValue) return 0;

        if (typeof timeValue === 'string') {
          const date = new Date(timeValue);
          return isNaN(date.getTime()) ? 0 : date.getTime();
        }

        if (typeof timeValue === 'number') {
          if (timeValue > 946684800) {
            return timeValue * 1000;
          }
          return timeValue;
        }

        return 0;
      };

      const timeA = getTimestamp(a);
      const timeB = getTimestamp(b);
      return timeA - timeB;
    });
  }, [chat.messages, realtimeMessages]);

  const giftAnimations = useGiftAnimations({
    messages: allMessages,
    baseURL: MEDIA_BASE_URL
  });

  const followSystem = useFollowSystem({
    userId: userData?.id?.toString(),
    targetUserId: streamDetails?.host?.id?.toString()
  });

  const getProfilePictureUrl = (user: any, baseURL: string) => {
    if (user?.profile_picture_url) {
      if (user.profile_picture_url.startsWith('http')) {
        return user.profile_picture_url;
      }
      const webURL = baseURL?.replace('/api/', '') || 'https://daremelive.pythonanywhere.com';
      const profilePath = user.profile_picture_url.startsWith('/') ? user.profile_picture_url : `/${user.profile_picture_url}`;
      const fullUrl = `${webURL}${profilePath}`;
      return fullUrl;
    }

    if (user?.profile_picture) {
      if (user.profile_picture.startsWith('http')) {
        return user.profile_picture;
      }
      const webURL = baseURL?.replace('/api/', '') || 'https://daremelive.pythonanywhere.com';
      // Ensure no double slashes
      const profilePath = user.profile_picture.startsWith('/') ? user.profile_picture : `/${user.profile_picture}`;
      const fullUrl = `${webURL}${profilePath}`;
      return fullUrl;
    }

    return null;
  };

  const safeGifts = Array.isArray(gifts) ? gifts.map(gift => ({
    ...gift,
    image_url: gift.icon_url,
    coin_cost: gift.cost
  })) : [];

  const safeCoinPackages = Array.isArray(coinPackages) ? coinPackages.map((pkg, index) => ({
    id: pkg.id,
    name: pkg.formatted_price || `${pkg.coins} Riz`,
    coins: pkg.coins,
    price: parseFloat(pkg.price) || 0,
    currency: pkg.currency,
    bonus_coins: pkg.bonus_coins,
    total_coins: pkg.total_coins,
    formatted_price: pkg.formatted_price,
    display_order: index,
    is_active: pkg.is_active
  })) : [];

  useEffect(() => {
    if (streamDetails?.mode) {
      setStreamMode(streamDetails.mode as 'single' | 'multi');
    }
  }, [streamDetails?.mode]);

  // Initialize like count from stream details
  useEffect(() => {
    if (streamDetails?.likes_count) {
      setLikeCount(streamDetails.likes_count);
    }
  }, [streamDetails?.likes_count]);

  // Update host profile picture URL when stream details load
  useEffect(() => {
    if (streamDetails?.host) {
      const url = buildProfilePictureURL(streamDetails.host.profile_picture_url);
      if (url) {
        setHostProfilePictureUrl(url);
      } else {
        const fallbackUrl = buildAvatarFallbackURL(streamDetails.host.full_name || streamDetails.host.username);
        setHostProfilePictureUrl(fallbackUrl);
      }
    }
  }, [streamDetails?.host]);

  // Check if current user has been promoted to guest and redirect
  useEffect(() => {
    if (streamDetails?.participants && userData?.id) {
      const currentUserParticipant = streamDetails.participants.find(
        (participant: any) => participant.user?.id === userData.id
      );

      if (currentUserParticipant?.participant_type === 'guest') {
        // Show success message before redirecting
        Alert.alert(
          '🎉 You\'ve been promoted!',
          'You are now a guest speaker. Redirecting to the participant screen...',
          [
            {
              text: 'OK',
              onPress: () => {
                router.replace({
                  pathname: '/stream/multi/[id]',
                  params: {
                    id: streamId,
                    mode: streamMode,
                    promoted: 'true' // Flag to indicate this user was just promoted
                  }
                });
              }
            }
          ]
        );
      }
    }
  }, [streamDetails?.participants, userData?.id, streamId, streamMode, router]);

  // Listen for promotion events via WebSocket to refetch stream details
  // Note: Removed socket-based promotion events as they're no longer supported
  // in the current Stream Chat implementation
  /*
  useEffect(() => {
    if (chat?.socket && userData?.id) {
      const handlePromotionEvent = (data: any) => {
        if (data.event === 'user_promoted' && data.data?.user_id === userData.id) {
          refetchStreamDetails();
        }
      };

      // Listen for promotion events
      chat.socket.on('promotion_event', handlePromotionEvent);

      return () => {
        chat.socket.off('promotion_event', handlePromotionEvent);
      };
    }
  }, [chat?.socket, userData?.id, refetchStreamDetails]);
  */

  // Update viewer profile picture URL when user data loads
  useEffect(() => {
    if (userData) {
      const url = buildProfilePictureURL(userData.profile_picture_url);
      if (url) {
        setViewerProfilePictureUrl(url);
      } else {
        const fallbackUrl = buildAvatarFallbackURL(userData.full_name || userData.username);
        setViewerProfilePictureUrl(fallbackUrl);
      }
    }
  }, [userData]);

  useEffect(() => {
    if (shouldOpenGiftModalAfterPurchase && !coinPurchaseModalVisible) {
      setGiftModalVisible(true);
      setShouldOpenGiftModalAfterPurchase(false);
    }
  }, [shouldOpenGiftModalAfterPurchase, coinPurchaseModalVisible]);

  const messages = chat.messages || [];

  const openGiftModal = () => {
    setGiftModalVisible(true);
  };

  // Custom message handler - uses Stream Chat exclusively
  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    if (chat?.sendMessage) {
      try {
        await chat.sendMessage(message.trim());
      } catch (error) {
        // Message send failed - handled by UI
      }
    } else {
    }
  };

  // Like handler
  const handleLike = async () => {
    if (isLiked) return; // Prevent multiple likes

    setIsLiked(true);
    setLikeCount(prev => prev + 1);

    // Send like to backend API
    try {
      await likeStream(streamId).unwrap();
    } catch (error) {
      // Revert on error
      setIsLiked(false);
      setLikeCount(prev => prev - 1);
    }
  };

  const handleSendGift = async (gift: any) => {
    // Check if user has enough coins first, before any other checks
    if (!walletSummary || walletSummary.coins < gift.cost) {
      const coinsNeeded = gift.cost - (walletSummary?.coins || 0);
      Alert.alert(
        'Need more Riz',
        `You need ${coinsNeeded} more coins to send "${gift.name}".\n\nYour balance: ${walletSummary?.coins || 0} coins\nGift cost: ${gift.cost} coins`,
        [
          { text: 'Maybe Later', style: 'cancel' },
          {
            text: 'Get Riz',
            style: 'default',
            onPress: () => {
              setGiftModalVisible(false);
              setCoinPurchaseModalVisible(true);
              setShouldOpenGiftModalAfterPurchase(true);
            }
          }
        ],
        { cancelable: true }
      );
      return;
    }

    if (sendingGift) {
      return;
    }

    setSendingGift(true);
    setSelectedGiftId(gift.id);

    try {
      const result = await sendGift({
        streamId: streamId,
        data: {
          gift_id: gift.id,
        }
      }).unwrap();

      // Close gift modal
      setGiftModalVisible(false);

      try {
        if (chat.chatProvider === 'stream-chat' && chat.sendGiftEvent) {
          const giftEventData = {
            gift_id: gift.id,
            gift_name: gift.name,
            gift_icon: gift.icon_url, // Use icon_url instead of icon
            gift_cost: gift.cost,
            gift: gift,
            sender_id: userData?.id?.toString(),
            sender_username: userData?.username || 'Anonymous',
            sender_full_name: userData?.first_name && userData?.last_name
              ? `${userData.first_name} ${userData.last_name}`
              : userData?.full_name || userData?.username || 'Anonymous',
            sender_profile_picture: userData?.profile_picture_url || userData?.profile_picture,
            stream_id: streamId,
            timestamp: new Date().toISOString(),
          };

          // Send the gift event to all participants
          await chat.sendGiftEvent(giftEventData);

          // ALSO send as a chat message so it appears in the chat feed like TikTok
          await chat.sendMessage(`sent ${gift.name}`, {
            customType: 'gift',
            gift_id: gift.id,
            gift_name: gift.name,
            gift_icon: gift.icon_url, // Use icon_url instead of icon
            gift_cost: gift.cost,
            gift: gift,
          });

        } else {
          // Stream Chat not available
        }
      } catch (chatError) {
        // Failed to send gift event
      }

      refetchWallet();

      Alert.alert(
        '🎁 Gift Sent!',
        `You sent "${gift.name}" to the stream! 🌟\n\nRemaining balance: ${(walletSummary?.coins || 0) - gift.cost} coins`,
        [{ text: 'Awesome!', style: 'default' }]
      );
    } catch (error: any) {
      if (error?.data?.error === 'Insufficient Riz') {
        Alert.alert(
          'Insufficient Riz',
          'Your Riz balance has changed. Please refresh and try again.',
          [
            { text: 'OK', style: 'cancel' },
            {
              text: 'Get more Riz',
              onPress: () => {
                setShouldOpenGiftModalAfterPurchase(true);
                setGiftModalVisible(false);
                setCoinPurchaseModalVisible(true);
              }
            }
          ]
        );
      } else {
        Alert.alert(' Oops!', 'Something went wrong sending your gift. Please try again.');
      }
    } finally {
      setSendingGift(false);
      setSelectedGiftId(null);
    }
  };

  const handleCoinPurchase = async (coinPackage: any) => {
    if (isPurchasing) return;

    setIsPurchasing(true);

    try {
      await purchaseCoins({
        package_id: coinPackage.id,
        payment_method: 'paystack', // or 'flutterwave'
      }).unwrap();

      Alert.alert(
        'Purchase Successful!',
        `You purchased ${coinPackage.coins} coins for ${coinPackage.price}!`
      );

      // Refresh wallet to show new balance
      refetchWallet();

      // Close modal and potentially open gift modal
      setCoinPurchaseModalVisible(false);

      if (shouldOpenGiftModalAfterPurchase) {
        setGiftModalVisible(true);
        setShouldOpenGiftModalAfterPurchase(false);
      }
    } catch (error: any) {
      Alert.alert('Purchase Failed', 'Failed to purchase Riz. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const forceCleanupParticipation = async () => {
    try {
      // Try to leave backend registration
      try {
        await leaveStream(streamId).unwrap();
      } catch (error) {
        // User was not registered, ignore
      }

      // For viewers, just disconnect - no need to leave call since we never joined as participants
      if (streamClient) {
        await streamClient.disconnectUser();
      }

      // Reset connection state using the hook's action
      resetConnectionState();
      setJoinAttemptCount(0);

      return true;
    } catch (error) {
      return false;
    }
  };

  const retryInitialization = async () => {
    try {
      await hookInitializeStream();
    } catch (error) {
      hookSetVideoLoadError('Failed to join stream. Please try again.');
    }
  };

  const handleLeaveStream = async () => {
    setLeaveModalVisible(false);

    if (isOperationInProgress) return;
    // The hook will manage isOperationInProgress internally

    try {
      // Use the hook's leave function which handles everything properly
      await hookHandleLeaveStream();

      router.back();
    } catch (error) {
      // Still navigate back even if there's an error
      router.back();
    }
  };

  const handleShare = async () => {
    const shareUrl = `${MEDIA_BASE_URL}/stream/${streamId}`;

    try {
      await Share.share({
        message: `Check out this stream: ${streamDetails?.title || 'Live Stream'}`,
        url: shareUrl,
      });
    } catch (error) {
      // Share failed - no action needed
    }
  };

  const handleJoinAsParticipant = async () => {
    try {
      if (!call) {
        Alert.alert('Error', 'Stream not ready. Please wait and try again.');
        return;
      }

      // First check if we have camera permissions
      try {
        // Enable camera and microphone for participant
        await call.camera.enable();
        await call.microphone.enable();

        // Update participant state
        setIsParticipant(true);

        Alert.alert('Success', 'You are now participating in the stream!');
      } catch (enableError) {
        Alert.alert(
          'Permission Required',
          'Please allow camera and microphone access to participate in the stream.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Join Failed',
        'Unable to join as participant. Please try again later.',
        [{ text: 'OK' }]
      );
    }
  };

  useEffect(() => {
    if (userData?.id && streamId && !hasJoined && !isOperationInProgress) {
      // Add a race condition with timeout for initialization
      const initPromise = hookInitializeStream();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Initialization timeout')), 20000) // Increased to 20 seconds
      );

      Promise.race([initPromise, timeoutPromise]).catch((error) => {
        hookSetVideoLoadError(
          error.message === 'Initialization timeout'
            ? 'Stream initialization took too long. Please check your internet connection and try again.'
            : 'Failed to join stream. Please check your internet connection and try again.'
        );
      });
    }
  }, [userData?.id, streamId, hasJoined, isOperationInProgress, streamDetails, streamLoading]); // Include stream loading state

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!hasJoined && !isConnecting && streamDetails) {
        hookSetVideoLoadError('Stream took too long to load. Please try again.');
      }
    }, 15000); // Reduced from 30s to 15s

    initializationTimeoutRef.current = timeout;

    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [streamDetails]);

  useEffect(() => {
    return () => {
      if (streamClient) {
        streamClient.disconnectUser().catch(() => {
          // Cleanup disconnection failed - ignore
        });
      }
    };
  }, [streamClient]);

  if (streamLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#ffffff" />
        <Text className="text-white mt-4">Loading stream...</Text>
      </SafeAreaView>
    );
  }

  if (streamError || !streamDetails) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <Text className="text-white text-lg mb-4">Failed to load stream</Text>
        <Text className="text-gray-400 mb-4">Please check your connection and try again</Text>
        {__DEV__ && (
          <Text className="text-red-400 text-xs mt-4 px-4 text-center">
            Debug: {streamError ? JSON.stringify(streamError, null, 2) : 'No stream details found'}
          </Text>
        )}
      </SafeAreaView>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View className="flex-1 bg-black">
        {streamClient && call ? (
          <StreamVideo client={streamClient}>
            <StreamCall call={call}>
              <StreamContent
                streamDetails={streamDetails}
                streamMessages={chat.messages || []}
                chat={chat}
                giftAnimations={giftAnimations}
                hasJoined={hasJoined}
                isConnecting={isConnecting}
                videoLoadError={videoLoadError}
                joinAttemptCount={joinAttemptCount}
                openGiftModal={openGiftModal}
                handleLeaveModal={() => setLeaveModalVisible(true)}
                handleShare={handleShare}
                handleLike={handleLike}
                isLiked={isLiked}
                likeCount={likeCount}
                baseURL={MEDIA_BASE_URL}
                followSystem={followSystem}
                userData={userData}
                hostProfilePictureUrl={hostProfilePictureUrl}
                connectionState={connectionState}
                actions={{
                  initializeStream: hookInitializeStream,
                  handleLeaveStream: hookHandleLeaveStream,
                  handleSendMessage: hookHandleSendMessage,
                  setVideoLoadError: hookSetVideoLoadError,
                  refetchMessages,
                  resetConnectionState,
                  refetchStreamDetails,
                }}
                refetchStreamQuery={refetchStreamQuery}
              />
            </StreamCall>
          </StreamVideo>
        ) : videoLoadError ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-red-400 text-lg mb-4">{videoLoadError}</Text>
            <TouchableOpacity
              onPress={retryInitialization}
              className="bg-blue-600 px-6 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold">Try Again</Text>
            </TouchableOpacity>
            {__DEV__ && (
              <Text className="text-gray-500 text-xs mt-4 text-center px-4">
                Debug: streamClient={!!streamClient}, call={!!call}, hasJoined={hasJoined}, isConnecting={isConnecting}
              </Text>
            )}
          </View>
        ) : (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#ffffff" />
            <Text className="text-white mt-4">Initializing stream...</Text>
            {__DEV__ && (
              <Text className="text-gray-500 text-xs mt-2 text-center px-4">
                streamClient={!!streamClient}, call={!!call}, hasJoined={hasJoined}, isConnecting={isConnecting}, isOperationInProgress={isOperationInProgress}
              </Text>
            )}
          </View>
        )}

        <StreamHeader
          streamTitle={streamDetails?.title}
          hostFirstName={streamDetails?.host?.first_name}
          hostLastName={streamDetails?.host?.last_name}
          hostUsername={streamDetails?.host?.username}
          hostProfilePicture={hostProfilePictureUrl || undefined}
          viewerCount={streamDetails?.viewer_count ?? 0}
          likesCount={streamDetails?.likes_count ?? 0}
          isFollowing={followSystem.isFollowing}
          onToggleFollow={followSystem.toggleFollow}
          disableFollow={streamDetails?.host?.id === userData?.id}
          onClose={() => setLeaveModalVisible(true)}
          onShare={handleShare}
        />

        <StreamChatOverlay
          messages={allMessages || []}
          keyboardHeight={chat.keyboardHeight || 0}
          isKeyboardVisible={chat.isKeyboardVisible || false}
          inputBarHeight={72}
          baseURL={MEDIA_BASE_URL || ''}
          hostId={streamDetails?.host?.id || null}
        />

        <ViewerInputBar
          onSendMessage={handleSendMessage}
          onLike={handleLike}
          onGiftPress={openGiftModal}
          isLiked={isLiked}
          likeCount={likeCount}
          hasJoined={hasJoined && !isConnecting}
          isMultiStream={streamDetails?.mode === 'multi'}
          isParticipant={isParticipant}
        />

        {/* Modular Modals */}
        <GiftModal
          visible={giftModalVisible}
          onClose={() => setGiftModalVisible(false)}
          gifts={safeGifts}
          onSendGift={handleSendGift}
          onBuyCoins={() => {
            setGiftModalVisible(false);
            setCoinPurchaseModalVisible(true);
          }}
          walletBalance={walletSummary?.coins || 0}
          isRefreshing={giftsLoading}
          onRefresh={refetchGifts}
          baseURL={MEDIA_BASE_URL}
        />

        <CoinPurchaseModal
          visible={coinPurchaseModalVisible}
          onClose={() => setCoinPurchaseModalVisible(false)}
          coinPackages={safeCoinPackages}
          onPurchase={handleCoinPurchase}
          walletBalance={walletSummary?.coins || 0}
          isRefreshing={coinPackagesLoading}
          onRefresh={refetchCoinPackages}
          isPurchasing={isPurchasing}
        />

        <LeaveConfirmationModal
          visible={leaveModalVisible}
          onCancel={() => setLeaveModalVisible(false)}
          onConfirm={handleLeaveStream}
          title="Leave Stream"
          message="Are you sure you want to leave this stream?"
          confirmText="Leave"
          cancelText="Stay"
        />
      </View>
    </TouchableWithoutFeedback>
  );
}
