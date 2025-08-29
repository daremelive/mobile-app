import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { View, Alert, ActivityIndicator, SafeAreaView, Text, TouchableOpacity, TouchableWithoutFeedback, Keyboard, AppState, Platform, ScrollView, StatusBar, Share } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectAccessToken } from '../../src/store/authSlice';
import {
  StreamHeader, 
  StreamChatOverlay,
  StreamInputBar,
  useStreamState,
  useHybridStreamChat,
  StreamControlButton,
  useGiftAnimations,
  MultiParticipantInputBar
} from '../../components/stream';
import { StreamVideo, StreamCall, useCallStateHooks, VideoRenderer, CallContent } from '@stream-io/video-react-native-sdk';
import { MEDIA_BASE_URL, buildProfilePictureURL, buildAvatarFallbackURL } from '../../src/config/env';
import { useGetStreamQuery, useStreamActionMutation, useLikeStreamMutation, useLeaveStreamMutation, useSendGiftMutation, useGetStreamTokenMutation } from '../../src/store/streamsApi';
import { useGetProfileQuery } from '../../src/store/authApi';
import GiftAnimation from '../../components/animations/GiftAnimation';
import { useLocalizedTranslation } from '../../src/hooks/useLocalizedTranslation';
import { useCoinPurchase } from '../../src/hooks/useCoinPurchase';
import logger from '../../src/utils/logger';

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
  
  const hostParticipant = remoteParticipants?.find(p => p.videoStream) || remoteParticipants?.[0];
  
  return (
    <View className="flex-1">
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
  
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  
  const [hostProfilePictureUrl, setHostProfilePictureUrl] = useState<string>('');
  const [viewerProfilePictureUrl, setViewerProfilePictureUrl] = useState<string>('');

  const initializationTimeoutRef = useRef<number | null>(null);

  const [realtimeMessages, setRealtimeMessages] = useState<any[]>([]);

  const { data: freshUserData } = useGetProfileQuery();
  const userData = freshUserData || currentUser;

  const [joinStream] = useJoinStreamMutation();
  const [leaveStream] = useLeaveStreamMutation();
  const [sendGift] = useSendGiftMutation();
  const [likeStream] = useLikeStreamMutation();
  const [purchaseCoins] = usePurchaseCoinsMutation();

  const modeFromParams = (params.mode as string) || '';
  const [streamMode, setStreamMode] = useState<'single' | 'multi'>(
    modeFromParams === 'multi' ? 'multi' : 'single'
  );

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

  const { state, actions, messages: streamMessages } = useStreamState({ 
    streamId: streamId, 
    userRole: 'viewer' // FORCE viewer role - viewers should never end streams
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
    baseURL: baseURL,
  });

  const allMessages = React.useMemo(() => {
    const streamChatMessages = Array.isArray(chat.messages) ? chat.messages : [];
    const safeRealtimeMessages = Array.isArray(realtimeMessages) ? realtimeMessages : [];
    
    const allCombined = [...streamChatMessages, ...safeRealtimeMessages];
    const combined = [...streamChatMessages, ...safeRealtimeMessages];
    
    const uniqueMessages = combined.filter((message, index, array) => {
      if (!message || !message.message) return false;
      if (!message.id) return true;
      return index === array.findIndex(m => m?.id === message.id);
    });
    
    return uniqueMessages.sort((a, b) => {
      const getTimestamp = (msg: any) => {
        if (!msg?.timestamp) return 0;
        
        if (typeof msg.timestamp === 'string') {
          const date = new Date(msg.timestamp);
          return isNaN(date.getTime()) ? 0 : date.getTime();
        }
        
        if (typeof msg.timestamp === 'number') {
          if (msg.timestamp > 946684800) {
            return msg.timestamp * 1000;
          }
          return msg.timestamp;
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
    baseURL: baseURL
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

  // 🎉 Check if current user has been promoted to guest and redirect
  useEffect(() => {
    if (streamDetails?.participants && userData?.id) {
      console.log('🔍 Checking user promotion status...', {
        participants: streamDetails.participants,
        currentUserId: userData.id
      });
      
      const currentUserParticipant = streamDetails.participants.find(
        (participant: any) => participant.user.id === userData.id
      );
      
      console.log('👤 Current user participant:', currentUserParticipant);
      
      if (currentUserParticipant?.participant_type === 'guest') {
        console.log('🎉 User has been promoted to guest! Redirecting to participant screen...');
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
                  params: { id: streamId, mode: streamMode }
                });
              }
            }
          ]
        );
      }
    }
  }, [streamDetails?.participants, userData?.id, streamId, streamMode, router]);

  // 🔄 Listen for promotion events via WebSocket to refetch stream details
  useEffect(() => {
    if (chat?.socket && userData?.id) {
      const handlePromotionEvent = (data: any) => {
        console.log('🔄 Received promotion event:', data);
        if (data.event === 'user_promoted' && data.data?.user_id === userData.id) {
          console.log('🎉 Current user was promoted! Refetching stream details...');
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

  const messages = streamMessages || [];

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
        console.error('[ViewerScreen] ❌ Stream Chat send failed:', error);
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
      console.error('Failed to send like:', error);
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
        '💎 Need More Coins!',
        `You need ${coinsNeeded} more coins to send "${gift.name}".\n\nYour balance: ${walletSummary?.coins || 0} coins\nGift cost: ${gift.cost} coins`,
        [
          { text: 'Maybe Later', style: 'cancel' },
          { 
            text: '🛒 Get Coins', 
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
          console.error('❌ [StreamChat Gift] Stream Chat not available or sendGiftEvent not available');
        }
      } catch (chatError) {
        console.error('❌ [StreamChat Gift] Failed to send gift event:', chatError);
      }
      
      refetchWallet();
      
      Alert.alert(
        '🎁 Gift Sent!', 
        `You sent "${gift.name}" to the stream! 🌟\n\nRemaining balance: ${(walletSummary?.coins || 0) - gift.cost} coins`,
        [{ text: 'Awesome!', style: 'default' }]
      );
    } catch (error: any) {
      console.error('Failed to send gift:', error);
      
      if (error?.data?.error === 'Insufficient coins') {
        Alert.alert(
          '💎 Insufficient Coins',
          'Your coin balance has changed. Please refresh and try again.',
          [
            { text: 'OK', style: 'cancel' },
            { 
              text: 'Get More Coins', 
              onPress: () => {
                setShouldOpenGiftModalAfterPurchase(true);
                setGiftModalVisible(false);
                setCoinPurchaseModalVisible(true);
              }
            }
          ]
        );
      } else {
        Alert.alert('❌ Oops!', 'Something went wrong sending your gift. Please try again.');
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
        // User was not registered, ignore
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

    const apiBaseURL = MEDIA_BASE_URL;
    
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
        
        await streamCall.camera.disable();
        await streamCall.microphone.disable();
      } catch (error) {
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
        } catch (joinError: any) {
          if (joinError?.data?.error !== 'You are already in this stream') {
            throw joinError;
          }
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
          // User may not have been registered, ignore
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
    const shareUrl = `${MEDIA_BASE_URL}/stream/${streamId}`;
    
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
                baseURL={MEDIA_BASE_URL}
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
