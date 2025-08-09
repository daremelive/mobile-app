import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, Alert, Animated, Modal, TextInput, KeyboardAvoidingView, Platform, FlatList, ScrollView, Image, Keyboard, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { selectCurrentUser } from '../../src/store/authSlice';
import { useCreateStreamMutation, useInviteUsersToStreamMutation, useStreamActionMutation, useGetStreamMessagesQuery, useSendMessageMutation, useGetGiftsQuery, useSendGiftMutation, useJoinStreamMutation, useLeaveStreamMutation, streamsApi } from '../../src/store/streamsApi';
import { useGetWalletSummaryQuery, useGetCoinPackagesQuery, usePurchaseCoinsMutation } from '../../src/api/walletApi';
import { walletApi } from '../../src/api/walletApi';
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
import IPDetector from '../../src/utils/ipDetector';

export default function SingleStreamScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const currentUser = useSelector(selectCurrentUser);
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
  
  // Invitation modal state
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [usernameToInvite, setUsernameToInvite] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  // Check if coming from title screen
  const fromTitleScreen = params.fromTitleScreen === 'true';
  const titleFromParams = params.title as string;
  
  const [streamTitle, setStreamTitle] = useState(titleFromParams || ''); // Use title from params if available
  
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

  // Dynamic API base URL from IP detector
  const [apiBaseUrl, setApiBaseUrl] = useState<string>('http://172.20.10.2:8000'); // Current server IP as fallback

  // Initialize API base URL when component mounts
  useEffect(() => {
    const initializeAPIBaseUrl = async () => {
      try {
        const detection = await IPDetector.detectIP();
        const baseUrl = `http://${detection.ip}:8000`;
        setApiBaseUrl(baseUrl);
        console.log(`🌐 [SingleStream] API Base URL detected: ${baseUrl} (confidence: ${detection.confidence})`);
      } catch (error) {
        console.error('❌ [SingleStream] Failed to detect IP, using fallback:', error);
        // Keep the fallback IP
      }
    };

    initializeAPIBaseUrl();
  }, []);

  // Initialize stream when component mounts
  useEffect(() => {
    // If coming from title screen, auto-start stream
    if (fromTitleScreen && titleFromParams) {
      console.log('🚀 Auto-starting single stream from title screen with title:', titleFromParams);
      initializeStream();
    } else {
      // Navigate to title screen instead of showing modal
      router.replace({
        pathname: '/(stream)/stream-title',
        params: {
          mode: 'single',
          channel: (params.channel as string) || 'video',
          seats: '1'
        }
      });
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
        
        // Build icon URL more robustly - handle different icon formats
        let iconUrl = null;
        if (latestMessage.gift_icon) {
          if (latestMessage.gift_icon.startsWith('http')) {
            // Already a full URL
            iconUrl = latestMessage.gift_icon;
          } else if (latestMessage.gift_icon.startsWith('/') || latestMessage.gift_icon.includes('gifts/')) {
            // Path-based icon - construct full URL using dynamic base URL
            const iconPath = latestMessage.gift_icon.startsWith('/') 
              ? latestMessage.gift_icon.substring(1) 
              : latestMessage.gift_icon;
            iconUrl = `${apiBaseUrl}/media/${iconPath}`;
          } else if (latestMessage.gift_icon.includes('.')) {
            // Likely a filename - assume it's in media/gifts/
            iconUrl = `${apiBaseUrl}/media/gifts/${latestMessage.gift_icon}`;
          }
          // If none of the above, iconUrl stays null and we'll use the emoji fallback
        }
        
        const newGiftAnimation = {
          id: animationId,
          gift: {
            id: latestMessage.gift?.id || 0,
            name: latestMessage.gift_name || 'Gift',
            icon_url: iconUrl,
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
        
        console.log('🎁 Receiver gift animation data:', { 
          original_gift_icon: latestMessage.gift_icon, 
          constructed_icon_url: iconUrl,
          api_base_url: apiBaseUrl,
          gift_data: newGiftAnimation.gift 
        });
        
        setActiveGiftAnimations(prev => [...prev, newGiftAnimation]);
      }
    }
  }, [messages, currentUser?.id, apiBaseUrl]); // Added apiBaseUrl to dependencies

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
        return;
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
            title: streamTitle.trim() || `${currentUser.username || 'User'}'s Live Stream`,
            mode: 'single' as const,
            channel: (params.channel as 'video' | 'game' | 'truth-or-dare' | 'banter') || 'video',
            max_seats: 1,
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
      // End the stream in the database first
      if (streamId) {
        try {
          console.log('🔴 Attempting to end stream in database:', streamId);
          const result = await streamAction({
            streamId: streamId,
            action: { action: 'end' }
          }).unwrap();
          console.log('✅ Stream ended in database successfully:', result);
          
          // Aggressively invalidate ALL stream-related cache to ensure ended streams don't appear
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
              { text: 'Force Close', onPress: () => {
                // Force cleanup and navigate back anyway
                console.log('🔴 Force closing stream - navigating back');
                router.back();
              }}
            ]
          );
          return; // Don't continue if database operation failed
        }
        
        // Stream ending logic: Hosts end the stream (which handles their departure automatically)
        console.log('✅ Stream ended by host - stream is now offline');
      }
      
      // Leave the GetStream call
      if (call) {
        console.log('🔴 Leaving GetStream call');
        try {
          // Disable camera and microphone BEFORE leaving the call
          console.log('🎤 Disabling microphone and camera...');
          await Promise.all([
            call.microphone.disable().catch((error: any) => {
              console.log('⚠️ Microphone disable error (may already be disabled):', error.message);
            }),
            call.camera.disable().catch((error: any) => {
              console.log('⚠️ Camera disable error (may already be disabled):', error.message);
            })
          ]);
          console.log('✅ Microphone and camera disabled');
          
          // Small delay to ensure media streams are properly closed
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Now leave the call
          await call.leave();
          console.log('✅ Left GetStream call successfully');
        } catch (callError) {
          console.log('⚠️ GetStream call leave error (may already be left):', callError);
          // Don't fail the entire operation for this
        }
      }
      
      console.log('🔴 Navigating to homepage from single stream');
      router.replace('/(tabs)/home'); // Navigate to homepage instead of going back
    } catch (error) {
      console.error('❌ End stream error:', error);
      
      // Show error to user
      Alert.alert(
        'Error',
        'An error occurred while ending the stream. The stream may still be live.',
        [
          { text: 'Try Again', onPress: () => handleEndStream() },
          { text: 'Close Anyway', onPress: () => {
            console.log('🔴 Force closing stream anyway - navigating to homepage');
            router.replace('/(tabs)/home'); // Also navigate to homepage on force close
          }}
        ]
      );
    }
  };

  const handleInviteUser = async () => {
    if (!usernameToInvite.trim() || !streamId) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    setInviteLoading(true);
    try {
      await inviteUsers({
        streamId,
        username: usernameToInvite.trim()
      }).unwrap();
      
      Alert.alert('Success', `Invitation sent to @${usernameToInvite}!`);
      setUsernameToInvite('');
      setInviteModalVisible(false);
    } catch (error: any) {
      console.error('Invite error:', error);
      Alert.alert('Error', error.data?.error || 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
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
      
      console.log('🎁 Sender gift animation data:', { 
        gift_icon_url: gift.icon_url,
        gift_icon: gift.icon,
        gift_name: gift.name,
        gift_data: gift 
      });
      
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
      console.error('❌ Send gift error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
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
    // Open the invite modal when add team is pressed
    setInviteModalVisible(true);
  };

  const CustomStreamContent = () => {
    const { useParticipants } = useCallStateHooks();
    const participants = useParticipants();
    const localParticipant = participants.find(p => p.isLocalParticipant);

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
    // Always show loading state if stream is starting
    if (!streamClient || !call) {
      return (
        <View className="flex-1 items-center justify-center bg-black">
          <Text className="text-white text-lg mb-2">🎥 Setting up live stream...</Text>
          <Text className="text-gray-400 text-sm">This may take a few seconds</Text>
        </View>
      );
    }

    return (
      <View className="flex-1 bg-black">
        <StreamVideo client={streamClient}>
          <StreamCall call={call}>
            <CustomStreamContent />
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
              {(currentUser?.profile_picture_url || currentUser?.profile_picture) ? (
                <Image 
                  source={{ uri: `${apiBaseUrl}${currentUser.profile_picture_url || currentUser.profile_picture}` }}
                  className="w-full h-full"
                  resizeMode="cover"
                  onError={(e) => console.log('Header avatar load error:', e.nativeEvent.error)}
                  onLoad={() => console.log('Header avatar loaded successfully')}
                />
              ) : (
                <View className="w-full h-full bg-gray-400 items-center justify-center">
                  <Text className="text-white font-bold text-sm">
                    {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
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
              Single Live • {params.channel ? (params.channel as string).replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Video'}
            </Text>
          </View>
        </View>
      )} */}

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
                              source={{ uri: `${apiBaseUrl}${item.user.profile_picture_url || item.user.avatar_url}` }}
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
                              source={{ uri: `${apiBaseUrl}${item.user.profile_picture_url || item.user.avatar_url}` }}
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
                              source={{ uri: `${apiBaseUrl}${item.user.profile_picture_url || item.user.avatar_url}` }}
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
                            source={{ uri: `${apiBaseUrl}${item.user.profile_picture_url || item.user.avatar_url}` }}
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

      {/* Bottom Comment Bar - For hosts: no gift icon, no add team button */}
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

      {/* Invitation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={inviteModalVisible}
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/50"
        >
          <View className="bg-[#1A1A1A] rounded-t-3xl p-6">
            <View className="w-12 h-1 bg-gray-600 rounded-full self-center mb-6" />
            
            <Text className="text-white text-xl font-semibold mb-4">
              Start Your Stream
            </Text>
            
            {/* Stream Title Input */}
            <Text className="text-white text-sm font-medium mb-2">
              Stream Title
            </Text>
            <View className="bg-[#2A2A2A] rounded-xl p-4 mb-4">
              <TextInput
                placeholder={`${currentUser?.username || 'User'}'s Live Stream`}
                placeholderTextColor="#666"
                value={streamTitle}
                onChangeText={setStreamTitle}
                className="text-white text-base"
                autoCorrect={false}
                maxLength={100}
              />
            </View>
            
            {/* Username Input */}
            <Text className="text-white text-sm font-medium mb-2">
              Invite Friends (Optional)
            </Text>
            <View className="bg-[#2A2A2A] rounded-xl p-4 mb-4">
              <TextInput
                placeholder="Enter @username"
                placeholderTextColor="#666"
                value={usernameToInvite}
                onChangeText={setUsernameToInvite}
                className="text-white text-base"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setInviteModalVisible(false)}
                className="flex-1 bg-[#2A2A2A] rounded-xl py-4 items-center"
              >
                <Text className="text-white font-semibold">Cancel</Text>
              </TouchableOpacity>
              
              {usernameToInvite.trim() ? (
                <TouchableOpacity
                  onPress={handleInviteUser}
                  disabled={inviteLoading}
                  className="flex-1 rounded-xl py-4 items-center"
                >
                  <LinearGradient
                    colors={inviteLoading ? ['#666', '#666'] : ['#8B5CF6', '#EC4899']}
                    className="w-full py-4 rounded-xl items-center"
                  >
                    <Text className="text-white font-semibold">
                      {inviteLoading ? 'Sending...' : 'Send Invite'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    setInviteModalVisible(false);
                    initializeStream();
                  }}
                  className="flex-1 rounded-xl py-4 items-center"
                >
                  <LinearGradient
                    colors={['#8B5CF6', '#EC4899']}
                    className="w-full py-4 rounded-xl items-center"
                  >
                    <Text className="text-white font-semibold">Start Stream</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>
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
                              source={{ uri: `${apiBaseUrl}${item.user.profile_picture_url || item.user.avatar_url}` }}
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

      {/* Share Stream Modal */}
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
          mode: 'single',
          channel: params.channel as string || 'general',
          is_live: isLive,
        }}
      />
    </KeyboardAvoidingView>
  );
} 