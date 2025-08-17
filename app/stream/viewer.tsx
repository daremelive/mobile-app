import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Modal, ScrollView, RefreshControl, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { selectCurrentUser } from '../../src/store/authSlice';
import { useGetStreamQuery, useJoinStreamMutation, useLeaveStreamMutation, useGetStreamMessagesQuery, useSendMessageMutation, useGetGiftsQuery, useSendGiftMutation, streamsApi } from '../../src/store/streamsApi';
import { useGetWalletSummaryQuery, useGetCoinPackagesQuery, usePurchaseCoinsMutation, walletApi } from '../../src/api/walletApi';
import { useFollowUserMutation, useUnfollowUserMutation, useGetUserProfileQuery } from '../../src/store/followApi';
import { StreamVideoClient, StreamCall, StreamVideo, VideoRenderer, useCallStateHooks } from '@stream-io/video-react-native-sdk';
import { createStreamClient, createStreamUser } from '../../src/utils/streamClient';
import * as SecureStore from 'expo-secure-store';
import ipDetector from '../../src/utils/ipDetector';
import CancelIcon from '../../assets/icons/cancel.svg';
import GiftIcon from '../../assets/icons/gift.svg';
import DareMeLiveIcon from '../../assets/icons/daremelive.svg';
import GiftAnimation from '../../components/animations/GiftAnimation';

// Import modular components
import { 
  StreamHeader, 
  StreamChatOverlay, 
  StreamInputBar,
  useStreamChat,
  useGiftSystem,
  useFollowSystem,
  type ChatMessage 
} from '../../components/stream';

export default function StreamViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const currentUser = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  
  const streamId = params.streamId as string;
  const hostUsername = params.hostUsername as string;
  const streamTitle = params.streamTitle as string;

  // Get stream details first to determine mode
  const { data: streamDetails, isLoading: streamLoading, error: streamError } = useGetStreamQuery(streamId);

  // Smart routing: Redirect to appropriate viewer based on stream mode
  useEffect(() => {
    if (streamDetails && !streamLoading) {
      if (streamDetails.mode === 'multi') {
        // Redirect to multi-participant viewer
        router.replace({
          pathname: '/stream/viewer-multi',
          params: {
            streamId,
            hostUsername: streamDetails.host?.username || hostUsername,
            streamTitle: streamDetails.title || streamTitle,
          }
        });
        return;
      }
      // For 'single' mode, continue with current viewer logic
    }
  }, [streamDetails, streamLoading, streamId, hostUsername, streamTitle, router]);

  // Show loading while determining stream mode
  if (streamLoading || (streamDetails && streamDetails.mode === 'multi')) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator size="large" color="#C42720" />
        <Text className="text-white text-lg mt-4">
          {streamDetails?.mode === 'multi' ? 'Redirecting to multi-live stream...' : 'Loading stream...'}
        </Text>
      </View>
    );
  }

  // Core stream state
  const [streamClient, setStreamClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<any>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [lastJoinAttempt, setLastJoinAttempt] = useState<number>(0);
  const [joinAttemptCount, setJoinAttemptCount] = useState(0);
  const [isOperationInProgress, setIsOperationInProgress] = useState(false);
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);
  const [leaveConfirmationVisible, setLeaveConfirmationVisible] = useState(false);
  const initializationTimeoutRef = useRef<number | null>(null);
  const [baseURL, setBaseURL] = useState<string>('');
  
  // Gift modal state (keeping original implementation for exact UI match)
  const [giftModalVisible, setGiftModalVisible] = useState(false);
  const [sendingGift, setSendingGift] = useState(false);
  const [coinPurchaseModalVisible, setCoinPurchaseModalVisible] = useState(false);
  const [shouldOpenGiftModalAfterPurchase, setShouldOpenGiftModalAfterPurchase] = useState(false);
  
  // Gift animation state
  const [activeGiftAnimations, setActiveGiftAnimations] = useState<Array<{
    id: string;
    gift: any;
    sender: any;
    animationKey: string;
  }>>([]);
  
  // Rate limiting constants
  const MIN_JOIN_INTERVAL = 3000;
  const MAX_JOIN_ATTEMPTS = 3;
  const BACKOFF_INTERVAL = 10000;
  
  // API hooks (stream details already fetched above for routing)
  const [joinStream] = useJoinStreamMutation();
  const [leaveStream] = useLeaveStreamMutation();
  const [sendGift] = useSendGiftMutation();

  // Wallet and gifts
  const { data: walletSummary, isLoading: walletLoading, refetch: refetchWallet } = useGetWalletSummaryQuery();
  const { data: coinPackages = [], isLoading: packagesLoading } = useGetCoinPackagesQuery();
  const [purchaseCoins] = usePurchaseCoinsMutation();
  const { 
    data: gifts = [], 
    isLoading: giftsLoading, 
    error: giftsError,
    refetch: refetchGifts 
  } = useGetGiftsQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    pollingInterval: 30000,
  });

  // Use modular hooks
  const chat = useStreamChat({
    streamId,
    userId: currentUser?.id?.toString(),
    username: currentUser?.username || undefined,
    isHost: false,
  });

  const followSystem = useFollowSystem({
    userId: currentUser?.id?.toString(),
    targetUserId: streamDetails?.host?.id?.toString(),
  });

  // Transform messages to match ChatMessage interface
  const transformedMessages: ChatMessage[] = useMemo(() => {
    const { data: rawMessages = [] } = useGetStreamMessagesQuery(
      streamId, 
      { 
        pollingInterval: 0, // Disabled aggressive polling
        refetchOnMountOrArgChange: true,
      }
    );

    return rawMessages.map((msg: any) => ({
      id: msg.id?.toString() || Date.now().toString(),
      username: msg.user?.full_name || msg.user?.username || 'User',
      message: msg.message || '',
      timestamp: msg.timestamp || new Date().toISOString(),
      profilePicture: msg.user?.profile_picture_url || msg.user?.avatar_url,
      isHost: msg.user?.id === streamDetails?.host?.id,
      userId: msg.user?.id?.toString(),
    }));
  }, [streamId, streamDetails?.host?.id]);

  // Memoize safe gifts
  const safeGifts = useMemo(() => {
    if (!Array.isArray(gifts)) return [];
    return gifts
      .filter(gift => gift && typeof gift === 'object' && gift.id)
      .filter(gift => gift.is_active !== false);
  }, [gifts]);

  // Initialize base URL
  useEffect(() => {
    const initializeBaseURL = async () => {
      try {
        const detection = await ipDetector.detectIP();
        const url = `http://${detection.ip}:8000`;
        setBaseURL(url);
      } catch (error) {
        console.error('❌ Failed to detect IP:', error);
        setBaseURL('http://172.20.10.2:8000');
      }
    };
    initializeBaseURL();
  }, []);

  // Watch for gift animations
  useEffect(() => {
    if (transformedMessages.length > 0) {
      const latestMessage = transformedMessages[transformedMessages.length - 1] as any;
      
      if (latestMessage.message_type === 'gift' && latestMessage.user?.id !== currentUser?.id) {
        const animationId = Date.now().toString() + Math.random().toString();
        const newGiftAnimation = {
          id: animationId,
          gift: {
            id: latestMessage.gift?.id || 0,
            name: latestMessage.gift_name || 'Gift',
            icon_url: latestMessage.gift_icon && (latestMessage.gift_icon.startsWith('/') || latestMessage.gift_icon.includes('gifts/'))
              ? `${baseURL}/media/${latestMessage.gift_icon.startsWith('/') ? latestMessage.gift_icon.substring(1) : latestMessage.gift_icon}`
              : null,
            icon: latestMessage.gift_icon || '🎁',
            cost: latestMessage.gift?.cost || 0
          },
          sender: {
            username: latestMessage.user.username || 'User',
            full_name: latestMessage.user.full_name || latestMessage.user.username || 'User',
            profile_picture_url: latestMessage.user.profile_picture_url || latestMessage.user.avatar_url
          },
          animationKey: animationId,
        };
        
        setActiveGiftAnimations(prev => [...prev, newGiftAnimation]);
      }
    }
  }, [transformedMessages, currentUser?.id, baseURL]);

  // Force cleanup function
  const forceCleanupParticipation = async () => {
    try {
      const baseUrl = await ipDetector.getAPIBaseURL();
      const token = await SecureStore.getItemAsync('accessToken');
      
      const response = await fetch(`${baseUrl}streams/${streamId}/debug/force-cleanup/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('🧹 Force cleanup successful:', result);
        return true;
      } else {
        console.log('⚠️ Force cleanup failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Force cleanup error:', error);
      return false;
    }
  };

  // Initialize stream viewer
  const initializeStreamViewer = async () => {
    if (!currentUser?.id || !streamDetails) {
      console.log('❌ Missing requirements:', { currentUser: !!currentUser?.id, streamDetails: !!streamDetails });
      return;
    }

    if (isOperationInProgress) {
      console.log('🔒 Operation already in progress, skipping...');
      return;
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastAttempt = now - lastJoinAttempt;
    
    if (joinAttemptCount >= MAX_JOIN_ATTEMPTS && timeSinceLastAttempt < BACKOFF_INTERVAL) {
      const remainingTime = Math.ceil((BACKOFF_INTERVAL - timeSinceLastAttempt) / 1000);
      console.log(`🚫 Rate limited: Wait ${remainingTime}s before next attempt`);
      Alert.alert('Rate Limited', `Please wait ${remainingTime} seconds before trying again.`);
      return;
    }
    
    if (timeSinceLastAttempt < MIN_JOIN_INTERVAL) {
      const remainingTime = Math.ceil((MIN_JOIN_INTERVAL - timeSinceLastAttempt) / 1000);
      console.log(`⏳ Too soon: Wait ${remainingTime}s before next attempt`);
      setTimeout(() => initializeStreamViewer(), MIN_JOIN_INTERVAL - timeSinceLastAttempt);
      return;
    }
    
    if (timeSinceLastAttempt > BACKOFF_INTERVAL) {
      setJoinAttemptCount(0);
    }
    
    setLastJoinAttempt(now);
    setJoinAttemptCount(prev => prev + 1);
    setIsOperationInProgress(true);

    try {
      setIsConnecting(true);
      console.log(`🔄 Starting stream viewer initialization for stream: ${streamId} (attempt ${joinAttemptCount + 1})`);

      const streamUser = createStreamUser(currentUser);
      console.log('👤 Created stream user:', streamUser);
      
      const client = await createStreamClient(streamUser);
      if (!client) {
        console.error('❌ Failed to create stream client');
        Alert.alert('Error', 'Failed to connect to stream', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }
      console.log('✅ Stream client created successfully');
      setStreamClient(client);

      const callId = `stream_${streamId}`;
      console.log('📞 Attempting to join call with ID:', callId);
      const streamCall = client.call('default', callId);
      
      console.log('⏳ Joining GetStream call as viewer...');
      try {
        await streamCall.join({ create: false });
        console.log('✅ Successfully joined existing GetStream call as viewer');
      } catch (error) {
        console.log('ℹ️ Call doesn\'t exist, creating new call...');
        await streamCall.join({ create: true });
        console.log('✅ Successfully joined GetStream call as viewer (with create: true)');
      }
      setCall(streamCall);

      console.log('⏳ Waiting for call state to stabilize...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('📊 Call state after stabilization:', {
        participants: streamCall.state.participants?.length || 0,
        isConnected: streamCall.state.callingState,
        localParticipant: streamCall.state.localParticipant?.userId
      });

      // Only join backend if stream is actually live (required for live streams)
      if (streamDetails.status === 'live' && streamDetails.is_live) {
        console.log('📡 Joining live stream in backend...');
        await joinStream({
          streamId,
          data: { participant_type: 'viewer' }
        }).unwrap();
        console.log('✅ Successfully joined backend live stream');
      } else {
        console.log('ℹ️ Skipping backend join - stream is not live', { 
          status: streamDetails.status, 
          is_live: streamDetails.is_live,
          mode: streamDetails.mode 
        });
        // For non-live streams (like single/recorded content), we just connect to GetStream
      }

      setHasJoined(true);
      setIsConnecting(false);
      setJoinAttemptCount(0);
      setVideoLoadError(null);
      
      if (initializationTimeoutRef.current) {
        console.log('🕐 Clearing initialization timeout - user successfully joined');
        clearTimeout(initializationTimeoutRef.current);
        initializationTimeoutRef.current = null;
      }
      
      console.log('🎉 Stream viewer initialization complete!');
    } catch (error: any) {
      console.error('❌ Stream viewer initialization error:', error);
      setIsConnecting(false);
      
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
        initializationTimeoutRef.current = null;
      }
      
      // Handle various error cases
      if (error?.data?.error === 'You are already in this stream') {
        console.log('🧹 Attempting force cleanup due to "already in stream" error');
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
        return;
      }
      
      if (error?.status === 403 || error?.data?.error?.includes('tier level')) {
        Alert.alert(
          'Stream Access Restricted',
          error?.data?.error || 'You can only join streams from hosts with the same tier level as yours.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
            { text: 'Upgrade Level', onPress: () => {
              router.back();
              router.push('/unlock-level');
            }}
          ]
        );
      } else if (error?.status === 400 && error?.data?.error === 'Stream is not live') {
        console.log('ℹ️ Stream is not live - checking if this is acceptable for single streams...');
        
        // For single streams that are ended or recorded, this might be OK
        if (streamDetails?.mode === 'single') {
          console.log('📼 Single stream not live - continuing as view-only mode');
          // Continue without backend join - just viewing content
          setHasJoined(true); // Set as joined for UI purposes
          setIsConnecting(false);
          setJoinAttemptCount(0);
          setVideoLoadError(null);
          
          if (initializationTimeoutRef.current) {
            clearTimeout(initializationTimeoutRef.current);
            initializationTimeoutRef.current = null;
          }
          return;
        } else {
          // For multi streams, not being live is an error
          console.log('🔄 Multi stream ended - refreshing cache and going back...');
          dispatch(streamsApi.util.invalidateTags(['Stream', 'StreamMessage']));
          dispatch(streamsApi.util.resetApiState());
          Alert.alert(
            'Stream Ended',
            'This stream has ended and is no longer available.',
            [
              { text: 'OK', onPress: () => router.back() }
            ]
          );
        }
      } else {
        const errorMessage = error?.message || error?.data?.error || 'Failed to join the stream';
        Alert.alert(
          'Connection Error', 
          errorMessage,
          [
            { text: 'Try Again', onPress: () => initializeStreamViewer() },
            { text: 'Go Back', onPress: () => router.back() }
          ]
        );
      }
    } finally {
      setIsOperationInProgress(false);
    }
  };

  // Handle leave stream
  const handleLeaveStream = async () => {
    if (isOperationInProgress) {
      console.log('🔒 Leave operation already in progress, skipping...');
      return;
    }

    setIsOperationInProgress(true);

    try {
      console.log('🚪 Leaving stream...', { hasJoined, streamId, callExists: !!call });
      
      // Only leave backend if we actually joined it (for live streams)
      if (hasJoined && streamId && streamDetails?.status === 'live' && streamDetails?.is_live) {
        console.log('📤 Calling backend leave stream API');
        try {
          await leaveStream(streamId).unwrap();
          console.log('✅ Successfully left stream on backend');
          
          console.log('🔄 Invalidating stream cache after viewer left...');
          dispatch(streamsApi.util.invalidateTags(['Stream', 'StreamMessage']));
          console.log('✅ Stream cache invalidated');
          
        } catch (backendError: any) {
          console.log('⚠️ Backend leave error:', backendError);
          
          if (backendError?.data?.error === 'You are not in this stream' || 
              backendError?.status === 400 && backendError?.data?.error?.includes('not in this stream')) {
            console.log('ℹ️ Backend says user not in stream - state was already clean');
          } else {
            throw backendError;
          }
        }
      } else {
        console.log('ℹ️ Skipping backend leave call', { 
          hasJoined, 
          streamId: !!streamId, 
          isLive: streamDetails?.status === 'live' && streamDetails?.is_live 
        });
      }
      
      if (call) {
        console.log('📤 Leaving GetStream call');
        try {
          console.log('🎤 Disabling any active media streams...');
          await Promise.all([
            call.microphone.disable().catch((error: any) => {
              console.log('ℹ️ Microphone disable (viewer, expected):', error.message);
            }),
            call.camera.disable().catch((error: any) => {
              console.log('ℹ️ Camera disable (viewer, expected):', error.message);
            })
          ]);
          
          await new Promise(resolve => setTimeout(resolve, 300));
          
          await call.leave();
          console.log('✅ Successfully left GetStream call');
        } catch (callError: any) {
          console.log('⚠️ GetStream call leave error (may already be left):', callError.message);
        }
      }
      
      setHasJoined(false);
      console.log('✅ Stream leave complete');
    } catch (error: any) {
      console.error('❌ Leave stream error:', error);
      
      if (error?.data?.error === 'You are not in this stream' || 
          error?.status === 400 && error?.data?.error?.includes('not in this stream')) {
        console.log('ℹ️ User was not in stream on backend - continuing with cleanup');
      } else {
        console.warn('⚠️ Unexpected leave stream error:', error);
      }
      
      setHasJoined(false);
    } finally {
      setIsOperationInProgress(false);
    }
  };

  // Initialize stream when ready
  useEffect(() => {
    if (streamDetails && currentUser?.id && !hasJoined && !isOperationInProgress) {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
      
      const timeout = setTimeout(() => {
        console.log('⏰ Initialization timeout reached');
        setVideoLoadError('Connection timeout. Please try again.');
        setIsConnecting(false);
      }, 10000);
      
      initializationTimeoutRef.current = timeout;
      initializeStreamViewer();
    } else if (streamError) {
      console.log('❌ Stream query error:', streamError);
      setIsConnecting(false);
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
        initializationTimeoutRef.current = null;
      }
    } else if (!streamLoading && !streamDetails && !streamError) {
      console.log('❌ Stream not found after loading completed');
      setIsConnecting(false);
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
        initializationTimeoutRef.current = null;
      }
    }
    
    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
      if (hasJoined && !isOperationInProgress) {
        handleLeaveStream();
      }
    };
  }, [streamDetails, currentUser?.id, streamError, streamLoading]);

  // Navigation cleanup
  useFocusEffect(
    React.useCallback(() => {
      console.log('📺 Stream viewer screen focused, hasJoined:', hasJoined, 'operationInProgress:', isOperationInProgress);
      
      return () => {
        if (hasJoined && !isOperationInProgress) {
          console.log('📺 Stream viewer screen losing focus - leaving stream');
          handleLeaveStream();
        } else {
          console.log('📺 Stream viewer screen losing focus - no action needed', { hasJoined, isOperationInProgress });
        }
      };
    }, [hasJoined, isOperationInProgress])
  );

  // Modal transition handler
  useEffect(() => {
    if (shouldOpenGiftModalAfterPurchase && !coinPurchaseModalVisible) {
      console.log('Opening gift modal after purchase completion');
      setGiftModalVisible(true);
      setShouldOpenGiftModalAfterPurchase(false);
    }
  }, [shouldOpenGiftModalAfterPurchase, coinPurchaseModalVisible]);

  // Gift and purchase handlers
  const handleGiftPress = () => {
    console.log('🎁 Gift modal opening...', { giftsCount: safeGifts.length, walletBalance: walletSummary?.coins || 0 });
    setGiftModalVisible(true);
    refetchGifts();
  };

  const handleSendGift = async (gift: any) => {
    console.log('🎁 Gift sending initiated:', { giftId: gift.id, giftName: gift.name, giftCost: gift.cost, streamId });
    
    if (!streamId || sendingGift) return;

    const currentBalance = walletSummary?.coins || 0;
    const giftCost = gift.cost || 0;
    
    console.log('💰 Balance check:', { currentBalance, giftCost, hasEnoughBalance: currentBalance >= giftCost });
    
    if (currentBalance < giftCost) {
      Alert.alert(
        'Insufficient Balance', 
        `You need ${giftCost} coins to send this gift. You have ${currentBalance} coins. Would you like to buy more coins?`,
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
      return;
    }

    setSendingGift(true);
    try {
      console.log('🚀 Sending gift API call...');
      const result = await sendGift({
        streamId,
        data: { gift_id: gift.id }
      }).unwrap();
      
      console.log('✅ Gift sent successfully:', result);
      
      const animationId = Date.now().toString() + Math.random().toString();
      const newGiftAnimation = {
        id: animationId,
        gift: gift,
        sender: {
          username: currentUser?.username || 'User',
          full_name: currentUser?.first_name && currentUser?.last_name 
            ? `${currentUser.first_name} ${currentUser.last_name}`
            : currentUser?.username || 'User',
          profile_picture_url: currentUser?.profile_picture_url || currentUser?.profile_picture
        },
        animationKey: animationId,
      };
      
      setActiveGiftAnimations(prev => [...prev, newGiftAnimation]);
      
      dispatch(walletApi.util.invalidateTags(['Wallet']));
      await new Promise(resolve => setTimeout(resolve, 300));
      const walletRefetchResult = await refetchWallet();
      console.log('💰 Refetched wallet data:', walletRefetchResult.data);
      
      Alert.alert('Gift Sent!', `You sent ${gift.name} for ${gift.cost} coins!`);
    } catch (error: any) {
      Alert.alert('Error', error.data?.error || error.message || 'Failed to send gift');
    } finally {
      setSendingGift(false);
    }
  };

  const handleGetMoreCoins = () => {
    setGiftModalVisible(false);
    setCoinPurchaseModalVisible(true);
  };

  const handleGiftAnimationComplete = (animationId: string) => {
    setActiveGiftAnimations(prev => prev.filter(animation => animation.id !== animationId));
  };

  const handlePurchaseCoins = async (coinPackage: any) => {
    Alert.alert(
      'Purchase Coins', 
      `Purchase ${coinPackage.total_coins || coinPackage.coins} coins for ${coinPackage.formatted_price}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Purchase', 
          onPress: async () => {
            try {
              const result = await purchaseCoins({
                package_id: coinPackage.id,
                payment_method: 'paystack'
              }).unwrap();
              
              Alert.alert(
                'Success!', 
                `${result.coins_added} coins purchased successfully! New balance: ${result.new_balance} coins`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      console.log('Purchase success - setting up modal transition');
                      setShouldOpenGiftModalAfterPurchase(true);
                      setCoinPurchaseModalVisible(false);
                    }
                  }
                ]
              );
            } catch (error: any) {
              console.error('Purchase error:', error);
              Alert.alert(
                'Purchase Failed', 
                error.data?.message || 'Failed to purchase coins. Please try again.',
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  const handleConfirmedLeave = async () => {
    console.log('🚪 Confirmed leave - leaving stream...');
    try {
      await handleLeaveStream();
      console.log('✅ Leave stream completed, navigating back...');
      router.back();
    } catch (error) {
      console.error('❌ Error during confirmed leave:', error);
      router.back();
    }
  };

  // Stream content component
  const StreamContent = () => {
    const { useParticipants } = useCallStateHooks();
    const participants = useParticipants() || [];
    
    console.log('📺 Stream participants detailed:', participants.map((p: any) => ({
      userId: p.userId,
      isLocal: p.isLocalParticipant,
      hasVideo: !!p.videoStream,
      hasAudio: !!p.audioStream,
      hasPublishedTracks: !!p.publishedTracks,
      trackCount: p.publishedTracks?.length || 0,
      videoTrack: p.videoStream ? 'present' : 'missing',
      audioTrack: p.audioStream ? 'present' : 'missing',
      sessionId: p.sessionId,
      connectionQuality: p.connectionQuality
    })));
    
    const remoteParticipants = Array.isArray(participants) 
      ? participants.filter((p: any) => !p.isLocalParticipant)
      : [];
    
    console.log('🔍 Searching for host participant...', {
      totalParticipants: participants.length,
      remoteParticipants: remoteParticipants.length,
      remoteDetails: remoteParticipants.map((p: any) => ({
        userId: p.userId,
        hasVideo: !!p.videoStream,
        hasAudio: !!p.audioStream,
        tracks: p.publishedTracks?.length || 0
      }))
    });
    
    let hostParticipant = null;
    
    // Multiple strategies to find host
    hostParticipant = remoteParticipants.find((p: any) => p.videoStream);
    if (hostParticipant) {
      console.log('✅ Found host via Strategy 1 (video stream):', hostParticipant.userId);
    }
    
    if (!hostParticipant) {
      hostParticipant = remoteParticipants.find((p: any) => p.publishedTracks && p.publishedTracks.length > 0);
      if (hostParticipant) {
        console.log('✅ Found host via Strategy 2 (published tracks):', hostParticipant.userId);
      }
    }
    
    if (!hostParticipant) {
      hostParticipant = remoteParticipants.find((p: any) => p.audioStream);
      if (hostParticipant) {
        console.log('✅ Found host via Strategy 3 (audio stream):', hostParticipant.userId);
      }
    }
    
    if (!hostParticipant) {
      hostParticipant = remoteParticipants[0];
      if (hostParticipant) {
        console.log('✅ Found host via Strategy 4 (any remote):', hostParticipant.userId);
      }
    }

    console.log('🎥 Final host selection:', hostParticipant ? {
      userId: hostParticipant.userId,
      hasVideo: !!hostParticipant.videoStream,
      hasAudio: !!hostParticipant.audioStream,
      hasPublishedTracks: !!hostParticipant.publishedTracks,
      trackCount: hostParticipant.publishedTracks?.length || 0,
      sessionId: hostParticipant.sessionId
    } : 'No host found');

    if (!hostParticipant) {
      return (
        <View className="flex-1 items-center justify-center bg-black">
          <ActivityIndicator size="large" color="#C42720" />
          <Text className="text-white text-lg mb-2 mt-4">📡 Waiting for host...</Text>
          <Text className="text-gray-400 text-sm text-center px-8">
            No remote participants found yet
          </Text>
          <Text className="text-gray-500 text-xs mt-2">
            Total: {participants.length} | Remote: {remoteParticipants.length}
          </Text>
          
          <View className="mt-4 bg-gray-800 p-3 rounded max-w-sm">
            <Text className="text-white text-xs font-bold mb-2">🔍 Debug - All Participants:</Text>
            {participants.length === 0 ? (
              <Text className="text-gray-400 text-xs">No participants detected</Text>
            ) : (
              participants.map((p: any, index: number) => (
                <View key={index} className="mb-1">
                  <Text className="text-white text-xs font-semibold">
                    {p.userId} {p.isLocalParticipant ? '(YOU)' : '(HOST)'}
                  </Text>
                  <Text className="text-gray-300 text-xs">
                    📹:{p.videoStream ? '✅' : '❌'} 🎙️:{p.audioStream ? '✅' : '❌'} 
                    📊:{p.publishedTracks?.length || 0} tracks
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      );
    }

    return (
      <View className="flex-1 bg-black">
        <View className="flex-1">
          <VideoRenderer 
            participant={hostParticipant}
            objectFit="cover"
            key={`video-${hostParticipant.sessionId || hostParticipant.userId}`}
          />
          
          {!hostParticipant.videoStream && (
            <View className="absolute inset-0 items-center justify-center bg-gray-900/95">
              <View className="items-center p-6">
                <Text className="text-white text-3xl mb-4">
                  {hostParticipant.audioStream ? '🎙️' : '⏳'}
                </Text>
                <Text className="text-white text-xl font-bold mb-2">
                  {hostParticipant.audioStream ? 'Audio Only' : 'Connecting...'}
                </Text>
                <Text className="text-gray-300 text-center px-4 mb-4">
                  {hostParticipant.audioStream ? 
                    'The host is streaming audio without video' : 
                    'Waiting for host to start streaming...'}
                </Text>
                <Text className="text-gray-500 text-sm">
                  Connected to: {hostParticipant.userId}
                </Text>
                <Text className="text-gray-500 text-xs mt-1">
                  Tracks: {hostParticipant.publishedTracks?.length || 0}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Render main content
  const renderStreamContent = () => {
    if (streamLoading) {
      return (
        <View className="flex-1 items-center justify-center bg-black">
          <ActivityIndicator size="large" color="#C42720" />
          <Text className="text-white text-lg mt-4">Loading stream data...</Text>
        </View>
      );
    }

    if (streamError) {
      return (
        <View className="flex-1 items-center justify-center bg-black">
          <Text className="text-white text-lg mb-2">❌ Failed to load stream</Text>
          <Text className="text-gray-400 text-sm mb-4 px-8 text-center">
            {(streamError as any)?.data?.error || (streamError as any)?.message || 'Unable to load stream details'}
          </Text>
          <View className="flex-row space-x-3">
            <TouchableOpacity 
              onPress={() => {
                dispatch(streamsApi.util.invalidateTags(['Stream']));
                setIsConnecting(true);
              }} 
              className="bg-[#C42720] px-4 py-2 rounded-lg"
            >
              <Text className="text-white font-semibold">Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} className="bg-gray-600 px-4 py-2 rounded-lg">
              <Text className="text-white font-semibold">Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (!streamDetails) {
      return (
        <View className="flex-1 items-center justify-center bg-black">
          <Text className="text-white text-lg mb-2">❌ Stream not found</Text>
          <TouchableOpacity onPress={() => router.back()} className="bg-[#C42720] px-4 py-2 rounded-lg">
            <Text className="text-white font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (videoLoadError && !hasJoined) {
      return (
        <View className="flex-1 items-center justify-center bg-black">
          <Text className="text-white text-lg mb-2">⏰ Connection Timeout</Text>
          <Text className="text-gray-400 text-sm mb-4 px-8 text-center">
            {videoLoadError}
          </Text>
          <View className="flex-row space-x-3">
            <TouchableOpacity 
              onPress={() => {
                setVideoLoadError(null);
                setIsConnecting(true);
                if (streamDetails && currentUser?.id) {
                  initializeStreamViewer();
                }
              }} 
              className="bg-[#C42720] px-4 py-2 rounded-lg"
            >
              <Text className="text-white font-semibold">Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} className="bg-gray-600 px-4 py-2 rounded-lg">
              <Text className="text-white font-semibold">Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (isConnecting) {
      return (
        <View className="flex-1 items-center justify-center bg-black">
          <ActivityIndicator size="large" color="#C42720" />
          <Text className="text-white text-lg mt-4">Joining {hostUsername}'s stream...</Text>
          <Text className="text-gray-400 text-sm mt-2">Connecting to GetStream...</Text>
          
          <View className="mt-4 bg-gray-800 p-2 rounded">
            <Text className="text-white text-xs">Debug:</Text>
            <Text className="text-white text-xs">hasJoined: {hasJoined ? 'true' : 'false'}</Text>
            <Text className="text-white text-xs">streamClient: {streamClient ? 'ready' : 'null'}</Text>
            <Text className="text-white text-xs">call: {call ? 'ready' : 'null'}</Text>
            <Text className="text-white text-xs">isOperationInProgress: {isOperationInProgress ? 'true' : 'false'}</Text>
          </View>
        </View>
      );
    }

    if (!streamClient || !call) {
      return (
        <View className="flex-1 items-center justify-center bg-black">
          <Text className="text-white text-lg mb-2">❌ Connection Failed</Text>
          <Text className="text-gray-400 text-sm mb-4">Unable to connect to the stream</Text>
          <View className="flex-row space-x-3">
            <TouchableOpacity onPress={initializeStreamViewer} className="bg-[#C42720] px-4 py-2 rounded-lg">
              <Text className="text-white font-semibold">Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} className="bg-gray-600 px-4 py-2 rounded-lg">
              <Text className="text-white font-semibold">Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View className="flex-1 bg-black">
        <StreamVideo client={streamClient}>
          <StreamCall call={call}>
            <StreamContent />
          </StreamCall>
        </StreamVideo>
      </View>
    );
  };

  return (
    <View className="flex-1">
      <StatusBar style="light" />
      
      {/* Stream Content */}
      <View className="flex-1">
        {renderStreamContent()}
      </View>

      {/* Header using modular component - but keeping original complex UI exactly */}
      {hasJoined && (
        <View className="absolute top-16 left-4 right-4 flex-row items-center justify-between" style={{ zIndex: 10 }}>
          {/* Profile Section - Show host's profile */}
          <View className="flex-row items-center bg-black/60 rounded-full px-2 py-2 flex-1 mr-3">
            {/* Host Avatar */}
            <View className="w-12 h-12 rounded-full bg-gray-400 mr-3 overflow-hidden">
              {streamDetails?.host && (streamDetails.host as any)?.profile_picture_url ? (
                <Image 
                  source={{ uri: `${baseURL}${(streamDetails.host as any).profile_picture_url}` }}
                  className="w-full h-full"
                  resizeMode="cover"
                  onError={(e) => console.log('Host avatar load error:', e.nativeEvent.error)}
                  onLoad={() => console.log('Host avatar loaded successfully')}
                />
              ) : (
                <View className="w-full h-full bg-gray-400 items-center justify-center">
                  <Text className="text-white font-bold text-sm">
                    {hostUsername?.charAt(0).toUpperCase() || 'H'}
                  </Text>
                </View>
              )}
            </View>
            
            {/* Host Name and Info */}
            <View className="flex-1">
              <Text className="text-white font-semibold text-base" numberOfLines={1}>
                {streamDetails?.host && (streamDetails.host as any)?.first_name && (streamDetails.host as any)?.last_name 
                  ? `${(streamDetails.host as any).first_name} ${(streamDetails.host as any).last_name}` 
                  : hostUsername || 'Host'}
              </Text>
              <Text className="text-gray-300 text-xs" numberOfLines={1}>
                @{hostUsername} • {streamDetails?.viewer_count || 0} viewers
              </Text>
            </View>
            
            {/* Follow Button - Only show if user is not the host */}
            {streamDetails?.host?.id !== currentUser?.id && (
              <TouchableOpacity 
                onPress={followSystem.toggleFollow}
                disabled={followSystem.isLoadingFollow}
                className={`rounded-full px-4 py-2 ml-2 ${followSystem.isFollowing ? 'bg-gray-600' : 'bg-white'}`}
              >
                {followSystem.isLoadingFollow ? (
                  <ActivityIndicator size="small" color={followSystem.isFollowing ? "#ffffff" : "#000000"} />
                ) : (
                  <Text className={`font-semibold text-sm ${followSystem.isFollowing ? 'text-white' : 'text-black'}`}>
                    {followSystem.isFollowing ? 'Following' : 'Follow'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
            
            {/* Share Button */}
            <TouchableOpacity className="w-12 h-12 rounded-full bg-white items-center justify-center ml-2">
              <Ionicons name="share-social" size={20} color="black" fillColor="white" />
            </TouchableOpacity>
          </View>
          
          {/* Leave Button */}
          <TouchableOpacity 
            onPress={() => setLeaveConfirmationVisible(true)}
            className="w-10 h-10 rounded-full items-center justify-center"
            disabled={isOperationInProgress}
          >
            <CancelIcon width={25} height={25} />
          </TouchableOpacity>
        </View>
      )}

      {/* Chat Overlay using modular component but with custom styling to match original */}
      {hasJoined && transformedMessages.length > 0 && (
        <View 
          className="absolute left-4 right-20" 
          style={{ 
            zIndex: 5,
            bottom: chat.isKeyboardVisible ? chat.keyboardHeight + 80 : 100,
          }}
        >
          {/* Gradient fade-out mask at top (like TikTok/Instagram Live) */}
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'transparent']}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 80,
              zIndex: 10,
            }}
            pointerEvents="none"
          />
          
          <StreamChatOverlay
            messages={transformedMessages.slice(-6)}
            isVisible={true}
          />
        </View>
      )}

      {/* Input Bar using modular component */}
      {hasJoined && (
        <StreamInputBar
          onSendMessage={chat.sendMessage}
          onGiftPress={handleGiftPress}
          hasJoined={hasJoined}
          keyboardHeight={chat.keyboardHeight}
          isKeyboardVisible={chat.isKeyboardVisible}
          showGiftButton={true}
        />
      )}

      {/* Keep original modals for exact UI match */}
      {/* Gift Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={giftModalVisible}
        onRequestClose={() => setGiftModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-[#1A1A1A]/50 rounded-t-3xl" style={{ height: '65%' }}>
            {/* Gift Header */}
            <View className="items-center py-6">
              <View className="w-12 h-1 bg-gray-600 rounded-full mb-4" />
              
              {/* Close Button */}
              <TouchableOpacity
                onPress={() => setGiftModalVisible(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-600 items-center justify-center"
              >
                <CancelIcon width={16} height={16} />
              </TouchableOpacity>
              
              {/* Gift Icon and Title - No background */}
              <View className="items-center mb-4">
                <Text className="text-5xl mb-3">🎁</Text>
                <Text className="text-white text-xl font-semibold">
                  {sendingGift ? 'Sending Gift...' : 'Send Gift'}
                </Text>
                {sendingGift && (
                  <Text className="text-gray-400 text-sm mt-1">Please wait...</Text>
                )}
              </View>
              
              {/* Balance */}
              <View className="flex-row items-center gap-2">
                <Text className="text-gray-400">Total Balance:</Text>
                <View className="flex-row items-center gap-1">
                  <Text className="text-blue-400 text-lg">💎</Text>
                  <Text className="text-white font-semibold">
                    {walletLoading ? '...' : (walletSummary?.coins || 0)}
                  </Text>
                  {walletLoading && (
                    <Text className="text-gray-400 text-xs ml-1">updating...</Text>
                  )}
                </View>
              </View>
            </View>
            
            {/* Search Bar */}
            <View className="px-4 py-4">
              <View className="flex-row items-center border border-[#757688] rounded-full px-3 h-11">
                <Ionicons name="search" size={20} color="#ffffff" />
                <Text className="flex-1 text-white ml-2 text-base">Search</Text>
              </View>
            </View>
            
            {/* Gifts Content */}
            <View className="flex-1 px-4 pb-4">
              {/* Gifts Grid */}
              {safeGifts.length === 0 ? (
                <View className="flex-1 items-center justify-center">
                  <Text className="text-gray-400 text-base">No gifts available</Text>
                  <Text className="text-gray-500 text-sm mt-2">Check back later!</Text>
                </View>
              ) : (
                <ScrollView 
                  showsVerticalScrollIndicator={false} 
                  style={{ flex: 1 }}
                  refreshControl={
                    <RefreshControl
                      refreshing={giftsLoading}
                      onRefresh={refetchGifts}
                      tintColor="#ffffff"
                      colors={['#ffffff']}
                    />
                  }
                >
                  <View className="flex-row flex-wrap justify-between">
                    {safeGifts.map((gift) => (
                      <TouchableOpacity
                        key={gift.id}
                        onPress={() => handleSendGift(gift)}
                        className="w-[22%] mb-4"
                        disabled={sendingGift}
                        style={{ 
                          opacity: sendingGift ? 0.5 : 1 
                        }}
                      >
                        <View className="items-center">
                          {/* Gift Icon with rounded background */}
                          <View className="w-16 h-16 bg-[#2A2A2A] rounded-full items-center justify-center mb-2">
                            {gift.icon_url ? (
                              <Image 
                                source={{ uri: gift.icon_url }}
                                className="w-10 h-10"
                                resizeMode="contain"
                              />
                            ) : (
                              <Text className="text-3xl">🎁</Text>
                            )}
                          </View>
                          
                          {/* Gift Name - No background */}
                          <Text className="text-white text-xs font-medium text-center mb-1" numberOfLines={1}>
                            {gift.name || 'Gift'}
                          </Text>
                          
                          {/* Cost - No background */}
                          <View className="flex-row items-center gap-1">
                            <Text className="text-blue-400 text-xs">💎</Text>
                            <Text className="text-white text-xs font-semibold">{gift.cost || 0}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
            
            {/* Get More Coins Button */}
            <View className="p-6">
              <TouchableOpacity 
                className="bg-white rounded-full py-4"
                onPress={handleGetMoreCoins}
              >
                <Text className="text-black text-center font-semibold text-lg">Get More Coins</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Coin Purchase Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={coinPurchaseModalVisible}
        onRequestClose={() => setCoinPurchaseModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-[#1A1A1A]/50 rounded-t-3xl" style={{ height: '70%' }}>
            {/* Header */}
            <View className="items-center py-6">
              <View className="w-12 h-1 bg-gray-600 rounded-full mb-4" />
              
              {/* Close Button */}
              <TouchableOpacity
                onPress={() => setCoinPurchaseModalVisible(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-600 items-center justify-center"
              >
                <CancelIcon width={16} height={16} />
              </TouchableOpacity>
              
              {/* Coin Icon and Title */}
              <View className="items-center mb-4">
                <Text className="text-5xl mb-3">💎</Text>
                <Text className="text-white text-xl font-semibold">Get more coins</Text>
              </View>
              
              {/* Balance */}
              <View className="flex-row items-center gap-2">
                <Text className="text-gray-400">Total Balance:</Text>
                <View className="flex-row items-center gap-1">
                  <Text className="text-blue-400 text-lg">💎</Text>
                  <Text className="text-white font-semibold">
                    {walletLoading ? '...' : (walletSummary?.coins || 0)}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Coin Packages Grid */}
            <View className="flex-1 px-4 pb-4">
              <ScrollView 
                showsVerticalScrollIndicator={false} 
                style={{ flex: 1 }}
              >
                {packagesLoading ? (
                  <View className="flex-1 items-center justify-center py-8">
                    <Text className="text-gray-400 text-base">Loading packages...</Text>
                  </View>
                ) : coinPackages.length === 0 ? (
                  <View className="flex-1 items-center justify-center py-8">
                    <Text className="text-gray-400 text-base">No coin packages available</Text>
                  </View>
                ) : (
                  <View className="flex-row flex-wrap justify-between">
                    {coinPackages.map((coinPackage, index) => (
                      <TouchableOpacity
                        key={coinPackage.id}
                        onPress={() => handlePurchaseCoins(coinPackage)}
                        className="w-[48%] mb-4 bg-[#2A2A2A] rounded-2xl p-4"
                        style={{
                          borderWidth: coinPackage.is_popular ? 2 : 0,
                          borderColor: coinPackage.is_popular ? '#FF0000' : 'transparent'
                        }}
                      >
                        <View className="items-center">
                          {/* Diamond Icon */}
                          <View className="w-12 h-12 items-center justify-center mb-3">
                            <Text className="text-blue-400 text-2xl">💎</Text>
                          </View>
                          
                          {/* Coins Amount */}
                          <Text className="text-white font-semibold text-lg mb-1">
                            {coinPackage.total_coins || coinPackage.coins}
                          </Text>
                          {coinPackage.bonus_coins > 0 && (
                            <Text className="text-green-400 text-xs mb-1">
                              +{coinPackage.bonus_coins} bonus
                            </Text>
                          )}
                          
                          {/* Price */}
                          <Text className="text-white text-base font-medium">
                            {coinPackage.formatted_price}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>
            </View>
            
            {/* Recharge Button */}
            <View className="px-6 pb-6">
              <TouchableOpacity 
                className="bg-red-600 rounded-full py-4"
                onPress={() => {
                  Alert.alert(
                    'Recharge',
                    'Select a coin package above to recharge your account.',
                    [
                      {
                        text: 'OK',
                        onPress: () => {
                          // Keep the modal open so user can select a package
                        }
                      }
                    ]
                  );
                }}
              >
                <Text className="text-white text-center font-semibold text-lg">Recharge</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* TikTok-style Gift Animations Overlay */}
      {activeGiftAnimations.map((animation) => (
        <GiftAnimation
          key={animation.id}
          gift={animation.gift}
          sender={animation.sender}
          animationKey={animation.animationKey}
          onAnimationComplete={() => handleGiftAnimationComplete(animation.id)}
        />
      ))}

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
              Are you sure you want to leave this live stream? You'll stop watching and exit the broadcast.
            </Text>
            
            {/* Buttons */}
            <View className="w-full space-y-3">
              {/* Keep Watching Button */}
              <View className="w-full h-[52px] rounded-full overflow-hidden mb-6">
                <LinearGradient
                  colors={['#FF0000', '#330000']}
                  locations={[0, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="w-full h-full"
                >
                  <TouchableOpacity 
                    className="w-full h-full items-center justify-center"
                    onPress={() => setLeaveConfirmationVisible(false)}
                  >
                    <Text className="text-white text-[17px] font-semibold">Keep Watching</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
              
              {/* Leave Stream Button */}
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
                    <Text className="text-white text-[17px] font-semibold">Leave Stream</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
