import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, Text, SafeAreaView, Share, Alert, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectAccessToken } from '../../src/store/authSlice';
import { 
  StreamHeader, 
  StreamChatOverlay, 
  ViewerInputBar, 
  useStreamState, 
  useStreamChat, 
  useGiftAnimations,
  useFollowSystem,
  GiftModal,
  CoinPurchaseModal,
  LeaveConfirmationModal
} from '../../components/stream';
import { StreamVideo, StreamCall, useCallStateHooks, VideoRenderer } from '@stream-io/video-react-native-sdk';
import ipDetector from '../../src/utils/ipDetector';
import { useGetProfileQuery } from '../../src/store/authApi';
import { useGetStreamQuery, useJoinStreamMutation, useLeaveStreamMutation, useGetGiftsQuery, useSendGiftMutation, useLikeStreamMutation } from '../../src/store/streamsApi';
import { useGetWalletSummaryQuery, useGetCoinPackagesQuery, usePurchaseCoinsMutation } from '../../src/api/walletApi';
import { createStreamClient, createStreamUser } from '../../src/utils/streamClient';
import { StreamWebSocketService } from '../../src/services/StreamWebSocketService';
import GiftAnimation from '../../components/animations/GiftAnimation';

// Component that uses call state hooks - must be inside StreamCall
function StreamContent({ 
  streamDetails, 
  streamMessages, 
  chat, 
  giftAnimations, 
  hasJoined, 
  isConnecting, 
  videoLoadError, 
  joinAttemptCount, 
  openGiftModal, 
  handleLeaveModal, 
  handleShare,
  handleLike,
  isLiked,
  likeCount,
  baseURL,
  followSystem,
  userData,
  hostProfilePictureUrl
}: any) {
  const { useParticipantCount, useRemoteParticipants } = useCallStateHooks();
  const participantCount = useParticipantCount() || 0;
  const remoteParticipants = useRemoteParticipants();
  
  // Find the host participant (usually the first one or the one with video)
  const hostParticipant = remoteParticipants?.find(p => p.videoStream) || remoteParticipants?.[0];
  
  // Debug logging
  if (__DEV__) {
    console.log('🎥 Video Debug:', {
      participantCount,
      remoteParticipantsCount: remoteParticipants?.length || 0,
      hostParticipant: hostParticipant ? {
        userId: hostParticipant.userId,
        hasVideoStream: !!hostParticipant.videoStream,
        hasAudioStream: !!hostParticipant.audioStream,
        sessionId: hostParticipant.sessionId
      } : null,
      allParticipants: remoteParticipants?.map(p => ({
        userId: p.userId,
        hasVideo: !!p.videoStream,
        hasAudio: !!p.audioStream
      })) || []
    });
  }
  
  return (
    <View className="flex-1">
      {/* Video Layer */}
      <View className="flex-1 relative">
        {isConnecting ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#C42720" />
            <Text className="text-white mt-4">Connecting to stream...</Text>
            <Text className="text-gray-400 text-sm mt-2">
              Attempt {joinAttemptCount} of 3
            </Text>
          </View>
        ) : videoLoadError ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-white text-lg mb-4">{videoLoadError}</Text>
            <Text className="text-gray-400 mb-4">Please try refreshing or check your connection</Text>
          </View>
        ) : hostParticipant ? (
          <View style={{ flex: 1 }}>
            <VideoRenderer
              participant={hostParticipant}
            />
          </View>
        ) : (
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
        )}

        {/* Gift Animations Overlay */}
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
  
  const [hasJoined, setHasJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isOperationInProgress, setIsOperationInProgress] = useState(false);
  const [streamClient, setStreamClient] = useState<any>(null);
  const [call, setCall] = useState<any>(null);
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);
  const [joinAttemptCount, setJoinAttemptCount] = useState(0);
  const [giftModalVisible, setGiftModalVisible] = useState(false);
  const [coinPurchaseModalVisible, setCoinPurchaseModalVisible] = useState(false);
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [shouldOpenGiftModalAfterPurchase, setShouldOpenGiftModalAfterPurchase] = useState(false);
  const [sendingGift, setSendingGift] = useState(false);
  const [selectedGiftId, setSelectedGiftId] = useState<number | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  
  // Like functionality
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  
  // Profile picture URLs
  const [hostProfilePictureUrl, setHostProfilePictureUrl] = useState<string>('');
  const [viewerProfilePictureUrl, setViewerProfilePictureUrl] = useState<string>('');

  const [baseURL, setBaseURL] = useState<string>('');
  const initializationTimeoutRef = useRef<number | null>(null);

  // WebSocket for real-time messaging
  const [webSocketService, setWebSocketService] = useState<StreamWebSocketService | null>(null);
  const [realtimeMessages, setRealtimeMessages] = useState<any[]>([]);
  const [wsConnectionAttempts, setWsConnectionAttempts] = useState(0);
  const maxWsAttempts = 3;

  // Initialize baseURL
  useEffect(() => {
    const initBaseURL = async () => {
      const url = await ipDetector.getAPIBaseURL();
      setBaseURL(url);
    };
    initBaseURL();
  }, []);

  const { data: freshUserData } = useGetProfileQuery();
  const userData = freshUserData || currentUser;

  const [joinStream] = useJoinStreamMutation();
  const [leaveStream] = useLeaveStreamMutation();
  const [sendGift] = useSendGiftMutation();
  const [likeStream] = useLikeStreamMutation();
  const [purchaseCoins] = usePurchaseCoinsMutation();

  // Determine stream mode from params or stream details
  const modeFromParams = (params.mode as string) || '';
  const [streamMode, setStreamMode] = useState<'single' | 'multi'>(
    modeFromParams === 'multi' ? 'multi' : 'single'
  );

  // API calls
  const { 
    data: streamDetails, 
    isLoading: streamLoading, 
    error: streamError,
    refetch: refetchStreamDetails 
  } = useGetStreamQuery(streamId, { skip: !streamId });

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

  // Stream state and chat
  const { state, actions, messages: streamMessages } = useStreamState({ 
    streamId: streamId, 
    userRole: 'viewer' 
  });

  const chat = useStreamChat({
    streamId,
    userId: userData?.id?.toString(),
    username: userData?.username,
    isHost: false,
    profilePicture: viewerProfilePictureUrl,
  });

  // Merge WebSocket messages with existing chat messages for instant display
  const allMessages = React.useMemo(() => {
    const streamChatMessages = Array.isArray(chat.messages) ? chat.messages : [];
    const safeRealtimeMessages = Array.isArray(realtimeMessages) ? realtimeMessages : [];
    
    // Combine and sort by timestamp
    const combined = [...streamChatMessages, ...safeRealtimeMessages];
    
    // Remove duplicates based on unique ID only
    const uniqueMessages = combined.filter((message, index, array) => {
      if (!message || !message.message) return false;
      // Only deduplicate if we have a proper ID to compare
      if (!message.id) return true;
      return index === array.findIndex(m => m?.id === message.id);
    });
    
    // Sort by timestamp with safe date parsing
    return uniqueMessages.sort((a, b) => {
      // Safely parse timestamps with fallback for invalid dates
      const getTimestamp = (msg: any) => {
        if (!msg?.timestamp) return 0;
        
        // Handle ISO string timestamps (from local messages and new backend)
        if (typeof msg.timestamp === 'string') {
          const date = new Date(msg.timestamp);
          return isNaN(date.getTime()) ? 0 : date.getTime();
        }
        
        // Handle numeric timestamps (from old backend messages)
        if (typeof msg.timestamp === 'number') {
          // If it's a reasonable Unix timestamp (after year 2000)
          if (msg.timestamp > 946684800) {
            return msg.timestamp * 1000; // Convert to milliseconds
          }
          // If it's already in milliseconds or invalid, use as-is
          return msg.timestamp;
        }
        
        return 0;
      };
      
      const timeA = getTimestamp(a);
      const timeB = getTimestamp(b);
      return timeA - timeB;
    });
  }, [chat.messages, realtimeMessages]);

  // Gift animations
  const giftAnimations = useGiftAnimations({ 
    messages: allMessages, // Use combined messages for gift detection
    baseURL: baseURL
  });

  // Follow system
  const followSystem = useFollowSystem({
    userId: userData?.id?.toString(),
    targetUserId: streamDetails?.host?.id?.toString()
  });

  // Profile picture URL construction helper (like in host.tsx)
  const getProfilePictureUrl = async (user: any) => {
    if (user?.profile_picture_url) {
      if (user.profile_picture_url.startsWith('http')) {
        return user.profile_picture_url;
      }
      try {
        const apiBaseURL = await ipDetector.getAPIBaseURL();
        const webURL = apiBaseURL?.replace('/api/', '') || 'https://daremelive.pythonanywhere.com';
        return `${webURL}${user.profile_picture_url}`;
      } catch (error) {
        return `https://daremelive.pythonanywhere.com${user.profile_picture_url}`;
      }
    }
    
    if (user?.profile_picture) {
      if (user.profile_picture.startsWith('http')) {
        return user.profile_picture;
      }
      try {
        const apiBaseURL = await ipDetector.getAPIBaseURL();
        const webURL = apiBaseURL?.replace('/api/', '') || 'https://daremelive.pythonanywhere.com';
        return `${webURL}${user.profile_picture}`;
      } catch (error) {
        return `https://daremelive.pythonanywhere.com${user.profile_picture}`;
      }
    }
    
    return null;
  };

  // Safe data arrays with type adapters
  const safeGifts = Array.isArray(gifts) ? gifts.map(gift => ({
    ...gift,
    image_url: gift.icon_url,
    coin_cost: gift.cost
  })) : [];
  
  const safeCoinPackages = Array.isArray(coinPackages) ? coinPackages.map((pkg, index) => ({
    id: pkg.id,
    name: pkg.formatted_price || `${pkg.coins} Coins`,
    coins: pkg.coins,
    price: parseFloat(pkg.price) || 0,
    currency: pkg.currency,
    bonus_coins: pkg.bonus_coins,
    total_coins: pkg.total_coins,
    formatted_price: pkg.formatted_price,
    display_order: index,
    is_active: pkg.is_active
  })) : [];

  // Update stream mode when details are loaded
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
      console.log('🔍 Raw Host Data:', JSON.stringify(streamDetails.host, null, 2));
      
      getProfilePictureUrl(streamDetails.host).then(url => {
        console.log('🖼️ Host Profile Picture Debug:', {
          hostId: streamDetails.host.id,
          hostUsername: streamDetails.host.username,
          rawProfileUrl: streamDetails.host.profile_picture_url,
          constructedURL: url,
          baseURL: baseURL
        });
        if (url) {
          setHostProfilePictureUrl(url);
          console.log('✅ Setting hostProfilePictureUrl to:', url);
        } else {
          console.log('❌ No URL constructed for host profile picture');
        }
      });
    }
  }, [streamDetails?.host, baseURL]);

  // Update viewer profile picture URL when user data loads
  useEffect(() => {
    if (userData) {
      getProfilePictureUrl(userData).then(url => {
        console.log('🖼️ Viewer Profile Picture Debug:', {
          viewerId: userData.id,
          viewerUsername: userData.username,
          rawProfileUrl: userData.profile_picture_url,
          constructedURL: url,
          baseURL: baseURL
        });
        if (url) setViewerProfilePictureUrl(url);
      });
    }
  }, [userData, baseURL]);

  // Initialize WebSocket for real-time messaging
  useEffect(() => {
    console.log('[ViewerScreen] 🔍 WebSocket useEffect triggered:', {
      streamId: streamId ? 'exists' : 'missing',
      userId: userData?.id ? 'exists' : 'missing', 
      hasJoined,
      token: accessToken ? 'exists' : 'missing',
      wsConnectionAttempts,
      maxWsAttempts
    });

    // Debug currentUser object
    console.log('[ViewerScreen] 🔍 currentUser debug:', {
      hasCurrentUser: !!currentUser,
      currentUserKeys: currentUser ? Object.keys(currentUser) : 'none',
      hasAccessToken: !!accessToken,
      tokenLength: accessToken ? accessToken.length : 0,
      userId: currentUser?.id || currentUser?.user_id
    });

    if (!streamId || !userData?.id || !hasJoined || !accessToken) {
      console.log('[ViewerScreen] ❌ WebSocket initialization skipped - missing requirements');
      return;
    }
    
    // Prevent excessive connection attempts
    if (wsConnectionAttempts >= maxWsAttempts) {
      console.log('[ViewerScreen] Max WebSocket connection attempts reached, skipping');
      return;
    }

    console.log('[ViewerScreen] Initializing WebSocket for real-time chat...');

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
        console.log('[ViewerScreen] 🚨 User removed from stream:', message);
        Alert.alert(
          'Removed from Stream',
          'You have been removed from this stream by the host.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate back to home
                router.replace('/(tabs)/home');
              }
            }
          ],
          { cancelable: false }
        );
      },
      onParticipantRemoved: (userId, message) => {
        console.log('[ViewerScreen] 📢 Participant removed:', userId, message);
        // This will help update the UI to remove the participant from any lists
        // if we have participant lists in the viewer screen
      },
      onCameraToggled: (userId, enabled) => {
        console.log('Camera toggled:', userId, enabled);
      },
      onMicrophoneToggled: (userId, enabled) => {
        console.log('Microphone toggled:', userId, enabled);
      },
      onStreamMessage: (message) => {
        console.log('[ViewerScreen] 📨 Real-time message received:', message);
        console.log('[ViewerScreen] 🔍 Message userId:', message.user?.id, 'type:', typeof message.user?.id);
        console.log('[ViewerScreen] 🔍 Current userId:', userData?.id?.toString(), 'type:', typeof userData?.id?.toString());
        console.log('[ViewerScreen] 🔍 UserIds match:', message.user?.id?.toString() === userData?.id?.toString());
        
        // Don't add messages from the current user since they already added them locally
        const currentUserId = userData?.id?.toString();
        const messageUserId = message.user?.id?.toString();
        if (messageUserId === currentUserId) {
          console.log('[ViewerScreen] 🔄 Ignoring own message to prevent duplicate');
          return;
        }
        
        // Add to real-time messages for instant display
        setRealtimeMessages(prev => [...prev.slice(-49), message]);
      },
      onStreamState: (state) => {
        console.log('Stream state update:', state);
      },
      onError: (error) => {
        console.error('[ViewerScreen] WebSocket error:', error);
      },
    });

    // Connect to WebSocket with timeout and error handling
    const connectTimeout = setTimeout(() => {
      console.log('[ViewerScreen] WebSocket connection timeout, cleaning up...');
      wsService.disconnect();
      setWsConnectionAttempts(prev => prev + 1);
    }, 10000); // 10 second timeout

    wsService.connect().then(() => {
      clearTimeout(connectTimeout);
      console.log('[ViewerScreen] ✅ WebSocket connected for real-time chat');
      setWebSocketService(wsService);
      setWsConnectionAttempts(0); // Reset attempts on successful connection
    }).catch((error) => {
      clearTimeout(connectTimeout);
      console.error('[ViewerScreen] ❌ WebSocket connection failed:', error);
      setWsConnectionAttempts(prev => prev + 1);
      
      // If it's a 403 error, don't retry as it's likely an auth issue
      if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
        console.log('[ViewerScreen] Authentication error detected, not retrying WebSocket');
        setWsConnectionAttempts(maxWsAttempts); // Stop further attempts
      }
    });

    return () => {
      clearTimeout(connectTimeout);
      console.log('[ViewerScreen] Cleaning up WebSocket connection...');
      wsService.gracefulDisconnect();
      setWebSocketService(null);
    };
  }, [streamId, userData?.id, hasJoined]);

  // Debug StreamHeader props
  useEffect(() => {
    if (__DEV__ && streamDetails) {
      console.log('🎬 StreamHeader Props Debug:', {
        streamTitle: streamDetails?.title,
        hostFirstName: streamDetails?.host?.first_name,
        hostLastName: streamDetails?.host?.last_name,
        hostUsername: streamDetails?.host?.username,
        hostProfilePicture: hostProfilePictureUrl,
        hostProfilePictureLength: hostProfilePictureUrl?.length,
        hasStreamDetails: !!streamDetails,
        hasHost: !!streamDetails?.host
      });
    }
  }, [streamDetails, hostProfilePictureUrl]);

  // Handle gift modal after purchase
  useEffect(() => {
    if (shouldOpenGiftModalAfterPurchase && !coinPurchaseModalVisible) {
      setGiftModalVisible(true);
      setShouldOpenGiftModalAfterPurchase(false);
    }
  }, [shouldOpenGiftModalAfterPurchase, coinPurchaseModalVisible]);

  // Messages handling - same as host
  const messages = streamMessages || [];

  const openGiftModal = () => {
    setGiftModalVisible(true);
  };

  // Custom message handler that uses WebSocket when available
  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Send via WebSocket for instant delivery
    if (webSocketService) {
      console.log('[ViewerScreen] 🚀 Sending message via WebSocket:', message);
      webSocketService.sendChatMessage(message.trim());
      
      // Also add to local chat immediately for instant feedback
      const localMessage = {
        id: `local-${Date.now()}`,
        username: userData?.username || 'You',
        message: message.trim(),
        timestamp: new Date().toISOString(),
        isHost: false,
        userId: userData?.id?.toString(),
        profilePicture: viewerProfilePictureUrl
      };
      console.log('[ViewerScreen] 📝 Adding local message:', localMessage);
      setRealtimeMessages(prev => [...prev.slice(-49), localMessage]);
    } else {
      // Fallback to regular API call if WebSocket not available
      console.log('[ViewerScreen] WebSocket not available, using API fallback...');
      if (chat?.sendMessage) {
        await chat.sendMessage(message);
      }
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
      console.error('Failed to send like:', error);
      // Revert on error
      setIsLiked(false);
      setLikeCount(prev => prev - 1);
    }
  };

  const handleSendGift = async (gift: any) => {
    if (sendingGift || !walletSummary || walletSummary.coins < gift.coin_cost) {
      if (!walletSummary || walletSummary.coins < gift.coin_cost) {
        Alert.alert(
          'Insufficient Coins',
          `You need ${gift.coin_cost} coins to send this gift. Your balance: ${walletSummary?.coins || 0} coins.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Buy Coins', 
              onPress: () => {
                setGiftModalVisible(false);
                setCoinPurchaseModalVisible(true);
              }
            }
          ]
        );
      }
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
      
      // Refresh wallet to show updated balance
      refetchWallet();
      
      Alert.alert('Gift Sent!', `You sent ${gift.name} to the stream!`);
    } catch (error: any) {
      console.error('Failed to send gift:', error);
      
      if (error?.data?.error === 'Insufficient coins') {
        Alert.alert(
          'Insufficient Coins',
          'You don\'t have enough coins to send this gift.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Buy Coins', 
              onPress: () => {
                setShouldOpenGiftModalAfterPurchase(true);
                setGiftModalVisible(false);
                setCoinPurchaseModalVisible(true);
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to send gift. Please try again.');
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
      console.error('Failed to purchase coins:', error);
      Alert.alert('Purchase Failed', 'Failed to purchase coins. Please try again.');
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
        console.log('Backend cleanup: user was not registered');
      }
      
      // For viewers, just disconnect - no need to leave call since we never joined as participants
      if (streamClient) {
        await streamClient.disconnectUser();
      }
      
      setCall(null);
      setStreamClient(null);
      setHasJoined(false);
      setIsConnecting(false);
      setJoinAttemptCount(0);
      
      return true;
    } catch (error) {
      console.error('Failed to cleanup viewer connection:', error);
      return false;
    }
  };

  const initializeStreamViewer = async () => {
    if (isOperationInProgress || hasJoined || !streamDetails) {
      return;
    }

    const apiBaseURL = await ipDetector.getAPIBaseURL();
    
    if (joinAttemptCount >= 3) {
      Alert.alert(
        'Connection Failed',
        'Unable to connect to the stream after multiple attempts. Please check your connection and try again.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      return;
    }

    setJoinAttemptCount(prev => prev + 1);
    setIsOperationInProgress(true);

    try {
      setIsConnecting(true);

      const streamUser = createStreamUser(currentUser);
      const client = await createStreamClient(streamUser);
      
      if (!client) {
        Alert.alert('Error', 'Failed to connect to stream', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }
      setStreamClient(client);

      const callId = `stream_${streamId}`;
      const streamCall = client.call('default', callId);
      
      // For viewers, join the call but disable camera and microphone
      try {
        await streamCall.join({ 
          create: false
        });
        console.log('📺 Joined stream as viewer');
        
        // Disable camera and microphone for viewer
        await streamCall.camera.disable();
        await streamCall.microphone.disable();
      } catch (error) {
        console.log('⚠️ Stream not found, creating and joining as viewer...');
        // If call doesn't exist yet, create it and join as viewer
        await streamCall.join({ 
          create: true
        });
        
        // Disable camera and microphone for viewer
        await streamCall.camera.disable();
        await streamCall.microphone.disable();
      }
      
      setCall(streamCall);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // For backend, we still register as a viewer for analytics/chat purposes
      // but we don't join as an active participant in the video call
      if (streamDetails.status === 'live' && streamDetails.is_live) {
        try {
          await joinStream({
            streamId,
            data: { participant_type: 'viewer' }
          }).unwrap();
          console.log('✅ Registered as viewer in backend');
        } catch (joinError: any) {
          // If user is already in stream, that's okay - continue with connection
          if (joinError?.data?.error !== 'You are already in this stream') {
            throw joinError; // Re-throw if it's a different error
          }
          console.log('User already registered as viewer, continuing...');
        }
      }

      setHasJoined(true);
      setIsConnecting(false);
      setJoinAttemptCount(0);
      setVideoLoadError(null);
      
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
        initializationTimeoutRef.current = null;
      }
    } catch (error: any) {
      console.error('Stream viewer initialization error:', error);
      setIsConnecting(false);
      
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
        initializationTimeoutRef.current = null;
      }
      
      if (error?.data?.error === 'You are already in this stream') {
        const cleanupSuccess = await forceCleanupParticipation();
        
        if (cleanupSuccess) {
          Alert.alert(
            'Stream State Cleaned',
            'We detected you were already in this stream and cleaned up the state. Try joining again.',
            [
              { text: 'Try Again', onPress: () => initializeStreamViewer() },
              { text: 'Go Back', onPress: () => router.back() }
            ]
          );
        } else {
          Alert.alert(
            'Connection Issue',
            'There was an issue with your stream connection. Please try again or contact support.',
            [
              { text: 'Try Again', onPress: () => initializeStreamViewer() },
              { text: 'Go Back', onPress: () => router.back() }
            ]
          );
        }
      } else {
        Alert.alert('Connection Error', 'Failed to join stream. Please try again.');
      }
    } finally {
      setIsOperationInProgress(false);
    }
  };

  const handleLeaveStream = async () => {
    setLeaveModalVisible(false);
    
    if (isOperationInProgress) return;
    setIsOperationInProgress(true);

    try {
      // Leave backend stream if we joined it as a viewer
      if (hasJoined && streamDetails?.status === 'live' && streamDetails?.is_live) {
        try {
          await leaveStream(streamId).unwrap();
        } catch (error) {
          console.log('Backend leave failed (user may not have been registered)');
        }
      }
      
      // For viewers, we don't need to call.leave() since we never joined as participants
      // Just disconnect the client to stop watching
      if (streamClient) {
        await streamClient.disconnectUser();
      }
      
      router.back();
    } catch (error) {
      console.error('Failed to leave stream:', error);
      // Still navigate back even if there's an error
      router.back();
    } finally {
      setIsOperationInProgress(false);
    }
  };

  const handleShare = async () => {
    const apiBaseURL = await ipDetector.getAPIBaseURL();
    const shareUrl = `${apiBaseURL}/stream/${streamId}`;
    
    try {
      await Share.share({
        message: `Check out this stream: ${streamDetails?.title || 'Live Stream'}`,
        url: shareUrl,
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  useEffect(() => {
    if (streamDetails && userData?.id && !hasJoined && !isConnecting && !isOperationInProgress) {
      initializeStreamViewer();
    }
  }, [streamDetails, userData?.id, hasJoined, isConnecting, isOperationInProgress]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!hasJoined && !isConnecting && streamDetails) {
        setVideoLoadError('Stream took too long to load. Please try again.');
      }
    }, 30000);

    initializationTimeoutRef.current = timeout;

    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [streamDetails]);

  useEffect(() => {
    return () => {
      // Cleanup on component unmount - for viewers, just disconnect
      if (streamClient) {
        streamClient.disconnectUser().catch(console.error);
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
    console.log('🔍 Stream loading error details:', {
      streamError,
      streamDetails,
      streamId,
      hasStreamId: !!streamId
    });
    
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
                streamMessages={streamMessages}
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
                baseURL={baseURL}
                followSystem={followSystem}
                userData={userData}
                hostProfilePictureUrl={hostProfilePictureUrl}
              />
            </StreamCall>
          </StreamVideo>
        ) : (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#ffffff" />
            <Text className="text-white mt-4">Initializing stream...</Text>
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
          baseURL={baseURL || ''}
          hostId={streamDetails?.host?.id || null}
        />

        <ViewerInputBar
          onSendMessage={handleSendMessage}
          onLike={handleLike}
          onGiftPress={openGiftModal}
          isLiked={isLiked}
          likeCount={likeCount}
          hasJoined={hasJoined && !isConnecting}
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
          baseURL={baseURL}
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
