import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Modal, ScrollView, RefreshControl, Image, TouchableWithoutFeedback, Keyboard, Share } from 'react-native';
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
  ViewerInputBar,
  useStreamState,
  useStreamChat,
  useGiftSystem,
  useFollowSystem,
  useGiftAnimations,
  type ChatMessage 
} from '../../components/stream';

export default function ViewerMultiStreamScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const currentUser = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  
  const streamId = params.streamId as string;
  const hostUsername = params.hostUsername as string;
  const streamTitle = params.streamTitle as string;

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
  const [isViewerOnly, setIsViewerOnly] = useState(true); // Track viewer-only mode
  const initializationTimeoutRef = useRef<number | null>(null);
  
  // Gift modal state
  const [giftModalVisible, setGiftModalVisible] = useState(false);
  const [sendingGift, setSendingGift] = useState(false);
  const [coinPurchaseModalVisible, setCoinPurchaseModalVisible] = useState(false);
  const [shouldOpenGiftModalAfterPurchase, setShouldOpenGiftModalAfterPurchase] = useState(false);
  
  // Like state for multi-participant streams
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  
  // Rate limiting constants
  const MIN_JOIN_INTERVAL = 3000;
  const MAX_JOIN_ATTEMPTS = 3;
  const BACKOFF_INTERVAL = 10000;
  
  // API hooks
  const { data: streamDetails, isLoading: streamLoading, error: streamError } = useGetStreamQuery(streamId);
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

  // Use stream state management for consistent message handling (same as host-single.tsx)
  const { state: streamState, actions: streamActions, messages } = useStreamState({ 
    streamId, 
    userRole: 'viewer' 
  });

  const giftAnimations = useGiftAnimations({
    messages: messages || [],
    baseURL: streamState.baseURL || '',
  });

  // Memoize safe gifts
  const safeGifts = useMemo(() => {
    if (!Array.isArray(gifts)) return [];
    return gifts
      .filter(gift => gift && typeof gift === 'object' && gift.id)
      .filter(gift => gift.is_active !== false);
  }, [gifts]);

  // Initialize like count from stream details
  useEffect(() => {
    if (streamDetails?.likes_count) {
      setLikeCount(streamDetails.likes_count);
    }
  }, [streamDetails?.likes_count]);

  // Like handler
  const handleLike = async () => {
    if (isLiked) return; // Prevent multiple likes
    
    setIsLiked(true);
    setLikeCount(prev => prev + 1);
    
    // Optional: Send like to backend API
    try {
      // You can implement a like API endpoint here
      // await sendLike({ streamId }).unwrap();
    } catch (error) {
      console.error('Failed to send like:', error);
      // Revert on error
      setIsLiked(false);
      setLikeCount(prev => prev - 1);
    }
  };

  // Add participant handler for multi streams
  const handleAddParticipant = () => {
    Alert.alert(
      'Join as Participant',
      'Request to join this multi-live stream as a participant?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Request to Join', 
          onPress: () => {
            Alert.alert('Request Sent', 'Your request to join as a participant has been sent to the host!');
          }
        }
      ]
    );
  };

  // Share handler
  const handleShare = async () => {
    try {
      const baseURL = await ipDetector.getAPIBaseURL();
      const webURL = baseURL?.replace('/api/', '') || 'https://daremelive.pythonanywhere.com';
      const shareUrl = `${webURL}/stream/${streamId}?utm_source=mobile_share&utm_medium=social&host=${streamDetails?.host?.username || hostUsername}`;
      
      await Share.share({
        message: `Watch this amazing multi-live stream on DareMe! 🔴\n\n"${streamTitle || streamDetails?.title || 'Multi Live Stream'}"\n\nHost: ${streamDetails?.host?.username || hostUsername}\n\n${shareUrl}`,
        url: shareUrl,
        title: `${streamDetails?.host?.first_name || streamDetails?.host?.username || hostUsername}'s Multi Live Stream`
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share stream');
    }
  };

  // Multi-participant video grid component
  const MultiParticipantVideoGrid = () => {
    const { useParticipants } = useCallStateHooks();
    const participants = useParticipants() || [];
    
    // Filter out local participant and viewer-only participants
    const activeParticipants = Array.isArray(participants) 
      ? participants.filter((p: any) => {
          // Don't show local participant (self)
          if (p.isLocalParticipant) return false;
          
          // Don't show viewer-only participants in the video grid
          if (p.custom?.viewerOnly === true || p.custom?.role === 'viewer') return false;
          
          return true;
        })
      : [];
    
    if (activeParticipants.length === 0) {
      return (
        <View className="flex-1 items-center justify-center bg-black">
          <ActivityIndicator size="large" color="#C42720" />
          <Text className="text-white text-lg mb-2 mt-4">Waiting for participants...</Text>
          <Text className="text-gray-400 text-sm text-center px-8">
            No active participants in the multi-live stream yet
          </Text>
        </View>
      );
    }

    return (
      <View className="flex-1 bg-black">
        {activeParticipants.length === 1 ? (
          // Single participant - full screen
          <VideoRenderer 
            participant={activeParticipants[0]}
            objectFit="cover"
          />
        ) : (
          // Multiple participants - grid layout
          <View className="flex-1 flex-wrap flex-row">
            {activeParticipants.map((participant: any, index: number) => (
              <View 
                key={participant.sessionId} 
                className={`bg-gray-800 ${
                  activeParticipants.length <= 2 ? 'w-full h-1/2' : 
                  activeParticipants.length <= 4 ? 'w-1/2 h-1/2' : 
                  'w-1/3 h-1/3'
                }`}
              >
                <VideoRenderer participant={participant} objectFit="cover" />
                <View className="absolute bottom-2 left-2 bg-black/60 rounded px-2 py-1">
                  <Text className="text-white text-xs">
                    {participant.name || 'Participant'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Initialize stream viewer (similar to single viewer but for multi)
  const initializeStreamViewer = async () => {
    if (!currentUser?.id || !streamDetails) {
      return;
    }

    if (isOperationInProgress) {
      return;
    }

    const now = Date.now();
    const timeSinceLastAttempt = now - lastJoinAttempt;
    
    if (joinAttemptCount >= MAX_JOIN_ATTEMPTS && timeSinceLastAttempt < BACKOFF_INTERVAL) {
      const remainingTime = Math.ceil((BACKOFF_INTERVAL - timeSinceLastAttempt) / 1000);
      Alert.alert('Rate Limited', `Please wait ${remainingTime} seconds before trying again.`);
      return;
    }
    
    if (timeSinceLastAttempt < MIN_JOIN_INTERVAL) {
      const remainingTime = Math.ceil((MIN_JOIN_INTERVAL - timeSinceLastAttempt) / 1000);
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
      
      try {
        // Join as viewer-only (no camera/mic permissions)
        await streamCall.join({ 
          create: false,
          data: { 
            custom: { 
              role: 'viewer',
              viewerOnly: true 
            }
          }
        });
        
        // Ensure camera and microphone are disabled for viewers
        try {
          await streamCall.camera.disable();
          await streamCall.microphone.disable();
        } catch (mediaError) {
          console.log('ℹ️ Media disable expected for viewer:', mediaError);
        }
        
      } catch (error) {
        // If call doesn't exist, viewer can't watch - stream might not be live
        console.log('📺 Multi-stream call not available - stream may not be live');
        throw new Error('Stream is not available for viewing');
      }
      setCall(streamCall);

      await new Promise(resolve => setTimeout(resolve, 1000));

      if (streamDetails.status === 'live' && streamDetails.is_live) {
        await joinStream({
          streamId,
          data: { participant_type: 'viewer' }
        }).unwrap();
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
      setIsConnecting(false);
      
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
        initializationTimeoutRef.current = null;
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
      return;
    }

    setIsOperationInProgress(true);

    try {
      if (hasJoined && streamId && streamDetails?.status === 'live' && streamDetails?.is_live) {
        try {
          await leaveStream(streamId).unwrap();
          dispatch(streamsApi.util.invalidateTags(['Stream', 'StreamMessage']));
        } catch (backendError: any) {
          if (backendError?.data?.error === 'You are not in this stream' || 
              backendError?.status === 400 && backendError?.data?.error?.includes('not in this stream')) {
            // State was already clean
          } else {
            throw backendError;
          }
        }
      }
      
      if (call) {
        try {
          await Promise.all([
            call.microphone.disable().catch(() => {}),
            call.camera.disable().catch(() => {})
          ]);
          
          await new Promise(resolve => setTimeout(resolve, 300));
          await call.leave();
        } catch (callError: any) {
          // Call may already be left
        }
      }
      
      setHasJoined(false);
    } catch (error: any) {
      if (error?.data?.error === 'You are not in this stream' || 
          error?.status === 400 && error?.data?.error?.includes('not in this stream')) {
        // Continue with cleanup
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
        setVideoLoadError('Connection timeout. Please try again.');
        setIsConnecting(false);
      }, 10000);
      
      initializationTimeoutRef.current = timeout;
      initializeStreamViewer();
    } else if (streamError) {
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
      return () => {
        if (hasJoined && !isOperationInProgress) {
          handleLeaveStream();
        }
      };
    }, [hasJoined, isOperationInProgress])
  );

  // Gift handlers (same as single viewer)
  const handleGiftPress = () => {
    setGiftModalVisible(true);
    refetchGifts();
  };

  const handleSendGift = async (gift: any) => {
    if (!streamId || sendingGift) return;

    const currentBalance = walletSummary?.coins || 0;
    const giftCost = gift.cost || 0;
    
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
      const result = await sendGift({
        streamId,
        data: { gift_id: gift.id }
      }).unwrap();
      
      dispatch(walletApi.util.invalidateTags(['Wallet']));
      await refetchWallet();
      
      Alert.alert('Gift Sent!', `You sent ${gift.name} for ${gift.cost} coins!`);
    } catch (error: any) {
      Alert.alert('Error', error.data?.error || error.message || 'Failed to send gift');
    } finally {
      setSendingGift(false);
    }
  };

  const handleConfirmedLeave = async () => {
    try {
      await handleLeaveStream();
      router.back();
    } catch (error) {
      router.back();
    }
  };

  // Render stream content
  const renderStreamContent = () => {
    if (streamLoading) {
      return (
        <View className="flex-1 items-center justify-center bg-black">
          <ActivityIndicator size="large" color="#C42720" />
          <Text className="text-white text-lg mt-4">Loading multi-live stream...</Text>
        </View>
      );
    }

    if (streamError) {
      return (
        <View className="flex-1 items-center justify-center bg-black">
          <Text className="text-white text-lg mb-2">Failed to load stream</Text>
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
          <Text className="text-white text-lg mb-2">Stream not found</Text>
          <TouchableOpacity onPress={() => router.back()} className="bg-[#C42720] px-4 py-2 rounded-lg">
            <Text className="text-white font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (isConnecting) {
      return (
        <View className="flex-1 items-center justify-center bg-black">
          <ActivityIndicator size="large" color="#C42720" />
          <Text className="text-white text-lg mt-4">Joining multi-live stream...</Text>
        </View>
      );
    }

    if (!streamClient || !call) {
      return (
        <View className="flex-1 items-center justify-center bg-black">
          <Text className="text-white text-lg mb-2">Connection Failed</Text>
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
            <MultiParticipantVideoGrid />
          </StreamCall>
        </StreamVideo>
      </View>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View className="flex-1">
        <StatusBar style="light" />
        
        {/* Stream Content */}
        <View className="flex-1">
          {renderStreamContent()}
        </View>

        {/* Chat Overlay - Show messages */}
        {hasJoined && (
          <StreamChatOverlay 
            messages={messages}
            keyboardHeight={chat.keyboardHeight}
            isKeyboardVisible={chat.isKeyboardVisible}
            inputBarHeight={72}
            baseURL={streamState.baseURL}
          />
        )}

      {/* Header - using same style as single viewer but with multi-stream context */}
      {hasJoined && (
        <StreamHeader
          streamTitle={`👥 ${streamTitle || streamDetails?.title || 'Multi Live Stream'} ${isViewerOnly ? '(Watching)' : ''}`}
          hostFirstName={streamDetails?.host?.first_name}
          hostLastName={streamDetails?.host?.last_name}
          hostUsername={streamDetails?.host?.username || hostUsername}
          hostProfilePicture={streamDetails?.host?.profile_picture_url ? `${streamState.baseURL}${streamDetails.host.profile_picture_url}` : undefined}
          viewerCount={streamDetails?.viewer_count || 0}
          isFollowing={followSystem.isFollowing}
          onToggleFollow={followSystem.toggleFollow}
          onShare={handleShare}
          disableFollow={streamDetails?.host?.id === currentUser?.id}
          onClose={() => setLeaveConfirmationVisible(true)}
        />
      )}

      {/* Input Bar with like and gift buttons beside the text input */}
      {hasJoined && (
        <ViewerInputBar
          onSendMessage={chat.sendMessage}
          onLike={handleLike}
          onGiftPress={handleGiftPress}
          isLiked={isLiked}
          likeCount={likeCount}
          hasJoined={hasJoined}
          keyboardHeight={chat.keyboardHeight}
          isKeyboardVisible={chat.isKeyboardVisible}
        />
      )}

      {/* Gift Animation Overlay */}
      {giftAnimations.activeGiftAnimations.map((animation) => (
        <GiftAnimation
          key={animation.id}
          gift={animation.gift}
          sender={animation.sender}
          animationKey={animation.animationKey}
          onAnimationComplete={() => giftAnimations.handleGiftAnimationComplete(animation.id)}
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
            <View className="w-20 h-20 rounded-full bg-gray-700 items-center justify-center mb-6">
              <DareMeLiveIcon width={40} height={40} />
            </View>
            
            <Text className="text-white text-2xl font-bold text-center mb-3">
              Leave Multi-Live Stream
            </Text>
            
            <Text className="text-gray-300 text-base text-center leading-6 mb-8">
              Are you sure you want to leave this multi-live stream? You'll stop watching all participants.
            </Text>
            
            <View className="w-full space-y-3">
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

      {/* Gift Modal - Same as single viewer */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={giftModalVisible}
        onRequestClose={() => setGiftModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-[#1A1A1A]/50 rounded-t-3xl" style={{ height: '65%' }}>
            <View className="items-center py-6">
              <View className="w-12 h-1 bg-gray-600 rounded-full mb-4" />
              
              <TouchableOpacity
                onPress={() => setGiftModalVisible(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-600 items-center justify-center"
              >
                <CancelIcon width={16} height={16} />
              </TouchableOpacity>
              
              <View className="items-center mb-4">
                <Text className="text-5xl mb-3">🎁</Text>
                <Text className="text-white text-xl font-semibold">
                  {sendingGift ? 'Sending Gift...' : 'Send Gift'}
                </Text>
              </View>
              
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
            
            <View className="px-4 py-4">
              <View className="flex-row items-center border border-[#757688] rounded-full px-3 h-11">
                <Ionicons name="search" size={20} color="#ffffff" />
                <Text className="flex-1 text-white ml-2 text-base">Search</Text>
              </View>
            </View>
            
            <View className="flex-1 px-4 pb-4">
              {safeGifts.length === 0 ? (
                <View className="flex-1 items-center justify-center">
                  <Text className="text-gray-400 text-base">No gifts available</Text>
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
                        style={{ opacity: sendingGift ? 0.5 : 1 }}
                      >
                        <View className="items-center">
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
                          
                          <Text className="text-white text-xs font-medium text-center mb-1" numberOfLines={1}>
                            {gift.name || 'Gift'}
                          </Text>
                          
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
            
            <View className="p-6">
              <TouchableOpacity 
                className="bg-white rounded-full py-4"
                onPress={() => {
                  setGiftModalVisible(false);
                  setCoinPurchaseModalVisible(true);
                }}
              >
                <Text className="text-black text-center font-semibold text-lg">Get More Coins</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}
