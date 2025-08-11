import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, FlatList, TextInput, Image, Animated, Keyboard, Dimensions, Modal, ScrollView, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
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

export default function StreamViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const currentUser = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  
  const streamId = params.streamId as string;
  const hostUsername = params.hostUsername as string;
  const streamTitle = params.streamTitle as string;

  const [streamClient, setStreamClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<any>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [comment, setComment] = useState('');
  const [lastJoinAttempt, setLastJoinAttempt] = useState<number>(0);
  const [joinAttemptCount, setJoinAttemptCount] = useState(0);
  const [isOperationInProgress, setIsOperationInProgress] = useState(false); // Prevent multiple simultaneous operations
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [giftModalVisible, setGiftModalVisible] = useState(false);
  const [sendingGift, setSendingGift] = useState(false);
  const [coinPurchaseModalVisible, setCoinPurchaseModalVisible] = useState(false);
  const [shouldOpenGiftModalAfterPurchase, setShouldOpenGiftModalAfterPurchase] = useState(false);
  const [leaveConfirmationVisible, setLeaveConfirmationVisible] = useState(false);
  const initializationTimeoutRef = useRef<number | null>(null);
  const [baseURL, setBaseURL] = useState<string>('');
  
  // Gift animation state - for TikTok-style floating gift animations
  const [activeGiftAnimations, setActiveGiftAnimations] = useState<Array<{
    id: string;
    gift: any;
    sender: any;
    animationKey: string;
  }>>([]);
  
  // Rate limiting constants
  const MIN_JOIN_INTERVAL = 3000; // 3 seconds between join attempts
  const MAX_JOIN_ATTEMPTS = 3; // Max attempts before requiring longer wait
  const BACKOFF_INTERVAL = 10000; // 10 seconds after max attempts
  
  // API hooks
  const { data: streamDetails, isLoading: streamLoading, error: streamError } = useGetStreamQuery(streamId);
  const [joinStream] = useJoinStreamMutation();
  const [leaveStream] = useLeaveStreamMutation();
  const [sendMessage] = useSendMessageMutation();
  const [sendGift] = useSendGiftMutation();

  // Get wallet data from API
  const { data: walletSummary, isLoading: walletLoading, refetch: refetchWallet } = useGetWalletSummaryQuery();
  const { data: coinPackages = [], isLoading: packagesLoading } = useGetCoinPackagesQuery();
  const [purchaseCoins] = usePurchaseCoinsMutation();

  // Get gifts from API
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

  // Follow system hooks
  const [followUser] = useFollowUserMutation();
  const [unfollowUser] = useUnfollowUserMutation();
  
  // Get host profile with follow status
  const { data: hostProfile } = useGetUserProfileQuery(
    streamDetails?.host?.id || 0,
    { 
      skip: !streamDetails?.host?.id || streamDetails?.host?.id === currentUser?.id // Skip if no host or user is the host
    }
  );

  // Follow state
  const [isFollowingHost, setIsFollowingHost] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Update follow status when host profile loads
  useEffect(() => {
    if (hostProfile) {
      setIsFollowingHost(hostProfile.is_following);
    }
  }, [hostProfile]);

  // Memoize safeGifts to prevent unnecessary re-renders and ensure valid data
  const safeGifts = useMemo(() => {
    if (!Array.isArray(gifts)) return [];
    
    const validGifts = gifts
      .filter(gift => gift && typeof gift === 'object' && gift.id)
      .filter(gift => gift.is_active !== false);
    
    return validGifts;
  }, [gifts]);
  
  // Get stream messages
  const { data: messages = [], refetch: refetchMessages } = useGetStreamMessagesQuery(
    streamId, 
    { 
      pollingInterval: 3000, // Poll every 3 seconds for real-time chat
      refetchOnMountOrArgChange: true,
    }
  );

  // Debug messages - commented out to prevent blinking
  // useEffect(() => {
  //   console.log('📬 Messages in viewer:', messages.length, messages);
  // }, [messages]);

  // Initialize base URL with IP detection
  useEffect(() => {
    const initializeBaseURL = async () => {
      try {
        const detection = await ipDetector.detectIP();
        const url = `http://${detection.ip}:8000`;
        setBaseURL(url);
        console.log('🔗 Base URL initialized:', url);
      } catch (error) {
        console.error('❌ Failed to detect IP:', error);
        setBaseURL('http://172.20.10.2:8000'); // Fallback
      }
    };
    
    initializeBaseURL();
  }, []);

  // Chat scroll reference
  const chatFlatListRef = useRef<FlatList>(null);

  // Keyboard handling
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setIsKeyboardVisible(true);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Force cleanup backend participant state
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

  // Initialize stream connection when streamDetails are loaded
  useEffect(() => {
    if (streamDetails && currentUser?.id && !hasJoined && !isOperationInProgress) {
      // Clear any existing timeout
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
      
      // Set a timeout to prevent infinite loading - reduced for development account
      const timeout = setTimeout(() => {
        console.log('⏰ Initialization timeout reached');
        // Only set error if we're still connecting and haven't joined
        setVideoLoadError('Connection timeout. Please try again.');
        setIsConnecting(false);
      }, 10000); // Reduced from 15000ms to 10 seconds for faster feedback
      
      initializationTimeoutRef.current = timeout;
      initializeStreamViewer();
    } else if (streamError) {
      // Handle stream query error - stop the connecting state
      console.log('❌ Stream query error:', streamError);
      setIsConnecting(false);
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
        initializationTimeoutRef.current = null;
      }
    } else if (!streamLoading && !streamDetails && !streamError) {
      // Stream not found after loading completed - stop connecting
      console.log('❌ Stream not found after loading completed');
      setIsConnecting(false);
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
        initializationTimeoutRef.current = null;
      }
    }
    
    return () => {
      // Cleanup timeout
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
      // Cleanup when component unmounts
      if (hasJoined && !isOperationInProgress) {
        handleLeaveStream();
      }
    };
  }, [streamDetails, currentUser?.id, streamError, streamLoading]);

  // Navigation-aware cleanup - leave stream when screen loses focus
  useFocusEffect(
    React.useCallback(() => {
      // Screen is focused
      console.log('📺 Stream viewer screen focused, hasJoined:', hasJoined, 'operationInProgress:', isOperationInProgress);
      
      return () => {
        // Screen is losing focus - leave stream only if we've actually joined and no operation in progress
        if (hasJoined && !isOperationInProgress) {
          console.log('📺 Stream viewer screen losing focus - leaving stream');
          handleLeaveStream();
        } else {
          console.log('📺 Stream viewer screen losing focus - no action needed', { hasJoined, isOperationInProgress });
        }
      };
    }, [hasJoined, isOperationInProgress])
  );

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && chatFlatListRef.current) {
      setTimeout(() => {
        chatFlatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Handle modal transition after purchase
  useEffect(() => {
    if (shouldOpenGiftModalAfterPurchase && !coinPurchaseModalVisible) {
      console.log('Opening gift modal after purchase completion');
      setGiftModalVisible(true);
      setShouldOpenGiftModalAfterPurchase(false);
    }
  }, [shouldOpenGiftModalAfterPurchase, coinPurchaseModalVisible]);

  // Watch for new gift messages and trigger animations for ALL participants
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1] as any; // Type casting for extended message properties
      
      // Only trigger animation for gift messages from OTHER users (not the sender)
      if (latestMessage.message_type === 'gift' && latestMessage.user.id !== currentUser?.id) {
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
  }, [messages, currentUser?.id]);

  const initializeStreamViewer = async () => {
    if (!currentUser?.id || !streamDetails) {
      console.log('❌ Missing requirements:', { currentUser: !!currentUser?.id, streamDetails: !!streamDetails });
      return;
    }

    // Prevent multiple simultaneous operations
    if (isOperationInProgress) {
      console.log('🔒 Operation already in progress, skipping...');
      return;
    }

    // Rate limiting check
    const now = Date.now();
    const timeSinceLastAttempt = now - lastJoinAttempt;
    
    // If we've hit max attempts, enforce longer backoff
    if (joinAttemptCount >= MAX_JOIN_ATTEMPTS && timeSinceLastAttempt < BACKOFF_INTERVAL) {
      const remainingTime = Math.ceil((BACKOFF_INTERVAL - timeSinceLastAttempt) / 1000);
      console.log(`🚫 Rate limited: Wait ${remainingTime}s before next attempt`);
      Alert.alert('Rate Limited', `Please wait ${remainingTime} seconds before trying again.`);
      return;
    }
    
    // If within normal interval, enforce minimum delay
    if (timeSinceLastAttempt < MIN_JOIN_INTERVAL) {
      const remainingTime = Math.ceil((MIN_JOIN_INTERVAL - timeSinceLastAttempt) / 1000);
      console.log(`⏳ Too soon: Wait ${remainingTime}s before next attempt`);
      setTimeout(() => initializeStreamViewer(), MIN_JOIN_INTERVAL - timeSinceLastAttempt);
      return;
    }
    
    // Reset attempt count if enough time has passed
    if (timeSinceLastAttempt > BACKOFF_INTERVAL) {
      setJoinAttemptCount(0);
    }
    
    setLastJoinAttempt(now);
    setJoinAttemptCount(prev => prev + 1);
    setIsOperationInProgress(true); // Lock operation

    try {
      setIsConnecting(true);
      console.log(`🔄 Starting stream viewer initialization for stream: ${streamId} (attempt ${joinAttemptCount + 1})`);

      // Create GetStream client for viewer
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

      // Join the call as viewer - using consistent call ID pattern
      const callId = `stream_${streamId}`;
      console.log('📞 Attempting to join call with ID:', callId);
      const streamCall = client.call('default', callId);
      
      console.log('⏳ Joining GetStream call as viewer...');
      // Optimized join strategy for development account
      try {
        // Try joining without create first (faster if call exists)
        await streamCall.join({ create: false });
        console.log('✅ Successfully joined existing GetStream call as viewer');
      } catch (error) {
        console.log('ℹ️ Call doesn\'t exist, creating new call...');
        await streamCall.join({ create: true });
        console.log('✅ Successfully joined GetStream call as viewer (with create: true)');
      }
      setCall(streamCall);

      // Optimized wait time for development account - reduced delay
      console.log('⏳ Waiting for call state to stabilize...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced from 3000ms for faster join

      // Log call state before proceeding
      console.log('📊 Call state after stabilization:', {
        participants: streamCall.state.participants?.length || 0,
        isConnected: streamCall.state.callingState,
        localParticipant: streamCall.state.localParticipant?.userId
      });

      // Join the stream in the backend
      console.log('📡 Joining stream in backend...');
      await joinStream({
        streamId,
        data: { participant_type: 'viewer' }
      }).unwrap();
      console.log('✅ Successfully joined backend stream');

      setHasJoined(true);
      setIsConnecting(false);
      setJoinAttemptCount(0); // Reset on success
      setVideoLoadError(null); // Clear any previous errors
      
      // Clear initialization timeout on success
      if (initializationTimeoutRef.current) {
        console.log('🕐 Clearing initialization timeout - user successfully joined');
        clearTimeout(initializationTimeoutRef.current);
        initializationTimeoutRef.current = null;
      }
      
      console.log('🎉 Stream viewer initialization complete!');
    } catch (error: any) {
      console.error('❌ Stream viewer initialization error:', error);
      setIsConnecting(false);
      
      // Clear initialization timeout on error
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
        initializationTimeoutRef.current = null;
      }
      
      // Handle "already in stream" errors with force cleanup
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
      
      // Handle tier level restrictions specifically
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
        // Handle ended stream specifically - force cache refresh
        console.log('🔄 Stream ended - refreshing cache and going back...');
        dispatch(streamsApi.util.invalidateTags(['Stream', 'StreamMessage']));
        dispatch(streamsApi.util.resetApiState());
        Alert.alert(
          'Stream Ended',
          'This stream has ended and is no longer available.',
          [
            { text: 'OK', onPress: () => router.back() }
          ]
        );
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
      setIsOperationInProgress(false); // Always unlock operation
    }
  };

  const handleLeaveStream = async () => {
    // Prevent multiple simultaneous leave operations
    if (isOperationInProgress) {
      console.log('🔒 Leave operation already in progress, skipping...');
      return;
    }

    setIsOperationInProgress(true); // Lock operation

    try {
      console.log('🚪 Leaving stream...', { hasJoined, streamId, callExists: !!call });
      
      // Only call backend if we've actually joined and have a streamId
      if (hasJoined && streamId) {
        console.log('📤 Calling backend leave stream API');
        try {
          await leaveStream(streamId).unwrap();
          console.log('✅ Successfully left stream on backend');
          
          // Invalidate stream cache when viewer leaves to refresh popular streams list
          console.log('🔄 Invalidating stream cache after viewer left...');
          dispatch(streamsApi.util.invalidateTags(['Stream', 'StreamMessage']));
          console.log('✅ Stream cache invalidated');
          
        } catch (backendError: any) {
          console.log('⚠️ Backend leave error:', backendError);
          
          // Handle "not in stream" error gracefully
          if (backendError?.data?.error === 'You are not in this stream' || 
              backendError?.status === 400 && backendError?.data?.error?.includes('not in this stream')) {
            console.log('ℹ️ Backend says user not in stream - state was already clean');
          } else {
            // Re-throw unexpected errors
            throw backendError;
          }
        }
      } else {
        console.log('ℹ️ Skipping backend leave call - hasJoined:', hasJoined, 'streamId:', !!streamId);
      }
      
      // Leave GetStream call if it exists
      if (call) {
        console.log('📤 Leaving GetStream call');
        try {
          // Disable any active media streams before leaving (just in case)
          console.log('🎤 Disabling any active media streams...');
          await Promise.all([
            call.microphone.disable().catch((error: any) => {
              console.log('ℹ️ Microphone disable (viewer, expected):', error.message);
            }),
            call.camera.disable().catch((error: any) => {
              console.log('ℹ️ Camera disable (viewer, expected):', error.message);
            })
          ]);
          
          // Small delay to ensure media streams are closed
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Now leave the call
          await call.leave();
          console.log('✅ Successfully left GetStream call');
        } catch (callError: any) {
          console.log('⚠️ GetStream call leave error (may already be left):', callError.message);
        }
      }
      
      // Reset state
      setHasJoined(false);
      console.log('✅ Stream leave complete');
    } catch (error: any) {
      console.error('❌ Leave stream error:', error);
      
      // Handle "not in stream" error gracefully - this is expected if user wasn't actually in stream
      if (error?.data?.error === 'You are not in this stream' || 
          error?.status === 400 && error?.data?.error?.includes('not in this stream')) {
        console.log('ℹ️ User was not in stream on backend - continuing with cleanup');
        // This is fine, just means backend and frontend were out of sync
      } else {
        // Only show error alerts for unexpected errors
        console.warn('⚠️ Unexpected leave stream error:', error);
      }
      
      // Still reset state even if API calls fail - this ensures UI cleanup happens
      setHasJoined(false);
    } finally {
      setIsOperationInProgress(false); // Always unlock operation
    }
  };

  const handleConfirmedLeave = async () => {
    console.log('🚪 Confirmed leave - leaving stream...');
    try {
      await handleLeaveStream();
      console.log('✅ Leave stream completed, navigating back...');
      router.back();
    } catch (error) {
      console.error('❌ Error during confirmed leave:', error);
      // Still navigate back even if leave fails
      router.back();
    }
  };

  const handleSendComment = async () => {
    if (!comment.trim() || !hasJoined) {
      return;
    }

    try {
      await sendMessage({
        streamId,
        data: { message: comment.trim() }
      }).unwrap();
      
      setComment('');
      refetchMessages();
      
      setTimeout(() => {
        chatFlatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    } catch (error: any) {
      console.error('Send comment error:', error);
      Alert.alert('Error', 'Failed to send comment');
    }
  };

  const handleGiftPress = () => {
    console.log('🎁 Gift modal opening...', { giftsCount: safeGifts.length, walletBalance: walletSummary?.coins || 0 });
    
    // Dismiss keyboard when gift modal opens
    Keyboard.dismiss();
    
    setGiftModalVisible(true);
    refetchGifts();
  };

  const handleSendGift = async (gift: any) => {
    console.log('🎁 Gift sending initiated:', { giftId: gift.id, giftName: gift.name, giftCost: gift.cost, streamId });
    
    if (!streamId) {
      console.error('❌ No streamId available for gift sending');
      Alert.alert('Error', 'Stream not found');
      return;
    }

    if (sendingGift) {
      return;
    }

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
      
      // 🎁 Trigger TikTok-style gift animation for all participants to see
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
        animationKey: animationId, // Unique key to trigger animation
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

  const handleFollowPress = async () => {
    if (!streamDetails?.host?.id || followLoading) {
      return;
    }

    const hostId = streamDetails.host.id;
    const hostDisplayName = streamDetails.host.first_name && streamDetails.host.last_name 
      ? `${streamDetails.host.first_name} ${streamDetails.host.last_name}`
      : streamDetails.host.username || 'this user';

    // Prevent users from following themselves
    if (hostId === currentUser?.id) {
      Alert.alert('Error', 'You cannot follow yourself');
      return;
    }

    setFollowLoading(true);
    
    try {
      if (isFollowingHost) {
        // Unfollow the user
        const result = await unfollowUser({ user_id: hostId }).unwrap();
        setIsFollowingHost(false);
        console.log('✅ Successfully unfollowed:', hostDisplayName);
      } else {
        // Follow the user
        const result = await followUser({ user_id: hostId }).unwrap();
        setIsFollowingHost(true);
        console.log('✅ Successfully followed:', hostDisplayName);
      }
    } catch (error: any) {
      console.error('Follow/unfollow error:', error);
      const errorMessage = error.data?.error || error.message || 'Failed to update follow status';
      Alert.alert('Error', errorMessage);
    } finally {
      setFollowLoading(false);
    }
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

  const StreamContent = () => {
    const { useParticipants } = useCallStateHooks();
    const participants = useParticipants();
    
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
    
    // Find all non-local participants (potential hosts)
    const remoteParticipants = participants.filter((p: any) => !p.isLocalParticipant);
    
    // More robust participant selection with detailed logging
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
    
    // Try multiple strategies to find the host
    let hostParticipant = null;
    
    // Strategy 1: Remote participant with video stream
    hostParticipant = remoteParticipants.find((p: any) => p.videoStream);
    if (hostParticipant) {
      console.log('✅ Found host via Strategy 1 (video stream):', hostParticipant.userId);
    }
    
    // Strategy 2: Remote participant with any published tracks
    if (!hostParticipant) {
      hostParticipant = remoteParticipants.find((p: any) => p.publishedTracks && p.publishedTracks.length > 0);
      if (hostParticipant) {
        console.log('✅ Found host via Strategy 2 (published tracks):', hostParticipant.userId);
      }
    }
    
    // Strategy 3: Remote participant with audio stream
    if (!hostParticipant) {
      hostParticipant = remoteParticipants.find((p: any) => p.audioStream);
      if (hostParticipant) {
        console.log('✅ Found host via Strategy 3 (audio stream):', hostParticipant.userId);
      }
    }
    
    // Strategy 4: Any remote participant
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
          
          {/* Enhanced debug participant list */}
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
        {/* Main video renderer - always render but handle no video gracefully */}
        <View className="flex-1">
          <VideoRenderer 
            participant={hostParticipant}
            objectFit="cover"
            key={`video-${hostParticipant.sessionId || hostParticipant.userId}`} // Force re-render when participant changes
          />
          
          {/* Overlay when no video stream is available */}
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
        
        {/* Enhanced debug info overlay
        <View className="absolute top-4 left-4 bg-black/90 rounded-lg p-3 max-w-xs">
          <Text className="text-white text-xs font-bold mb-1">
            🔗 Host: {hostParticipant.userId}
          </Text>
          <Text className="text-white text-xs">
            📹 Video: {hostParticipant.videoStream ? '✅ Active' : '❌ No stream'}
          </Text>
          <Text className="text-white text-xs">
            🎙️ Audio: {hostParticipant.audioStream ? '✅ Active' : '❌ No stream'}
          </Text>
          <Text className="text-white text-xs">
            📊 Tracks: {hostParticipant.publishedTracks?.length || 0} published
          </Text>
          <Text className="text-white text-xs">
            🆔 Session: {hostParticipant.sessionId?.slice(-6) || 'N/A'}
          </Text>
          <Text className="text-white text-xs">
            🌐 Quality: {hostParticipant.connectionQuality || 'Unknown'}
          </Text>
        </View> */}

        {/* Connection status indicator */}
        {/* <View className="absolute top-4 right-4 bg-red-600 rounded-full px-3 py-1">
          <Text className="text-white text-xs font-bold">🔴 LIVE</Text>
        </View> */}
        
        {/* Media stream indicators */}
        {/* <View className="absolute bottom-4 left-4 flex-row space-x-2">
          {hostParticipant.videoStream && (
            <View className="bg-green-600/90 rounded-full px-3 py-1">
              <Text className="text-white text-xs font-bold">📹 VIDEO</Text>
            </View>
          )}
          {hostParticipant.audioStream && (
            <View className="bg-blue-600/90 rounded-full px-3 py-1">
              <Text className="text-white text-xs font-bold">🎙️ AUDIO</Text>
            </View>
          )}
          {!hostParticipant.videoStream && !hostParticipant.audioStream && (
            <View className="bg-orange-600/90 rounded-full px-3 py-1">
              <Text className="text-white text-xs font-bold">⏳ WAITING</Text>
            </View>
          )}
        </View> */}
      </View>
    );
  };

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
                // Force cache invalidation and retry
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
                // Try to initialize again
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
          
          {/* Debug info */}
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

      {/* Stream Info Overlay - Match single.tsx header design */}
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
                onPress={handleFollowPress}
                disabled={followLoading}
                className={`rounded-full px-4 py-2 ml-2 ${isFollowingHost ? 'bg-gray-600' : 'bg-white'}`}
              >
                {followLoading ? (
                  <ActivityIndicator size="small" color={isFollowingHost ? "#ffffff" : "#000000"} />
                ) : (
                  <Text className={`font-semibold text-sm ${isFollowingHost ? 'text-white' : 'text-black'}`}>
                    {isFollowingHost ? 'Following' : 'Follow'}
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
            disabled={isOperationInProgress} // Prevent multiple clicks
          >
            <CancelIcon width={25} height={25} />
          </TouchableOpacity>
        </View>
      )}

      {/* Live Chat Overlay */}
      {hasJoined && messages.length > 0 && (
        <View 
          className="absolute left-4 right-20" 
          style={{ 
            zIndex: 5,
            bottom: isKeyboardVisible ? keyboardHeight + 80 : 100,
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
              height: 80, // Fade height
              zIndex: 10,
            }}
            pointerEvents="none"
          />
          
          <View style={{ maxHeight: 320 }}> {/* Increased height from 200 to 320 */}
            <FlatList
              ref={chatFlatListRef}
              data={messages.slice(-6)} // Show more messages with increased height
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item, index }) => {
                // Calculate opacity based on position (fade effect like Instagram Live)
                const fadeOpacity = index < 2 ? 0.2 + (index * 0.4) : 1;
                
                return (
                  <View className="mb-2" style={{ opacity: fadeOpacity }}>
                    <View className="flex-row items-start bg-black/60 rounded-xl px-3 py-2 self-start">
                      {/* User Avatar */}
                      <View className="w-8 h-8 rounded-full mr-2 flex-shrink-0 overflow-hidden">
                        {(item.user.profile_picture_url || item.user.avatar_url) ? (
                          <Image 
                            source={{ uri: `${baseURL}${item.user.profile_picture_url || item.user.avatar_url}` }}
                            className="w-full h-full rounded-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="w-full h-full rounded-full bg-gray-600 items-center justify-center">
                            <Text className="text-white font-bold text-xs">
                              {(item.user.full_name || item.user.username || 'U').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      {/* Message */}
                      <View className="flex-shrink-1">
                        <Text className="text-gray-300 text-xs font-bold mb-1">
                          {item.user.full_name || item.user.username}
                        </Text>
                        <Text className="text-white text-xs">
                          {item.message}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              }}
              showsVerticalScrollIndicator={false}
              scrollEnabled={true} // Enable scrolling for better UX
              maintainVisibleContentPosition={{
                minIndexForVisible: 0,
                autoscrollToTopThreshold: 10,
              }}
              contentContainerStyle={{ 
                flexGrow: 1, 
                justifyContent: 'flex-end',
                paddingBottom: 12, // Increased padding for better visibility
                paddingTop: 60, // Increased top padding for fade effect
              }}
              // Auto-scroll behavior like Instagram Live
              onContentSizeChange={() => {
                chatFlatListRef.current?.scrollToEnd({ animated: true });
              }}
            />
          </View>
        </View>
      )}

      {/* Comment Input with Keyboard Avoiding */}
      {hasJoined && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10 }}
        >
          <View 
            className="left-2 right-4 flex-row items-center mb-4" 
            style={{ 
              paddingHorizontal: 16,
              paddingBottom: Platform.OS === 'ios' ? 8 : 8,
            }}
          >
            <View className="flex-1 bg-black/60 rounded-full px-4 py-4 mr-3">
              <TextInput
                placeholder="Say something..."
                placeholderTextColor="#999"
                value={comment}
                onChangeText={setComment}
                className="text-white text-sm"
                multiline={false}
                maxLength={200}
                returnKeyType="send"
                onSubmitEditing={handleSendComment}
              />
            </View>
            
            {/* Gift Button - Match single.tsx design */}
            <TouchableOpacity 
              onPress={handleGiftPress}
              className="w-12 h-12 rounded-full items-center justify-center mr-3 bg-gray-600"
            >
              <GiftIcon width={24} height={24} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

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
                <TextInput
                  placeholder="Search"
                  placeholderTextColor="#666666"
                  className="flex-1 text-white ml-2 text-base"
                />
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
