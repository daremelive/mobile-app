import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, Alert, Animated, Modal, TextInput, KeyboardAvoidingView, Platform, FlatList, ScrollView, Image, Keyboard, RefreshControl, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { selectCurrentUser, selectAccessToken } from '../../src/store/authSlice';
import { useCreateStreamMutation, useInviteUsersToStreamMutation, useStreamActionMutation, useGetStreamMessagesQuery, useSendMessageMutation, useGetGiftsQuery, useSendGiftMutation, useJoinStreamMutation, useLeaveStreamMutation, useGetStreamQuery, streamsApi } from '../../src/store/streamsApi';
import { useGetWalletSummaryQuery, useGetCoinPackagesQuery, usePurchaseCoinsMutation } from '../../src/api/walletApi';
import { walletApi } from '../../src/api/walletApi';
import ipDetector from '../../src/utils/ipDetector';
import { Camera } from 'expo-camera';
import { 
  StreamVideoClient, 
  StreamCall,
  StreamVideo,
  VideoRenderer,
  useCallStateHooks
} from '@stream-io/video-react-native-sdk';
import CancelIcon from '../../assets/icons/cancel.svg';
import DareMeLiveIcon from '../../assets/icons/daremelive.svg';
import GiftIcon from '../../assets/icons/gift.svg';
import AddTeamIcon from '../../assets/icons/add-team.svg';
import { SearchIcon } from '../../components/icons/SearchIcon';
import { createStreamClient, createStreamUser, generateCallId } from '../../src/utils/streamClient';
import { CALL_SETTINGS, RECORDING_SETTINGS } from '../../src/config/stream';
import GiftAnimation from '../../components/animations/GiftAnimation';
import ShareStreamModal from '../../components/ShareStreamModal';

export default function SingleStreamScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const currentUser = useSelector(selectCurrentUser);
  const accessToken = useSelector(selectAccessToken);
  const dispatch = useDispatch();
  const [createStream, { isLoading }] = useCreateStreamMutation();
  const [inviteUsers] = useInviteUsersToStreamMutation();
  const [streamAction] = useStreamActionMutation();
  const [sendMessage] = useSendMessageMutation();
  const [sendGift] = useSendGiftMutation();
  const [purchaseCoins] = usePurchaseCoinsMutation();
  const [joinStream] = useJoinStreamMutation();
  const [leaveStream] = useLeaveStreamMutation();

  // Get wallet data from API
  const { data: walletSummary, isLoading: walletLoading, refetch: refetchWallet } = useGetWalletSummaryQuery();
  const { data: coinPackages = [], isLoading: packagesLoading } = useGetCoinPackagesQuery();

  // Get gifts from API - enable smart refetching for new gifts
  const { 
    data: gifts = [], 
    isLoading: giftsLoading, 
    error: giftsError,
    refetch: refetchGifts 
  } = useGetGiftsQuery(undefined, {
    refetchOnMountOrArgChange: true, // Allow initial fetch
    refetchOnFocus: true, // Enable refetch when modal gains focus
    refetchOnReconnect: true, // Refetch on reconnect to get latest gifts
    pollingInterval: 30000, // Poll every 30 seconds for new gifts (only when modal is open)
  });

  // Memoize safeGifts to prevent unnecessary re-renders and ensure valid data
  const safeGifts = useMemo(() => {
    if (!Array.isArray(gifts)) return [];
    
    const validGifts = gifts
      .filter(gift => gift && typeof gift === 'object' && gift.id) // Filter valid objects
      .filter(gift => gift.is_active !== false); // Show active gifts or gifts without is_active property
    
    return validGifts;
  }, [gifts]);

  // Removed debug logging to prevent console blinking
  
  const [streamClient, setStreamClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<any>(null);
  const [isLive, setIsLive] = useState(false);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  
  // Get max seats from URL params
  const maxSeats = parseInt(params.seats as string) || 2; // Default to 2 seats if not specified
  const [currentParticipantCount, setCurrentParticipantCount] = useState(1); // Host counts as 1
  
  // Check if coming from title screen
  const fromTitleScreen = params.fromTitleScreen === 'true';
  const titleFromParams = params.title as string;
  
  // Get stream details to track participants - enable polling when live
  const { data: streamDetails, refetch: refetchStreamDetails } = useGetStreamQuery(
    streamId || '', 
    { 
      skip: !streamId,
      pollingInterval: isLive ? 5000 : 0, // Poll every 5 seconds when live
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }
  );
  
  // Chat state
  const [chatVisible, setChatVisible] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Comment input state
  const [comment, setComment] = useState('');
  
  // Keyboard handling state
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  
  // Get stream messages - enable smart polling for live chat updates
  const { data: messages = [], refetch: refetchMessages } = useGetStreamMessagesQuery(
    streamId || '', 
    { 
      skip: !streamId,
      // Enable polling only when stream is live for real-time chat
      pollingInterval: isLive ? 3000 : 0, // Poll every 3 seconds when live
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }
  );
  
  // Ref for FlatList to control scrolling
  const chatFlatListRef = useRef<FlatList>(null);
  
  // Calculate current active participants (hosts + guests)
  const activeParticipants = streamDetails?.participants?.filter(p => 
    p.is_active && (p.participant_type === 'host' || p.participant_type === 'guest')
  ) || [];
  
  // Separate guests only (for Guests tab)
  const activeGuests = streamDetails?.participants?.filter(p => 
    p.is_active && p.participant_type === 'guest'
  ) || [];
  
  // Separate viewers only (for Audience tab)
  const activeViewers = streamDetails?.participants?.filter(p => 
    p.is_active && p.participant_type === 'viewer'
  ) || [];
  const currentActiveSeats = activeParticipants.length;
  const availableSeats = maxSeats - currentActiveSeats;
  
  // Initialize API base URL with IP detector
  useEffect(() => {
    ipDetector.getAPIBaseURL().then(url => {
      setApiBaseUrl(url);
    });
  }, []);

  // Update participant count when stream details change
  useEffect(() => {
    if (streamDetails?.participants) {
      const activeCount = streamDetails.participants.filter(p => 
        p.is_active && (p.participant_type === 'host' || p.participant_type === 'guest')
      ).length;
      setCurrentParticipantCount(activeCount);
      
      console.log('📊 Stream participants updated:', {
        streamId,
        totalParticipants: streamDetails.participants.length,
        activeParticipants: activeCount,
        allParticipants: streamDetails.participants.map(p => ({
          id: p.id,
          userId: p.user?.id,
          username: p.user?.username,
          type: p.participant_type,
          isActive: p.is_active,
          // status: p.status
        }))
      });
      
      console.log('👥 GUESTS TAB - Active Guests:', activeGuests.map(g => ({
        id: g.id,
        username: g.user?.username,
        type: g.participant_type,
        isActive: g.is_active
      })));
      
      console.log('👀 AUDIENCE TAB - Active Viewers:', activeViewers.map(v => ({
        id: v.id,
        username: v.user?.username,
        type: v.participant_type,
        isActive: v.is_active
      })));
    }
  }, [streamDetails?.participants, streamId, activeGuests, activeViewers]);
  
  // Keyboard listeners for Members List modal
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        if (addParticipantModalVisible) {
          setIsKeyboardVisible(true);
          setKeyboardHeight(e.endCoordinates.height);
        }
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        if (addParticipantModalVisible) {
          setIsKeyboardVisible(false);
          setKeyboardHeight(0);
        }
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, [addParticipantModalVisible]);
  
  // Invitation modal state
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [addParticipantModalVisible, setAddParticipantModalVisible] = useState(false);
  const [usernameToInvite, setUsernameToInvite] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('guests');
  
  const [streamTitle, setStreamTitle] = useState(titleFromParams || ''); // Use title from params if available
  
  // Helper function to get dynamic media URL (for profile pictures, gift icons, etc.)
  const getDynamicMediaUrl = async (mediaUrl: string | null) => {
    if (!mediaUrl) return null;
    
    try {
      const detectionResult = await ipDetector.detectIP();
      const dynamicIP = detectionResult.ip;
      const baseURL = `http://${dynamicIP}:8000`;
      
      // If URL already contains http, return as is, otherwise prepend base URL
      if (mediaUrl.startsWith('http')) {
        return mediaUrl;
      }
      
      // Handle different media URL formats
      if (mediaUrl.startsWith('/')) {
        return `${baseURL}${mediaUrl}`;
      } else {
        return `${baseURL}/${mediaUrl}`;
      }
    } catch (error) {
      console.error('Error getting dynamic IP for media URL:', error);
      // Fallback to hardcoded IP if detection fails
      if (mediaUrl.startsWith('http')) {
        return mediaUrl;
      } else if (mediaUrl.startsWith('/')) {
        return `http://172.20.10.2:8000${mediaUrl}`;
      } else {
        return `http://172.20.10.2:8000/${mediaUrl}`;
      }
    }
  };
  
  // Helper function for profile pictures specifically
  const getProfilePictureUrl = (profilePictureUrl: string | null) => getDynamicMediaUrl(profilePictureUrl);
  
  // Dynamic Image Component for any media (profile pictures, gift icons, etc.)
  const DynamicImage = ({ 
    mediaUrl, 
    width = 48, 
    height = 48, 
    className = "", 
    style = {}, 
    children 
  }: { 
    mediaUrl: string | null, 
    width?: number, 
    height?: number,
    className?: string,
    style?: any,
    children?: React.ReactNode 
  }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
      const loadImageUrl = async () => {
        setLoading(true);
        const dynamicUrl = await getDynamicMediaUrl(mediaUrl);
        setImageUrl(dynamicUrl);
        setLoading(false);
      };
      
      if (mediaUrl) {
        loadImageUrl();
      } else {
        setLoading(false);
      }
    }, [mediaUrl]);
    
    if (loading) {
      return children || (
        <View 
          className={`bg-gray-600 items-center justify-center ${className}`}
          style={{ width, height, ...style }}
        >
          <Text className="text-gray-400 text-xs">...</Text>
        </View>
      );
    }
    
    if (imageUrl) {
      return (
        <Image
          source={{ uri: imageUrl }}
          className={className}
          style={{ width, height, ...style }}
        />
      );
    }
    
    return children || (
      <View 
        className={`bg-[#3A3A3A] items-center justify-center ${className}`}
        style={{ width, height, ...style }}
      >
        <Text className="text-white font-bold text-lg">
          U
        </Text>
      </View>
    );
  };
  
  // Dynamic Profile Picture Component (convenience wrapper)
  const DynamicProfileImage = ({ profilePictureUrl, size = 48, children }: { 
    profilePictureUrl: string | null, 
    size?: number, 
    children?: React.ReactNode 
  }) => {
    return (
      <DynamicImage
        mediaUrl={profilePictureUrl}
        width={size}
        height={size}
        className="rounded-full"
      >
        {children}
      </DynamicImage>
    );
  };
  
  // Gift modal state
  const [giftModalVisible, setGiftModalVisible] = useState(false);
  const [sendingGift, setSendingGift] = useState(false);
  
  // Coin purchase modal state
  const [coinPurchaseModalVisible, setCoinPurchaseModalVisible] = useState(false);
  
  // Share modal state
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [endStreamModalVisible, setEndStreamModalVisible] = useState(false);
  
  // Flag to handle modal transition after purchase
  const [shouldOpenGiftModalAfterPurchase, setShouldOpenGiftModalAfterPurchase] = useState(false);
  
  // Animated floating button
  const floatingButtonScale = useRef(new Animated.Value(0)).current;

  // Gift animation state - for TikTok-style floating gift animations
  const [activeGiftAnimations, setActiveGiftAnimations] = useState<Array<{
    id: string;
    gift: any;
    sender: any;
    animationKey: string;
  }>>([]);

  // Initialize stream when component mounts
  useEffect(() => {
    // If coming from title screen, auto-start stream
    if (fromTitleScreen && titleFromParams) {
      console.log('🚀 Auto-starting stream from title screen with title:', titleFromParams);
      initializeStream();
    } else {
      // Show setup modal for manual configuration
      setInviteModalVisible(true);
    }
  }, [fromTitleScreen, titleFromParams]);

  // Debug current user data
  useEffect(() => {
    console.log('🔍 Current User Data:', JSON.stringify(currentUser, null, 2));
    console.log('🖼️ Profile Picture URL:', currentUser?.profile_picture_url);
    console.log('🖼️ Profile Picture:', currentUser?.profile_picture);
  }, [currentUser]);

  // IP detection runs silently without logging

  // Keyboard event listeners
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
        setIsKeyboardVisible(true);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, []);

  // Animate floating button when live
  useEffect(() => {
    if (isLive) {
      Animated.spring(floatingButtonScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 3,
      }).start();
    }
  }, [isLive]);

  // Handle modal transition after purchase
  useEffect(() => {
    if (shouldOpenGiftModalAfterPurchase && !coinPurchaseModalVisible) {
      console.log('Opening gift modal after purchase completion');
      setGiftModalVisible(true);
      setShouldOpenGiftModalAfterPurchase(false);
    }
  }, [shouldOpenGiftModalAfterPurchase, coinPurchaseModalVisible]);

  // Auto-scroll chat to bottom when new messages arrive (like Instagram Live)
  useEffect(() => {
    if (messages.length > 0 && chatFlatListRef.current) {
      // Delay scroll to ensure content is rendered
      setTimeout(() => {
        chatFlatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

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
              ? `${apiBaseUrl}/media/${latestMessage.gift_icon.startsWith('/') ? latestMessage.gift_icon.substring(1) : latestMessage.gift_icon}`
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

  const initializeStream = async () => {
    // Check if user is loaded
    if (!currentUser?.id) {
      console.log('User not loaded yet, waiting...');
      setTimeout(initializeStream, 1000); // Retry after 1 second
      return;
    }

    // Show UI immediately for better UX
    setIsLive(true);

    try {
      // Request camera permissions first (quick)
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera Permission', 'Camera access is required for live streaming');
        setIsLive(false);
        return;
      }

      const audioStatus = await Camera.requestMicrophonePermissionsAsync();
      if (audioStatus.status !== 'granted') {
        Alert.alert('Microphone Permission', 'Microphone access is required for live streaming');
        setIsLive(false);
      }

      // Start all async operations in parallel for faster launch
      const [streamClient, streamResponse] = await Promise.all([
        // Create GetStream client (parallel)
        (async () => {
          const streamUser = createStreamUser(currentUser);
          const client = await createStreamClient(streamUser);
          if (!client) {
            throw new Error('Failed to initialize streaming client');
          }
          return client;
        })(),
        
        // Create stream in backend (parallel)
        (async () => {
          const streamData = {
            title: streamTitle.trim() || `${currentUser.username || 'User'}'s Multi Live Stream`,
            mode: 'multi' as const,
            channel: (params.channel as 'video' | 'game' | 'truth-or-dare' | 'banter') || 'video',
            max_seats: maxSeats,
          };
          return await createStream(streamData).unwrap();
        })()
      ]);

      // Set both immediately after parallel operations complete
      setStreamClient(streamClient);
      setStreamId(streamResponse.id);

      // Create GetStream call and join (parallel with stream start)
      // Use the backend stream ID as the GetStream call ID for consistency
      const callId = `stream_${streamResponse.id}`;
      const call = streamClient.call('default', callId);
      
      console.log('🔄 Creating and joining call...');
      
      // Do call setup and stream start in parallel
      const [, ] = await Promise.all([
        // GetStream call setup (parallel)
        (async () => {
          await call.getOrCreate({
            data: {
              custom: {
                disable_default_ui: true,
              },
            }
          });
          
          await call.join({ create: true });
          
          // Configure media immediately after join
          try {
            console.log('🔄 Enabling camera and microphone...');
            await Promise.all([
              call.camera.enable(),
              call.microphone.enable()
            ]);
            console.log('✅ Camera and microphone enabled');
          } catch (error) {
            console.error('❌ Failed to enable camera/microphone:', error);
            // Don't fail the stream, continue with basic setup
          }
        })(),
        
        // Start stream in database (parallel)
        (async () => {
          try {
            await streamAction({
              streamId: streamResponse.id,
              action: { action: 'start' }
            }).unwrap();
            console.log('✅ Stream started in database');
          } catch (startError) {
            console.error('❌ Failed to start stream in database:', startError);
            // Don't fail the stream, UI is already shown
          }
        })()
      ]);
      
      // Set call after everything is ready
      setCall(call);
      
      console.log('✅ Stream setup complete - host automatically joined as participant');

    } catch (error: any) {
      console.error('Stream initialization error:', error);
      setIsLive(false); // Hide UI on error
      
      // Handle privilege-related errors specifically
      if (error?.status === 403 || error?.data?.error?.includes('tier level')) {
        Alert.alert(
          'Stream Access Restricted',
          error?.data?.error || 'Your current tier level does not allow creating streams in this channel.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade Level', onPress: () => {
              router.push('/unlock-level');
            }}
          ]
        );
      } else {
        Alert.alert('Error', error?.data?.error || error?.message || 'Failed to start stream');
      }
    }
  };

  const handleEndStream = async () => {
    console.log('🔴 handleEndStream called - starting stream end process');
    
    try {
      // End the stream in the database
      if (streamId) {
        try {
          console.log('🔴 Attempting to end stream in database:', streamId);
          const result = await streamAction({
            streamId: streamId,
            action: { action: 'end' }
          }).unwrap();
          console.log('✅ Stream ended in database successfully:', result);
          
          // Aggressively invalidate ALL stream-related cache to ensure ended streams don't appear instantly
          console.log('🔄 Invalidating all stream cache tags...');
          dispatch(streamsApi.util.invalidateTags(['Stream', 'StreamMessage']));
          
          // Also reset the entire API state and force immediate refetch
          dispatch(streamsApi.util.resetApiState());
          
          // Add a small delay then invalidate again to ensure cache is completely cleared
          setTimeout(() => {
            console.log('🔄 Second cache invalidation to ensure cleanup...');
            dispatch(streamsApi.util.invalidateTags(['Stream']));
          }, 500);
          
          console.log('✅ All stream cache invalidated and reset');
          
        } catch (endError) {
          console.error('❌ Failed to end stream in database:', endError);
          
          // Show error to user
          Alert.alert(
            'Error Ending Stream',
            'Failed to end the stream properly. Please check your connection and try again.',
            [
              { text: 'Try Again', onPress: () => handleEndStream() },
              { text: 'Force Close', onPress: () => router.back() }
            ]
          );
          return; // Don't continue if database operation failed
        }
        
        // Note: Stream ending logic for hosts vs participants:
        // - Hosts: End the stream (which automatically handles their departure)  
        // - Participants: Leave the stream (handled elsewhere in the app)
        // The backend prevents hosts from "leaving" their own streams
        console.log('✅ Stream ended by host - no need to auto-leave');
      }
      
      // Leave the GetStream call
      if (call) {
        console.log('🔴 Leaving GetStream call');
        await call.leave();
        console.log('✅ Left GetStream call successfully');
      }
      
      console.log('🔴 Navigating to homepage from stream');
      router.replace('/(tabs)/home'); // Navigate to homepage instead of going back
    } catch (error) {
      console.error('❌ End stream error:', error);
      
      // Show error to user
      Alert.alert(
        'Error',
        'An error occurred while ending the stream. The stream may still be live.',
        [
          { text: 'Try Again', onPress: () => handleEndStream() },
          { text: 'Close Anyway', onPress: () => router.replace('/(tabs)/home') } // Also navigate to homepage on force close
        ]
      );
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !streamId || sendingMessage) {
      return;
    }

    setSendingMessage(true);
    try {
      await sendMessage({
        streamId,
        data: { message: newMessage.trim() }
      }).unwrap();
      
      setNewMessage('');
      refetchMessages(); // Immediately refresh messages
    } catch (error: any) {
      console.error('Send message error:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendComment = async () => {
    if (!comment.trim() || !streamId) {
      return;
    }

    try {
      await sendMessage({
        streamId,
        data: { message: comment.trim() }
      }).unwrap();
      
      setComment('');
      refetchMessages(); // Refresh messages to show the new comment
      
      // Auto-scroll to show the new message (like Instagram Live)
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
    setGiftModalVisible(true);
    // Refresh gifts when modal opens to get latest gifts from admin
    refetchGifts();
  };

  const handleSendGift = async (gift: any) => {
    console.log('🎁 Gift sending initiated:', { giftId: gift.id, giftName: gift.name, giftCost: gift.cost, streamId });
    
    if (!streamId) {
      console.error('❌ No streamId available for gift sending');
      Alert.alert('Error', 'Stream not found');
      return;
    }

    // Prevent multiple gift sends
    if (sendingGift) {
      return;
    }

    // Check if user has enough balance
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
      console.log('💰 Backend returned sender balance:', (result as any).sender_balance);
      
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
      
      // Force invalidate ALL wallet-related cache
      console.log('🔄 Invalidating wallet cache...');
      dispatch(walletApi.util.invalidateTags(['Wallet']));
      
      // Wait a moment for cache invalidation to process
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Manually refetch wallet data to get updated balance
      console.log('🔄 Manually refetching wallet data...');
      const walletRefetchResult = await refetchWallet();
      console.log('💰 Refetched wallet data:', walletRefetchResult.data);
      
      Alert.alert('Gift Sent!', `You sent ${gift.name} for ${gift.cost} coins! Balance: ${(result as any).sender_balance?.coins || 'Loading...'} coins`);
      // Don't close the modal immediately - let user see updated balance
      // setGiftModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.data?.error || error.message || 'Failed to send gift');
    } finally {
      setSendingGift(false);
    }
  };

  const handleGiftAnimationComplete = (animationId: string) => {
    setActiveGiftAnimations(prev => prev.filter(animation => animation.id !== animationId));
  };

  const handleGetMoreCoins = () => {
    setGiftModalVisible(false);
    setCoinPurchaseModalVisible(true);
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
              // Use Paystack as default payment method
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
                      // Set flag to open gift modal after coin modal closes
                      setShouldOpenGiftModalAfterPurchase(true);
                      // Close coin purchase modal
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

  const handleAddTeamPress = () => {
    // Check if stream is full before opening invite modal
    if (availableSeats <= 0) {
      Alert.alert(
        'Stream Full', 
        `This multi-live stream is full (${maxSeats}/${maxSeats} seats occupied). You can't add more participants.`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Open the add participant modal when add team is pressed
    setAddParticipantModalVisible(true);
  };



  // Handle user search
  const handleUserSearch = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearchLoading(true);
    
    try {
      const detectionResult = await ipDetector.detectIP();
      const baseURL = `http://${detectionResult.ip}:8000`;
      const searchURL = `${baseURL}/api/users/search/?search=${encodeURIComponent(searchTerm)}`;
      
      console.log('🔍 Searching users:', {
        searchTerm,
        searchURL,
        hasToken: !!accessToken,
        detectedIP: detectionResult.ip,
        streamId,
        streamDetailsAvailable: !!streamDetails,
        participantsCount: streamDetails?.participants?.length || 0
      });
      
      const response = await fetch(searchURL, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📱 Search response status:', response.status);
      const data = await response.json();
      console.log('📥 Search response data:', data);
      
      if (response.ok) {
        // Get existing participants from THIS specific stream only
        const currentStreamParticipantIds = streamDetails?.participants?.map(p => p.user?.id).filter(Boolean) || [];
        
        console.log('📊 Stream participants analysis:', {
          streamId,
          streamDetails: !!streamDetails,
          rawParticipants: streamDetails?.participants || [],
          participantIds: currentStreamParticipantIds,
          searchTermLower: searchTerm.toLowerCase(),
          allResultsFromAPI: data.results?.map((u: any) => ({ 
            id: u.id, 
            username: u.username, 
            isCurrentUser: u.id === currentUser?.id,
            isParticipant: currentStreamParticipantIds.includes(u.id)
          })) || []
        });
        
        // Smart filtering based on selected tab and user context
        const filteredUsers = data.results?.filter((user: any) => {
          const isCurrentUser = user.id === currentUser?.id;
          
          // Check if user is already a participant in this stream
          const existingParticipant = streamDetails?.participants?.find(p => 
            p.user?.id === user.id && p.is_active
          );
          
          if (selectedTab === 'guests') {
            // In Guests tab: Show viewers who can be promoted + external users who can be invited
            const isViewer = existingParticipant && existingParticipant.participant_type === 'viewer';
            const isGuestOrHost = existingParticipant && 
              (existingParticipant.participant_type === 'guest' || existingParticipant.participant_type === 'host');
            
            // Allow viewers (for promotion) and non-participants (for invitation)
            const canBeInvited = !isCurrentUser && !isGuestOrHost;
            
            console.log(`🔍 Filtering user ${user.username} in GUESTS tab:`, {
            id: user.id,
            username: user.username,
            isCurrentUser,
              existingParticipant: existingParticipant ? {
                type: existingParticipant.participant_type,
                isActive: existingParticipant.is_active
              } : null,
              isViewer,
              isGuestOrHost,
              canBeInvited,
              willInclude: canBeInvited
            });
            
            return canBeInvited;
          } else {
            // In Audience tab: Only show current viewers (no invitation/promotion actions)
            const isViewer = existingParticipant && existingParticipant.participant_type === 'viewer';
            
            console.log(`🔍 Filtering user ${user.username} in AUDIENCE tab:`, {
              id: user.id,
              username: user.username,
              isCurrentUser,
              isViewer,
              willInclude: !isCurrentUser && isViewer
            });
            
            return !isCurrentUser && isViewer;
          }
        }) || [];
        
        console.log('✅ Final filtered search results:', {
          totalResults: data.results?.length || 0,
          filteredCount: filteredUsers.length,
          currentUserId: currentUser?.id,
          currentStreamParticipantIds,
          streamId,
          results: filteredUsers.map((u: any) => ({ id: u.id, username: u.username, name: u.first_name }))
        });
        
        setSearchResults(filteredUsers.slice(0, 10)); // Limit to 10 results
      } else {
        console.error('❌ Search API error:', {
          status: response.status,
          data,
          url: searchURL
        });
        setSearchResults([]);
      }
    } catch (error) {
      console.error('❌ Network error searching users:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle user selection from search results
  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setSearchQuery(user.username); // Update search query to show selected user
    setUsernameToInvite(user.username);
    setSearchResults([]);
  };

  // Handle invitation for selected user
  const handleInviteSelectedUser = async () => {
    if (!selectedUser) return;
    
    setInviteLoading(true);
    
    try {
      const detectionResult = await ipDetector.detectIP();
      const baseURL = `http://${detectionResult.ip}:8000`;
      
      console.log('🚀 Sending invitation to:', {
        userId: selectedUser.id,
        username: selectedUser.username,
        streamId,
        hasToken: !!accessToken,
        detectedIP: detectionResult.ip
      });
      
      const response = await fetch(`${baseURL}/api/streams/${streamId}/invite-users/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          username: selectedUser.username,
          stream_type: 'multi',
          max_seats: maxSeats,
        }),
      });

      console.log('📱 Response status:', response.status);
      
      const data = await response.json();
      console.log('📥 Response data:', data);

      if (response.ok) {
        Alert.alert(
          'Invitation Sent! 🎉',
          `Successfully invited ${selectedUser.first_name || selectedUser.username} to join your multi-live stream. They will receive a notification to approve or decline.`,
          [{ text: 'Great!', style: 'default' }]
        );
        
        // Clear form and close modal
        setUsernameToInvite('');
        setSelectedUser(null);
        setSearchResults([]);
        setAddParticipantModalVisible(false);
        
      } else {
        Alert.alert(
          'Invitation Failed',
          data.error || 'Could not send invitation. Please try again.',
          [{ text: 'OK', style: 'default' }]
        );
      }
      
    } catch (error: any) {
      console.error('💥 Error inviting user:', error);
      
      if (error?.message === 'Network request failed') {
        Alert.alert(
          'Connection Error',
          'Unable to connect to the server. Please check your internet connection and try again.',
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        Alert.alert(
          'Network Error',
          'Could not send invitation. Please check your connection and try again.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    } finally {
      setInviteLoading(false);
    }
  };

  // Handle removing participant from stream
  const handleRemoveParticipant = async (participantId: string) => {
    try {
      // Show confirmation alert
      Alert.alert(
        'Remove Participant',
        'Are you sure you want to remove this participant from the stream?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('🔄 Starting participant removal process...');
                
                const detectionResult = await ipDetector.detectIP();
                const dynamicIP = detectionResult.ip;
                const baseURL = `http://${dynamicIP}:8000`;
                const removeURL = `${baseURL}/api/streams/${streamId}/remove-participant/`;
                
                console.log('🌐 IP Detection Result:', {
                  ip: dynamicIP,
                  method: detectionResult.method,
                  confidence: detectionResult.confidence
                });
                
                console.log('📡 Remove Participant Request:', {
                  url: removeURL,
                  participantId,
                  streamId,
                  hasToken: !!accessToken
                });
                
                const response = await fetch(removeURL, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                  },
                  body: JSON.stringify({
                    participant_id: participantId,
                  }),
                });
                
                console.log('📥 Remove Response Status:', response.status);
                
                const data = await response.json();
                console.log('📥 Remove Response Data:', data);
                
                if (response.ok) {
                  // Refresh stream details to update participants list
                  refetchStreamDetails();
                  
                  Alert.alert(
                    'Participant Removed',
                    'The participant has been removed from your stream.',
                    [{ text: 'OK', style: 'default' }]
                  );
                } else {
                  console.error('❌ Remove Participant Failed:', {
                    status: response.status,
                    error: data.error || data,
                    url: removeURL
                  });
                  
                  Alert.alert(
                    'Error',
                    data.error || data.detail || `Failed to remove participant (Status: ${response.status}). Please try again.`,
                    [{ text: 'OK', style: 'default' }]
                  );
                }
              } catch (error: any) {
                console.error('💥 Remove Participant Error:', {
                  error: error.message || error,
                  participantId,
                  streamId,
                  hasToken: !!accessToken
                });
                
                if (error?.message === 'Network request failed') {
                  Alert.alert(
                    'Connection Error',
                    'Unable to connect to the server. Please check your internet connection and try again.',
                    [{ text: 'OK', style: 'default' }]
                  );
                } else {
                  Alert.alert(
                    'Connection Error',
                    `Unable to remove participant. Error: ${error?.message || 'Unknown error'}. Please check your connection and try again.`,
                    [{ text: 'OK', style: 'default' }]
                  );
                }
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error in handleRemoveParticipant:', error);
    }
  };

  // Handle inviting user directly from search results (simplified version)
  const handleInviteUser = async (user: any) => {
    if (!user) return;
    
    setInviteLoading(true);
    setInvitingUserId(user.id);
    
    try {
      const detectionResult = await ipDetector.detectIP();
      const dynamicIP = detectionResult.ip;
      const baseURL = `http://${dynamicIP}:8000`;
      const inviteURL = `${baseURL}/api/streams/${streamId}/invite-users/`;
      
      // Check if user is already a viewer in this stream
      const existingViewer = streamDetails?.participants?.find(p => 
        p.user?.id === user.id && p.is_active && p.participant_type === 'viewer'
      );
      
      console.log('🚀 Sending invitation:', {
        url: inviteURL,
        username: user.username,
        streamId,
        hasToken: !!accessToken,
        isCurrentViewer: !!existingViewer,
        action: existingViewer ? 'promote_viewer_to_guest' : 'invite_new_guest'
      });
      
      const response = await fetch(inviteURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          username: user.username, // Changed from usernames array to single username
        }),
      });
      
      const data = await response.json();
      console.log('📥 Invite response:', { status: response.status, data });
      
      if (response.ok) {
        const successMessage = existingViewer 
          ? `🎉 @${user.username} has been promoted from viewer to guest! They can now join as a co-host with video and audio.`
          : `🎉 Guest invitation sent to @${user.username}! They will receive a notification to join your stream as a co-host.`;
        
        Alert.alert(
          existingViewer ? 'Viewer Promoted to Guest! 🚀' : 'Guest Invitation Sent! 📧',
          successMessage,
          [{ text: 'Awesome!', style: 'default' }]
        );
        
        // Clear search and close modal
        setSearchQuery('');
        setSearchResults([]);
      } else {
        Alert.alert(
          'Invitation Failed',
          data.error || 'Could not send invitation. Please try again.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('Error inviting user:', error);
      Alert.alert(
        'Connection Error',
        'Unable to send invitation. Please check your connection and try again.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setInviteLoading(false);
      setInvitingUserId(null);
    }
  };

  const CustomStreamContent = () => {
    const { useParticipants } = useCallStateHooks();
    const participants = useParticipants();
    const localParticipant = participants.find(p => p.isLocalParticipant);
    const remoteParticipants = participants.filter(p => !p.isLocalParticipant);
    const allActiveParticipants = participants.filter(p => p.videoStream);

    console.log('🎥 Stream participants (HOST VIEW):', {
      total: participants.length,
      local: localParticipant ? 1 : 0,
      remote: remoteParticipants.length,
      activeVideo: allActiveParticipants.length,
      participantDetails: participants.map(p => ({
        id: p.userId,
        name: p.name,
        isLocal: p.isLocalParticipant,
        hasVideo: !!p.videoStream,
        hasAudio: !!p.audioStream,
      })),
      remoteDetails: remoteParticipants.map(p => ({
        id: p.userId,
        name: p.name,
        hasVideo: !!p.videoStream,
        hasAudio: !!p.audioStream,
      }))
    });

    // Show loading if no participant found
    if (!localParticipant) {
      return (
        <View className="flex-1 items-center justify-center bg-black">
          <Text className="text-white text-lg mb-2">🔄 Connecting...</Text>
          <Text className="text-gray-400 text-sm">Establishing connection</Text>
        </View>
      );
    }

    // Show loading if video stream not ready
    if (!localParticipant.videoStream) {
      return (
        <View className="flex-1 items-center justify-center bg-black">
          <Text className="text-white text-lg mb-2">🎥 Initializing camera...</Text>
          <Text className="text-gray-400 text-sm">Please wait</Text>
        </View>
      );
    }

    // Multi-participant layout logic
    if (allActiveParticipants.length === 1) {
      // Single participant (host only) - full screen
      return (
        <View className="flex-1 bg-black">
          <VideoRenderer 
            participant={localParticipant}
            objectFit="cover"
          />
        </View>
      );
    } else if (allActiveParticipants.length === 2) {
      // Two participants - split screen vertically
      return (
        <View className="flex-1 bg-black">
          <View className="flex-1">
            <VideoRenderer 
              participant={allActiveParticipants[0]}
              objectFit="cover"
            />
            {/* Participant label */}
            <View className="absolute bottom-4 left-4 bg-black/60 rounded-full px-3 py-1">
              <Text className="text-white text-xs font-semibold">
                {allActiveParticipants[0].isLocalParticipant ? 'You' : allActiveParticipants[0].name || 'Guest'}
              </Text>
            </View>
          </View>
          <View className="flex-1">
            <VideoRenderer 
              participant={allActiveParticipants[1]}
              objectFit="cover"
            />
            {/* Participant label */}
            <View className="absolute bottom-4 left-4 bg-black/60 rounded-full px-3 py-1">
              <Text className="text-white text-xs font-semibold">
                {allActiveParticipants[1].isLocalParticipant ? 'You' : allActiveParticipants[1].name || 'Guest'}
              </Text>
            </View>
          </View>
        </View>
      );
    } else if (allActiveParticipants.length === 3) {
      // Three participants - one large, two small
      const [mainParticipant, ...smallParticipants] = allActiveParticipants;
      return (
        <View className="flex-1 bg-black">
          {/* Main participant (larger view) */}
          <View className="flex-2">
            <VideoRenderer 
              participant={mainParticipant}
              objectFit="cover"
            />
            <View className="absolute bottom-4 left-4 bg-black/60 rounded-full px-3 py-1">
              <Text className="text-white text-xs font-semibold">
                {mainParticipant.isLocalParticipant ? 'You' : mainParticipant.name || 'Guest'}
              </Text>
            </View>
          </View>
          
          {/* Bottom row with two smaller participants */}
          <View className="flex-1 flex-row">
            {smallParticipants.map((participant, index) => (
              <View key={participant.sessionId} className="flex-1">
                <VideoRenderer 
                  participant={participant}
                  objectFit="cover"
                />
                <View className="absolute bottom-2 left-2 bg-black/60 rounded-full px-2 py-1">
                  <Text className="text-white text-xs font-semibold">
                    {participant.isLocalParticipant ? 'You' : participant.name || 'Guest'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      );
    } else if (allActiveParticipants.length >= 4) {
      // Four or more participants - 2x2 grid
      return (
        <View className="flex-1 bg-black">
          <View className="flex-1 flex-row">
            <View className="flex-1">
              <VideoRenderer 
                participant={allActiveParticipants[0]}
                objectFit="cover"
              />
              <View className="absolute bottom-2 left-2 bg-black/60 rounded-full px-2 py-1">
                <Text className="text-white text-xs font-semibold">
                  {allActiveParticipants[0].isLocalParticipant ? 'You' : allActiveParticipants[0].name || 'Guest'}
                </Text>
              </View>
            </View>
            <View className="flex-1">
              <VideoRenderer 
                participant={allActiveParticipants[1]}
                objectFit="cover"
              />
              <View className="absolute bottom-2 left-2 bg-black/60 rounded-full px-2 py-1">
                <Text className="text-white text-xs font-semibold">
                  {allActiveParticipants[1].isLocalParticipant ? 'You' : allActiveParticipants[1].name || 'Guest'}
                </Text>
              </View>
            </View>
          </View>
          <View className="flex-1 flex-row">
            <View className="flex-1">
              <VideoRenderer 
                participant={allActiveParticipants[2]}
                objectFit="cover"
              />
              <View className="absolute bottom-2 left-2 bg-black/60 rounded-full px-2 py-1">
                <Text className="text-white text-xs font-semibold">
                  {allActiveParticipants[2].isLocalParticipant ? 'You' : allActiveParticipants[2].name || 'Guest'}
                </Text>
              </View>
            </View>
            {allActiveParticipants[3] && (
              <View className="flex-1">
                <VideoRenderer 
                  participant={allActiveParticipants[3]}
                  objectFit="cover"
                />
                <View className="absolute bottom-2 left-2 bg-black/60 rounded-full px-2 py-1">
                  <Text className="text-white text-xs font-semibold">
                    {allActiveParticipants[3].isLocalParticipant ? 'You' : allActiveParticipants[3].name || 'Guest'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      );
    }

    // Fallback - show local participant only
    return (
      <View className="flex-1 bg-black">
        <VideoRenderer 
          participant={localParticipant}
          objectFit="cover"
        />
      </View>
    );
  };

  const renderStreamContent = () => {
    // Show loading immediately when live is set, even before stream client is ready
    if (isLive && (!streamClient || !call)) {
      return (
        <View className="flex-1 items-center justify-center bg-black">
          <Text className="text-white text-lg mb-2">🎥 Connecting to stream...</Text>
          <Text className="text-gray-400 text-sm">Please wait a moment</Text>
        </View>
      );
    }

    // Show stream content when everything is ready
    if (streamClient && call) {
      return (
        <View className="flex-1 bg-black">
          <StreamVideo client={streamClient}>
            <StreamCall call={call}>
              <CustomStreamContent />
            </StreamCall>
          </StreamVideo>
        </View>
      );
    }

    // Default state - setting up
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-white text-lg mb-2">🎥 Setting up live stream...</Text>
        <Text className="text-gray-400 text-sm">This may take a few seconds</Text>
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
      
      {/* Full Screen Stream Content - Background Layer */}
      <View className="flex-1">
        {renderStreamContent()}
      </View>

      {/* Custom UI Overlays - Above the stream */}
      {/* Top Profile Header */}
      {isLive && (
        <View className="absolute top-16 left-4 right-4 flex-row items-center justify-between" style={{ zIndex: 10 }}>
          {/* Profile Section */}
          <View className="flex-row items-center bg-black/60 rounded-full px-2 py-2 flex-1 mr-3">
            {/* Avatar */}
            <View className="w-12 h-12 rounded-full bg-gray-400 mr-3 overflow-hidden">
              <DynamicImage
                mediaUrl={currentUser?.profile_picture_url || currentUser?.profile_picture}
                width={40}
                height={40}
                className="w-full h-full rounded-full"
                style={{ resizeMode: 'cover' }}
              >
                <View className="w-full h-full bg-gray-400 items-center justify-center">
                  <Text className="text-white font-bold text-sm">
                    {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              </DynamicImage>
            </View>
            
            {/* Name and Username */}
            <View className="flex-1">
              <Text className="text-white font-semibold text-base" numberOfLines={1}>
                {currentUser?.first_name && currentUser?.last_name 
                  ? `${currentUser.first_name} ${currentUser.last_name}` 
                  : currentUser?.username || 'User'}
              </Text>
              <Text className="text-gray-300 text-xs" numberOfLines={1}>
                @{currentUser?.username || 'user'}
              </Text>
            </View>
            
            {/* Share Button - Only show share button, no follow button for hosts */}
            <TouchableOpacity 
              className="w-12 h-12 rounded-full bg-white items-center justify-center ml-2"
              onPress={() => setShareModalVisible(true)}
            >
              <Ionicons name="share-social" size={20} color="black" fillColor="white" />
            </TouchableOpacity>
          </View>
          
          {/* Close Button */}
          <TouchableOpacity 
            onPress={() => setEndStreamModalVisible(true)}
            className="w-10 h-10 rounded-full items-center justify-center"
          >
            <CancelIcon width={25} height={25} />
          </TouchableOpacity>
        </View>
      )}

      
      {/* Stream Info Overlay */}
      {/* {isLive && (
        <View className="absolute bottom-20 left-4 right-20" style={{ zIndex: 10 }}>
          <View className="bg-black/40 rounded-lg p-3">
            <Text className="text-white font-semibold text-base">
              @{currentUser?.username || 'user'}
            </Text>
            <Text className="text-gray-300 text-sm">
              Multi Live • {params.channel ? (params.channel as string).replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Video'}
            </Text>
            <Text className="text-gray-400 text-xs mt-1">
              Seats: {currentActiveSeats}/{maxSeats} {availableSeats > 0 ? `(${availableSeats} available)` : '(Full)'}
            </Text>
          </View>
        </View>
      )}

      {/* Live Chat Overlay - Shows over the video like TikTok/Instagram Live */}
      {isLive && messages.length > 0 && (
        <View className="absolute left-4 right-20" style={{ 
          zIndex: 5,
          bottom: isKeyboardVisible ? keyboardHeight + 100 : 170, // More space above comment input
        }}>
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
          
          <View style={{ maxHeight: 280 }}> {/* Increased height and use style prop for better control */}
            <FlatList
              ref={chatFlatListRef}
              data={messages.slice(-6)} // Show only last 6 messages in overlay
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item, index }) => {
                // Calculate opacity based on position (fade effect like Instagram Live)
                const fadeOpacity = index < 2 ? 0.2 + (index * 0.4) : 1;
                
                return (
                <View className="mb-2" style={{ opacity: fadeOpacity }}>
                  {item.message_type === 'join' ? (
                    <View className="flex-row items-center">
                      <View className="bg-green-500/20 rounded-lg px-3 py-2 border border-green-500/30 flex-row items-center flex-shrink-1" style={{ maxWidth: '85%' }}>
                        {/* User Avatar */}
                        <View className="w-6 h-6 rounded-full bg-gray-400 mr-2 overflow-hidden">
                          {(item.user.profile_picture_url || item.user.avatar_url) ? (
                            <Image 
                              source={{ uri: (() => {
                                const profileUrl = item.user.profile_picture_url || item.user.avatar_url;
                                const baseUrl = apiBaseUrl.replace('/api/', '');
                                if (profileUrl && typeof profileUrl === 'string') {
                                  if (profileUrl.startsWith('http')) {
                                    return profileUrl;
                                  } else {
                                    const cleanPath = profileUrl.startsWith('/') ? profileUrl : `/${profileUrl}`;
                                    return baseUrl + cleanPath;
                                  }
                                }
                                return '';
                              })() }}
                              className="w-full h-full"
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="w-full h-full bg-green-500 items-center justify-center">
                              <Text className="text-white font-bold text-xs">
                                {(item.user.full_name || item.user.username || 'U').charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-green-400 text-sm font-medium">
                          <Text className="font-bold">{item.user.full_name || item.user.username || 'User'}</Text> joined
                        </Text>
                      </View>
                    </View>
                  ) : item.message_type === 'leave' ? (
                    <View className="flex-row items-center">
                      <View className="bg-red-500/20 rounded-lg px-3 py-2 border border-red-500/30 flex-row items-center flex-shrink-1" style={{ maxWidth: '85%' }}>
                        {/* User Avatar */}
                        <View className="w-6 h-6 rounded-full bg-gray-400 mr-2 overflow-hidden">
                          {(item.user.profile_picture_url || item.user.avatar_url) ? (
                            <Image 
                              source={{ uri: (() => {
                                const profileUrl = item.user.profile_picture_url || item.user.avatar_url;
                                const baseUrl = apiBaseUrl.replace('/api/', '');
                                if (profileUrl && typeof profileUrl === 'string') {
                                  if (profileUrl.startsWith('http')) {
                                    return profileUrl;
                                  } else {
                                    const cleanPath = profileUrl.startsWith('/') ? profileUrl : `/${profileUrl}`;
                                    return baseUrl + cleanPath;
                                  }
                                }
                                return '';
                              })() }}
                              className="w-full h-full"
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="w-full h-full bg-red-500 items-center justify-center">
                              <Text className="text-white font-bold text-xs">
                                {(item.user.full_name || item.user.username || 'U').charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-red-400 text-sm font-medium">
                          <Text className="font-bold">{item.user.full_name || item.user.username || 'User'}</Text> left
                        </Text>
                      </View>
                    </View>
                  ) : item.message_type === 'gift' ? (
                    <View className="flex-row items-center justify-center mb-2">
                      <View className="bg-white/90 rounded-full px-4 py-2 flex-row items-center" style={{ maxWidth: '85%' }}>
                        {/* User Avatar */}
                        <View className="w-8 h-8 rounded-full bg-gray-400 mr-3 overflow-hidden">
                          {(item.user.profile_picture_url || item.user.avatar_url) ? (
                            <Image 
                              source={{ uri: (() => {
                                const profileUrl = item.user.profile_picture_url || item.user.avatar_url;
                                const baseUrl = apiBaseUrl.replace('/api/', '');
                                if (profileUrl && typeof profileUrl === 'string') {
                                  if (profileUrl.startsWith('http')) {
                                    return profileUrl;
                                  } else {
                                    const cleanPath = profileUrl.startsWith('/') ? profileUrl : `/${profileUrl}`;
                                    return baseUrl + cleanPath;
                                  }
                                }
                                return '';
                              })() }}
                              className="w-full h-full"
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="w-full h-full bg-purple-500 items-center justify-center">
                              <Text className="text-white font-bold text-xs">
                                {(item.user.full_name || item.user.username || 'U').charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                        
                        {/* Gift Message */}
                        <View className="flex-row items-center">
                          <Text className="text-black text-sm font-semibold mr-2">
                            {item.user.full_name || item.user.username || 'User'} gifted{' '}
                          </Text>
                          
                          {/* Gift Icon - Show image if available, fallback to emoji */}
                          {item.gift_icon && (item.gift_icon.startsWith('/') || item.gift_icon.includes('gifts/')) ? (
                            <Image 
                              source={{ uri: `${apiBaseUrl}/media/${item.gift_icon.startsWith('/') ? item.gift_icon.substring(1) : item.gift_icon}` }}
                              style={{ width: 20, height: 20, marginRight: 4 }}
                              resizeMode="contain"
                              onError={(e) => {
                                console.log('Gift icon load error:', item.gift_icon, e.nativeEvent.error);
                              }}
                              onLoad={() => {
                                console.log('Gift icon loaded successfully:', item.gift_icon);
                              }}
                            />
                          ) : (
                            <Text className="text-lg mr-1">{item.gift_icon || '🎁'}</Text>
                          )}
                          
                          {item.gift_quantity > 1 && (
                            <Text className="text-black font-bold">x{item.gift_quantity}</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View className="flex-row items-start">
                      {/* User Avatar */}
                      <View className="w-8 h-8 rounded-full bg-gray-400 mr-3 overflow-hidden flex-shrink-0">
                        {(item.user.profile_picture_url || item.user.avatar_url) ? (
                          <Image 
                            source={{ uri: (() => {
                              const profileUrl = item.user.profile_picture_url || item.user.avatar_url;
                              const baseUrl = apiBaseUrl.replace('/api/', '');
                              if (profileUrl && typeof profileUrl === 'string') {
                                if (profileUrl.startsWith('http')) {
                                  return profileUrl;
                                } else {
                                  const cleanPath = profileUrl.startsWith('/') ? profileUrl : `/${profileUrl}`;
                                  return baseUrl + cleanPath;
                                }
                              }
                              return '';
                            })() }}
                            className="w-full h-full"
                            resizeMode="cover"
                            onError={(e) => console.log('Chat avatar load error for user:', item.user.username, e.nativeEvent.error)}
                            onLoad={() => console.log('Chat avatar loaded for user:', item.user.username)}
                          />
                        ) : (
                          <View className="w-full h-full bg-purple-500 items-center justify-center">
                            <Text className="text-white font-bold text-xs">
                              {(item.user.full_name || item.user.username || 'U').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      {/* Message container that adjusts to content width */}
                      <View className="bg-black/40 rounded-2xl px-4 py-3 flex-shrink-1" style={{ maxWidth: '75%' }}>
                        <Text className="font-bold text-white text-sm mb-1">
                          {item.user.full_name || item.user.username || 'User'}
                        </Text>
                        <Text className="text-gray-200 text-sm">
                          {item.message}
                        </Text>
                      </View>
                    </View>
                  )}
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

      {/* Bottom Comment Bar - For hosts: no gift icon, keep add team for inviting participants */}
      {isLive && (
        <Animated.View 
          className="absolute left-4 right-4 flex-row items-center gap-3" 
          style={{ 
            zIndex: 10,
            bottom: isKeyboardVisible ? keyboardHeight + 20 : 48, // Increased spacing when keyboard is visible
          }}
        >
          {/* Comment Input */}
          <View className="flex-1 bg-black/40 rounded-full px-4 py-4">
            <TextInput
              placeholder="Type comment here..."
              placeholderTextColor="#999"
              value={comment}
              onChangeText={setComment}
              className="text-white text-base"
              multiline={false}
              maxLength={200}
              returnKeyType="send"
              onSubmitEditing={handleSendComment}
              blurOnSubmit={false}
            />
          </View>
          
          {/* Add Team Icon - Keep for hosts to invite participants */}
          <TouchableOpacity 
            className={`w-12 h-12 rounded-full items-center justify-center ${
              availableSeats <= 0 ? 'bg-red-500/40' : 'bg-black/40'
            }`}
            onPress={handleAddTeamPress}
          >
            <AddTeamIcon width={24} height={24} />
            {availableSeats <= 0 && (
              <View className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full items-center justify-center">
                <Text className="text-white text-xs font-bold">!</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Floating Action Buttons */}
      {isLive && (
        <View className="absolute bottom-6 right-4 gap-3" style={{ zIndex: 10 }}>
          {/* Chat Toggle Button */}
          <Animated.View 
            style={{ transform: [{ scale: floatingButtonScale }] }}
          >
            {/* <TouchableOpacity
              onPress={() => setChatVisible(!chatVisible)}
              className="w-14 h-14 rounded-full items-center justify-center shadow-lg"
            >
              <LinearGradient
                colors={chatVisible ? ['#10B981', '#065F46'] : ['#6B7280', '#374151']}
                className="w-full h-full rounded-full items-center justify-center"
              >
                <Text className="text-white text-xl">💬</Text>
              </LinearGradient>
            </TouchableOpacity> */}
          </Animated.View>
          
          {/* Invite Button */}
          {/* <Animated.View 
            style={{ transform: [{ scale: floatingButtonScale }] }}
          >
            <TouchableOpacity
              onPress={() => setInviteModalVisible(true)}
              className="w-14 h-14 rounded-full items-center justify-center shadow-lg"
            >
              <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                className="w-full h-full rounded-full items-center justify-center"
              >
                <Text className="text-white text-2xl font-light">+</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View> */}
        </View>
      )}

      {/* Members List Modal - Matches the design from the image */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addParticipantModalVisible}
        onRequestClose={() => setAddParticipantModalVisible(false)}
      >
        <KeyboardAvoidingView 
          className="flex-1" 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View className="flex-1 bg-black/80">
            <View 
              className="bg-[#1A1A1A]/50 rounded-t-3xl"
              style={{
                marginTop: isKeyboardVisible ? 10 : 80,
                maxHeight: isKeyboardVisible ? '85%' : '90%',
                flex: 1,
              }}
            >
            {/* Header */}
            <View className="flex-row items-center justify-between p-6 pb-4">
              <Text className="text-white text-xl font-bold">
                Members List
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setUsernameToInvite('');
                  setSearchQuery('');
                  setSearchResults([]);
                  setSelectedUser(null);
                  setAddParticipantModalVisible(false);
                }}
                className="w-8 h-8 items-center justify-center"
              >
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>
            
            {/* Tabs */}
            <View className="px-6 mb-4">
              <View className="flex-row bg-[#2A2A2A] rounded-lg p-1 gap-2">
                <TouchableOpacity
                  onPress={() => setSelectedTab('guests')}
                  className={`flex-1 py-3 rounded-md ${
                    selectedTab === 'guests' ? 'bg-white' : 'bg-transparent'
                  }`}
                >
                  <Text className={`text-center font-semibold ${
                    selectedTab === 'guests' ? 'text-black' : 'text-gray-400'
                  }`}>
                    Guests
            </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSelectedTab('audience')}
                  className={`flex-1 py-3 rounded-md ${
                    selectedTab === 'audience' ? 'bg-white' : 'bg-transparent'
                  }`}
                >
                  <Text className={`text-center font-semibold ${
                    selectedTab === 'audience' ? 'text-black' : 'text-gray-400'
                  }`}>
                    Audience
                </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Search Input */}
            <View className="px-6 mb-4">
              <View
                className="flex-row items-center rounded-full px-3 h-14"
                style={{
                  borderWidth: 1,
                  borderColor: searchQuery.length > 0 ? '#C42720' : '#353638'
                }}
              >
                <Ionicons name="search" size={20} color="#FFFFFF" />
                <TextInput
                  placeholder={selectedTab === 'guests' ? 'Search anyone to invite as guest' : 'Search viewers'}
                  placeholderTextColor="#757688"
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    if (text.length >= 2) {
                      handleUserSearch(text);
                    } else {
                      setSearchResults([]);
                      setSelectedUser(null);
                    }
                  }}
                  className="text-white text-base ml-2 flex-1"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={50}
                  returnKeyType="search"
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    if (searchQuery.length >= 2) {
                      handleUserSearch(searchQuery);
                    }
                  }}
                />
              </View>
              
              {/* Enhanced Helper Text for Guests Tab */}
              {selectedTab === 'guests' && searchQuery.length === 0 && (
                <Text className="text-gray-500 text-xs mt-2 px-3">
                  💡 Search for viewers to promote or any user to invite as guest
                </Text>
              )}
            </View>
            
            {/* Members List */}
            <ScrollView 
              className="flex-1 px-6" 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingBottom: isKeyboardVisible ? keyboardHeight + 40 : 20,
                flexGrow: 1
              }}
            >
              {/* Search Results - Show at top when searching */}
              {searchQuery.length >= 2 && (
              <View className="mb-4">
                  {searchLoading ? (
                    <View className="flex-1 items-center justify-center py-8">
                      <ActivityIndicator size="small" color="#C42720" />
                      <Text className="text-gray-400 text-sm mt-2">Searching users...</Text>
                    </View>
                  ) : searchResults.length > 0 ? (
                    <>
                      <Text className="text-gray-400 text-sm mb-3">
                        {selectedTab === 'guests' ? 'Invite as Guest' : 'Search Results'}
                </Text>
                  {searchResults.map((user) => (
                    <TouchableOpacity
                      key={user.id}
                      onPress={() => handleSelectUser(user)}
                          className="flex-row items-center py-4"
                    >
                      <View className="relative">
                            <DynamicProfileImage 
                              profilePictureUrl={user.profile_picture_url}
                              size={48}
                            >
                          <View className="w-12 h-12 rounded-full bg-[#3A3A3A] items-center justify-center">
                            <Text className="text-white font-bold text-lg">
                              {(user.first_name || user.username || 'U').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                            </DynamicProfileImage>
                      </View>
                      
                          <View className="flex-1 ml-4">
                            <Text className="text-white font-semibold text-base">
                          {user.first_name && user.last_name 
                            ? `${user.first_name} ${user.last_name}`
                            : user.username
                          }
                        </Text>
                            {(() => {
                              const existingViewer = streamDetails?.participants?.find(p => 
                                p.user?.id === user.id && p.is_active && p.participant_type === 'viewer'
                              );
                              
                              if (existingViewer) {
                                return (
                                  <View className="flex-row items-center mt-1">
                                    <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                                    <Text className="text-green-400 text-sm font-medium">🔴 Currently viewing • Can promote</Text>
                                  </View>
                                );
                              } else {
                                return (
                                  <View className="flex-row items-center mt-1">
                                    <Text className="text-red-500 text-sm font-medium">
                                      {user.follower_count || 0} followers
                        </Text>
                                  </View>
                                );
                              }
                            })()}
                      </View>
                      
                          {(() => {
                            const existingViewer = streamDetails?.participants?.find(p => 
                              p.user?.id === user.id && p.is_active && p.participant_type === 'viewer'
                            );
                            
                            if (existingViewer) {
                              return (
                                <TouchableOpacity
                                  onPress={() => handleInviteUser(user)}
                                  className="rounded-full overflow-hidden"
                                >
                                  <LinearGradient
                                    colors={['#10B981', '#059669']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    className="px-4 py-2 flex-row items-center"
                                  >
                                    <Ionicons name="arrow-up-circle" size={16} color="white" />
                                    <Text className="text-white font-semibold text-sm ml-1">Promote to Guest</Text>
                                  </LinearGradient>
                                </TouchableOpacity>
                              );
                            } else {
                              return (
                                <TouchableOpacity
                                  onPress={() => handleInviteUser(user)}
                                  disabled={invitingUserId === user.id}
                                  className={`px-4 py-2 rounded-full flex-row items-center ${invitingUserId === user.id ? 'bg-red-400' : 'bg-red-600'}`}
                                >
                                  {invitingUserId === user.id ? (
                                    <ActivityIndicator size="small" color="white" />
                                  ) : (
                                    <Ionicons name="person-add" size={16} color="white" />
                                  )}
                                  <Text className="text-white font-semibold text-sm ml-1">
                                    {invitingUserId === user.id ? 'Inviting...' : 'Invite as Guest'}
                                  </Text>
                                </TouchableOpacity>
                              );
                            }
                          })()}
                    </TouchableOpacity>
                  ))}
                    </>
                  ) : (
                    <View className="flex-1 items-center justify-center py-8">
                      <Ionicons name="search-outline" size={48} color="#666" />
                      <Text className="text-gray-400 text-center mt-2">
                        {selectedTab === 'guests' ? 'No users found' : 'No viewers found'}
                      </Text>
                      <Text className="text-gray-500 text-center text-sm mt-1">
                        {selectedTab === 'guests' 
                          ? 'Try searching for viewers to promote or any user to invite as guest'
                          : 'Only current viewers appear in search results'
                        }
                      </Text>
                    </View>
                  )}
              </View>
            )}
            
              {/* Regular Lists - Hidden when searching */}
              {searchQuery.length < 2 && selectedTab === 'guests' && (
                activeGuests.length > 0 ? (
                  activeGuests.map((participant) => (
                <View key={participant.id} className="flex-row items-center py-4">
                  {/* Profile Picture */}
                  <View className="relative">
                    <DynamicProfileImage 
                      profilePictureUrl={participant.user?.profile_picture_url}
                      size={48}
                    >
                      <View className="w-12 h-12 rounded-full bg-[#3A3A3A] items-center justify-center">
                        <Text className="text-white font-bold text-lg">
                          {(participant.user?.first_name || participant.user?.username || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    </DynamicProfileImage>
                  </View>
                  
                  {/* User Info */}
                  <View className="flex-1 ml-4">
                    <Text className="text-white font-semibold text-base">
                      {participant.user?.first_name || participant.user?.username || 'Unknown User'}
                    </Text>
                    <Text className="text-gray-400 text-sm">
                      {participant.user?.vip_level || 'basic'} • {participant.participant_type}
                    </Text>
                  </View>
                  
                  {/* Remove Button */}
                  <TouchableOpacity
                    onPress={() => handleRemoveParticipant(participant.id.toString())}
                    className="bg-red-500/20 px-4 py-2 rounded-full"
                  >
                    <Text className="text-red-400 font-semibold text-sm">Remove</Text>
                  </TouchableOpacity>
                </View>
                  ))
                ) : (
                  <View className="flex-1 items-center justify-center py-20">
                    <Ionicons name="people-outline" size={48} color="#666" />
                    <Text className="text-gray-400 text-center mt-4">
                      No guests yet
                    </Text>
                    <Text className="text-gray-500 text-center text-sm mt-2">
                      Invited guests will appear here when they join your stream
                    </Text>
              </View>
                )
              )}
              
              {searchQuery.length < 2 && selectedTab === 'audience' && (
                <View className="mt-4">
                  {/* Show viewers/audience */}
                  {activeViewers.length > 0 ? (
                    activeViewers.map((viewer) => (
                        <View key={viewer.id} className="flex-row items-center py-4">
                          {/* Profile Picture */}
                          <View className="relative">
                            <DynamicProfileImage 
                              profilePictureUrl={viewer.user?.profile_picture_url}
                              size={48}
                            >
                              <View className="w-12 h-12 rounded-full bg-[#3A3A3A] items-center justify-center">
                                <Text className="text-white font-bold text-lg">
                                  {(viewer.user?.first_name || viewer.user?.username || 'V').charAt(0).toUpperCase()}
                                </Text>
                              </View>
                            </DynamicProfileImage>
                          </View>
                          
                          {/* User Info */}
                          <View className="flex-1 ml-4">
                            <Text className="text-white font-semibold text-base">
                              {viewer.user?.first_name || viewer.user?.username || 'Viewer'}
                            </Text>
                            <Text className="text-gray-400 text-sm">
                              Viewing • {viewer.user?.vip_level || 'basic'}
                            </Text>
                          </View>
                          
                          {/* Remove Button */}
              <TouchableOpacity
                            onPress={() => handleRemoveParticipant(viewer.id.toString())}
                            className="bg-red-500/20 px-4 py-2 rounded-full"
                          >
                            <Text className="text-red-400 font-semibold text-sm">Remove</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                  ) : (
                    <View className="flex-1 items-center justify-center py-20">
                      <Ionicons name="people-outline" size={48} color="#666" />
                      <Text className="text-gray-400 text-center mt-4">
                        No audience members yet
                      </Text>
                      <Text className="text-gray-500 text-center text-sm mt-2">
                        Viewers will appear here when they join your stream
                      </Text>
                    </View>
                  )}
                </View>
              )}
            
            </ScrollView>
          </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Chat Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={chatVisible}
        onRequestClose={() => setChatVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/50"
        >
          <View className="bg-[#1A1A1A] rounded-t-3xl h-96">
            {/* Chat Header */}
            <View className="flex-row items-center justify-between p-4 border-b border-gray-700">
              <Text className="text-white text-lg font-semibold">💬 Live Chat</Text>
              <TouchableOpacity
                onPress={() => setChatVisible(false)}
                className="w-8 h-8 rounded-full bg-gray-600 items-center justify-center"
              >
                <CancelIcon width={16} height={16} />
              </TouchableOpacity>
            </View>
            
            {/* Messages List */}
            <View className="flex-1 px-4">
              <FlatList
                data={messages}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View className="py-2">
                    {item.message_type === 'join' ? (
                      <View className="items-center py-1">
                        <View className="bg-green-500/20 rounded-full px-3 py-1 border border-green-500/30">
                          <Text className="text-green-400 text-xs font-medium">
                            {item.user.full_name || item.user.username || 'User'} joined the stream
                          </Text>
                        </View>
                      </View>
                    ) : item.message_type === 'leave' ? (
                      <View className="items-center py-1">
                        <View className="bg-red-500/20 rounded-full px-3 py-1 border border-red-500/30">
                          <Text className="text-red-400 text-xs font-medium">
                            {item.user.full_name || item.user.username || 'User'} left the stream
                          </Text>
                        </View>
                      </View>
                    ) : item.message_type === 'gift' ? (
                      <View className="items-center py-1">
                        <View className="bg-purple-500/20 rounded-lg px-3 py-2 border border-purple-500/30">
                          <Text className="text-purple-300 text-sm font-medium text-center">
                            <Text className="font-bold text-purple-200">{item.user.full_name || item.user.username || 'User'}</Text> gifted{' '}
                            <Text className="text-yellow-400">{item.gift_icon || '🎁'} {item.gift_name || 'a gift'}</Text>
                            {item.gift_quantity > 1 && (
                              <Text className="text-yellow-400"> x{item.gift_quantity}</Text>
                            )}
                            {item.gift_receiver && (
                              <Text className="text-purple-200"> to {item.gift_receiver.full_name || item.gift_receiver.username || 'Host'}</Text>
                            )}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View className="flex-row items-start gap-3 py-2">
                        {/* User Avatar */}
                        <View className="w-10 h-10 rounded-full bg-gray-400 overflow-hidden flex-shrink-0">
                          {(item.user.profile_picture_url || item.user.avatar_url) ? (
                            <Image 
                              source={{ uri: (() => {
                                const profileUrl = item.user.profile_picture_url || item.user.avatar_url;
                                const baseUrl = apiBaseUrl.replace('/api/', '');
                                if (profileUrl && typeof profileUrl === 'string') {
                                  if (profileUrl.startsWith('http')) {
                                    return profileUrl;
                                  } else {
                                    const cleanPath = profileUrl.startsWith('/') ? profileUrl : `/${profileUrl}`;
                                    return baseUrl + cleanPath;
                                  }
                                }
                                return '';
                              })() }}
                              className="w-full h-full"
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="w-full h-full bg-purple-500 items-center justify-center">
                              <Text className="text-white font-bold text-sm">
                                {(item.user.full_name || item.user.username || 'U').charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                        
                        {/* Name and Message on separate lines with timestamp */}
                        <View className="flex-1">
                          <View className="flex-row items-center gap-2 mb-1">
                            <Text className="text-gray-400 text-xs">
                              {new Date(item.created_at).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </Text>
                          </View>
                          <Text className="font-bold text-purple-400 text-sm mb-1">
                            {item.user.full_name || item.user.username || 'User'}
                          </Text>
                          <Text className="text-white text-sm">
                            {item.message}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}
                showsVerticalScrollIndicator={false}
                className="flex-1"
                inverted // Show newest messages at bottom
              />
            </View>
            
            {/* Message Input */}
            <View className="flex-row items-center gap-3 p-4 border-t border-gray-700">
              <View className="flex-1 bg-[#2A2A2A] rounded-xl px-4 py-3">
                <TextInput
                  placeholder="Type a message..."
                  placeholderTextColor="#666"
                  value={newMessage}
                  onChangeText={setNewMessage}
                  className="text-white text-base"
                  autoCapitalize="sentences"
                  multiline
                  maxLength={500}
                  onSubmitEditing={handleSendMessage}
                  returnKeyType="send"
                  blurOnSubmit={false}
                />
              </View>
              
              <TouchableOpacity
                onPress={handleSendMessage}
                disabled={sendingMessage || !newMessage.trim()}
                className="w-12 h-12 rounded-xl items-center justify-center"
              >
                <LinearGradient
                  colors={sendingMessage || !newMessage.trim() ? ['#666', '#666'] : ['#8B5CF6', '#EC4899']}
                  className="w-full h-full rounded-xl items-center justify-center"
                >
                  <Text className="text-white text-lg">
                    {sendingMessage ? '⏳' : '📤'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
                <SearchIcon size={20} color="#ffffff" />
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

      {/* Share Stream Modal */}
      {/* End Stream Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={endStreamModalVisible}
        onRequestClose={() => setEndStreamModalVisible(false)}
      >
        <View className="flex-1 bg-black/70 items-center justify-center px-6">
          <View className="bg-gray-800/95 rounded-3xl p-8 w-full max-w-sm items-center">
            {/* Icon */}
            <View className="w-20 h-20 rounded-full bg-gray-700 items-center justify-center mb-6">
              <DareMeLiveIcon width={40} height={40} />
            </View>
            
            {/* Title */}
            <Text className="text-white text-2xl font-bold text-center mb-3">
              End Stream
            </Text>
            
            {/* Description */}
            <Text className="text-gray-300 text-base text-center leading-6 mb-8">
              Are you sure you want to end your live stream? All viewers will be disconnected and the stream will stop broadcasting.
            </Text>
            
            {/* Buttons */}
            <View className="w-full space-y-3">
              {/* Not Now Button */}
              {/* <TouchableOpacity
                onPress={() => setEndStreamModalVisible(false)}
                className="w-full py-4 rounded-full overflow-hidden"
              >
                <LinearGradient
                  colors={['#DC2626', '#B91C1C']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="w-full py-4 items-center justify-center"
                >
                  <Text className="text-white text-lg font-semibold">
                    Not Now
                  </Text>
                </LinearGradient>
              </TouchableOpacity> */}

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
                      onPress={() => setEndStreamModalVisible(false)}
                    >
                      <Text className="text-white text-[17px] font-semibold">Not Now</Text>
                    </TouchableOpacity>
                  </LinearGradient>
              </View>
              
                              {/* End Stream Button */}
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
                        setEndStreamModalVisible(false);
                        handleEndStream();
                      }}
                    >
                      <Text className="text-white text-[17px] font-semibold">End Stream</Text>
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
            </View>
          </View>
        </View>
      </Modal>

      <ShareStreamModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        streamData={{
          id: streamId || '',
          title: streamTitle,
          host: {
            username: currentUser?.username || '',
            full_name: currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : '',
          },
          mode: 'multi',
          channel: params.channel as string || 'general',
          is_live: isLive,
        }}
      />
    </KeyboardAvoidingView>
  );
} 