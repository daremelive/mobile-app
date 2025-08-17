import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
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
import IsolatedMessageInput from '../../components/IsolatedMessageInput';
import { walletApi } from '../../src/api/walletApi';
import ipDetector from '../../src/utils/ipDetector';
import Constants from 'expo-constants';
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

// Utility function to get the correct API base URL (environment-aware)
const getAPIBaseURL = async (): Promise<string> => {
  try {
    // Prefer dynamic detector if available
    const detected = await ipDetector.getAPIBaseURL?.();
    if (detected) return detected;
  } catch (e) {
    console.log('🌐 ipDetector failed, falling back to env', e);
  }
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL || (Constants.expoConfig as any)?.extra?.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl;
  // Final fallback (local dev)
  return 'http://192.168.1.102:8000/api';
};

// NOTE: Reconstructed component wrapper after refactor merge issues.
// Original file had extensive logic; we re-wrap existing logic inside component now.
const MultiStreamScreen: React.FC = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const params = useLocalSearchParams();
  const currentUser = useSelector(selectCurrentUser);
  const accessToken = useSelector(selectAccessToken);

  // Core stream identifiers from route params
  const streamId = (params?.id as string) || '';
  const titleFromParams = (params?.title as string) || '';
  const maxSeats = 6; // default for multi-stream

  // API base URL state
  const [apiBaseUrl, setApiBaseUrl] = useState<string>('');

  // Live state flags
  const [isLive, setIsLive] = useState<boolean>(true); // default true while active
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [allowCommentFocus, setAllowCommentFocus] = useState(false);

  // Comment input ref
  const commentInputRef = useRef<TextInput>(null);

  // Placeholder streamDetails until populated by query
  const { data: streamDetails, refetch: refetchStreamDetails } = useGetStreamQuery(streamId, { skip: !streamId });
  const { data: messages = [], refetch: refetchMessages, isLoading: messagesLoading } = useGetStreamMessagesQuery(
    streamId || '', 
    { 
      skip: !streamId,
      // Reduced polling to prevent screen blinking while maintaining real-time feel
      pollingInterval: 0, // DISABLED completely - manual refresh only to prevent interference
      refetchOnMountOrArgChange: false, // DISABLED - prevent any automatic refetching
      refetchOnFocus: false, // DISABLED - was causing screen refresh on keypress
      refetchOnReconnect: false, // DISABLED - prevents unnecessary refreshes
    }
  );

  // Debug messages array
  useEffect(() => {
    if (messages.length > 0) {
      console.log('📨 Messages updated for overlay display:', {
        totalMessages: messages.length,
        lastSixMessages: messages.slice(-6).length,
        messageTypes: messages.slice(-6).map(m => ({ id: m.id, type: m.message_type, message: m.message?.substring(0, 20) })),
        allMessageTypes: messages.map(m => m.message_type)
      });
    }
  }, [messages]);
  
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

  // Invitation / add participant modal state (declared early so effects can depend on them)
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
  
  // Initialize API base URL with environment-aware detection
  useEffect(() => {
    getAPIBaseURL().then(url => {
      setApiBaseUrl(url);
      console.log('🔗 API Base URL initialized for multi-stream:', url);
      
      // Test URL construction with sample profile picture path
      const testPath = '/media/profile_pictures/user_123.jpg';
      const testUrl = url.replace('/api/', '').replace('/api', '') + testPath;
      console.log('🧪 Test profile picture URL would be:', testUrl);
    });
  }, []);

  // Helper function to construct proper media URLs with fallback
  const constructMediaUrl = useCallback((mediaPath: string | null | undefined): string | null => {
    console.log('🔧 constructMediaUrl called with:', { mediaPath, apiBaseUrl });
    
    if (!mediaPath) {
      console.log('🔧 No mediaPath provided');
      return null;
    }
    
    try {
      // If already absolute URL, return as is
      if (mediaPath.startsWith('http')) {
        console.log('🔧 Already absolute URL:', mediaPath);
        return mediaPath;
      }
      
      // Use apiBaseUrl if available, otherwise fall back to getAPIBaseURL
      let baseUrl = apiBaseUrl;
      if (!baseUrl) {
        // Fallback to environment variable if apiBaseUrl not yet loaded
        const envApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL;
        baseUrl = envApiBaseUrl ? (envApiBaseUrl.endsWith('/') ? envApiBaseUrl.slice(0, -1) : envApiBaseUrl) : 'http://192.168.1.102:8000';
        console.log('🔧 Using fallback baseUrl:', baseUrl);
      }
      
      // Remove /api/ suffix and add proper path
      const cleanBaseUrl = baseUrl.replace('/api/', '').replace('/api', '');
      
      // Handle different possible path formats
      let cleanPath = mediaPath;
      if (!cleanPath.startsWith('/')) {
        cleanPath = `/${cleanPath}`;
      }
      
      // If path doesn't start with /media/, try adding it
      if (!cleanPath.startsWith('/media/') && !cleanPath.startsWith('/static/')) {
        // Try to detect if this looks like a media file
        if (cleanPath.includes('profile_picture') || cleanPath.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          cleanPath = `/media${cleanPath}`;
        }
      }
      
      const fullUrl = cleanBaseUrl + cleanPath;
      
      console.log('🖼️ Constructed media URL:', { mediaPath, baseUrl, cleanBaseUrl, cleanPath, fullUrl });
      return fullUrl;
    } catch (error) {
      console.error('❌ Error constructing media URL:', error, { mediaPath, apiBaseUrl });
      return null;
    }
  }, [apiBaseUrl]);

  // Reusable ProfileAvatar component with robust URL handling
  const ProfileAvatar = memo(({ user, size = 32, className = "" }: { 
    user: any; 
    size?: number; 
    className?: string; 
  }) => {
    const avatarUrl = constructMediaUrl(user?.profile_picture_url || user?.profile_picture);
    const initials = (() => {
      const initialSource = (user?.first_name && user?.last_name)
        ? `${user.first_name} ${user.last_name}`
        : (user?.username || 'U');
      return initialSource.charAt(0).toUpperCase();
    })();
    
    // Enhanced debugging for profile picture issues
    console.log('🐛 ProfileAvatar Debug:', {
      username: user?.username,
      profile_picture_url: user?.profile_picture_url,
      profile_picture: user?.profile_picture,
      avatarUrl,
      apiBaseUrl,
      hasImage: !!avatarUrl
    });
    
    return (
      <View 
        className={`rounded-full bg-gray-400 overflow-hidden ${className}`}
        style={{ width: size, height: size }}
      >
        {avatarUrl ? (
          <Image 
            source={{ uri: avatarUrl }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            onError={(e) => {
              console.log('❌ Profile avatar load error for user:', user?.username, 'URL:', avatarUrl, 'Error:', e.nativeEvent.error);
              
              // Try alternative URL formats if the primary one fails
              const originalPath = user?.profile_picture_url || user?.profile_picture;
              if (originalPath && !originalPath.startsWith('http')) {
                // Try with /media/ prefix if not already present
                const altUrl1 = apiBaseUrl?.replace('/api/', '') + '/media/' + originalPath.replace(/^\/+/, '');
                console.log('🔄 Trying alternative URL 1:', altUrl1);
                
                // Try direct media access
                const altUrl2 = apiBaseUrl?.replace('/api/', '') + '/' + originalPath.replace(/^\/+/, '');
                console.log('🔄 Trying alternative URL 2:', altUrl2);
              }
            }}
            onLoad={() => {
              console.log('✅ Profile avatar loaded successfully for user:', user?.username, 'URL:', avatarUrl);
            }}
          />
        ) : (
          <View style={{ 
            width: '100%', 
            height: '100%', 
            backgroundColor: '#8B5CF6', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Text style={{ 
              color: 'white', 
              fontWeight: 'bold', 
              fontSize: size > 24 ? 14 : 10 
            }}>
              {initials}
            </Text>
          </View>
        )}
      </View>
    );
  });

  // Update participant count when stream details change
  useEffect(() => {
    if (streamDetails?.participants) {
      const activeCount = streamDetails.participants.filter(p => 
        p.is_active && (p.participant_type === 'host' || p.participant_type === 'guest')
      ).length;
      setCurrentParticipantCount(activeCount);
      
      // Debug logs commented out to prevent blinking
      // console.log('📊 Stream participants updated:', {
      //   streamId,
      //   totalParticipants: streamDetails.participants.length,
      //   activeParticipants: activeCount,
      //   allParticipants: streamDetails.participants.map(p => ({
      //     id: p.id,
      //     userId: p.user?.id,
      //     username: p.user?.username,
      //     type: p.participant_type,
      //     isActive: p.is_active,
      //     // status: p.status
      //   }))
      // });
      
      // console.log('👥 GUESTS TAB - Active Guests:', activeGuests.map(g => ({
      //   id: g.id,
      //   username: g.user?.username,
      //   type: g.participant_type,
      //   isActive: g.is_active
      // })));
      
      // console.log('👀 AUDIENCE TAB - Active Viewers:', activeViewers.map(v => ({
      //   id: v.id,
      //   username: v.user?.username,
      //   type: v.participant_type,
      //   isActive: v.is_active
      // })));
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
  
  
  const [streamTitle, setStreamTitle] = useState(titleFromParams || ''); // Use title from params if available
  
  // Helper function to get dynamic media URL (for profile pictures, gift icons, etc.)
  const getDynamicMediaUrl = async (mediaUrl: string | null) => {
    if (!mediaUrl) return null;
    
    try {
      const baseURL = await getAPIBaseURL();
      
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
      console.error('Error getting dynamic API URL for media:', error);
      // Fallback to production domain if detection fails
      if (mediaUrl.startsWith('http')) {
        return mediaUrl;
      } else if (mediaUrl.startsWith('/')) {
        return `https://daremelive.pythonanywhere.com${mediaUrl}`;
      } else {
        return `https://daremelive.pythonanywhere.com/${mediaUrl}`;
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
      // console.log('🚀 Auto-starting stream from title screen with title:', titleFromParams);
      initializeStream();
    } else {
      // Show setup modal for manual configuration
      setInviteModalVisible(true);
    }
  }, [fromTitleScreen, titleFromParams]);

  // Debug current user data - commented out to prevent blinking
  // useEffect(() => {
  //   console.log('🔍 Current User Data:', JSON.stringify(currentUser, null, 2));
  //   console.log('🖼️ Profile Picture URL:', currentUser?.profile_picture_url);
  //   console.log('🖼️ Profile Picture:', currentUser?.profile_picture);
  // }, [currentUser]);

  // IP detection runs silently without logging

  // Keyboard event listeners - improved for better responsiveness
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        const keyboardHeight = event.endCoordinates.height;
        console.log('🎹 Keyboard Show - Original Height:', keyboardHeight);
        setKeyboardHeight(keyboardHeight);
        setIsKeyboardVisible(true);
        
        // Additional safety margin for different devices - increased for better clearance
        const safetyMargin = Platform.OS === 'ios' ? 40 : 60;
        const finalHeight = keyboardHeight + safetyMargin;
        console.log('🎹 Keyboard Show - Final Height with margin:', finalHeight);
        setKeyboardHeight(finalHeight);
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
      // console.log('Opening gift modal after purchase completion');
      setGiftModalVisible(true);
      setShouldOpenGiftModalAfterPurchase(false);
    }
  }, [shouldOpenGiftModalAfterPurchase, coinPurchaseModalVisible]);

  // Auto-scroll chat to bottom when new messages arrive (like Instagram Live)
  // Auto-scroll chat when new messages arrive - optimized to reduce re-renders
  const messagesLength = messages.length;
  useEffect(() => {
    if (messagesLength > 0 && chatFlatListRef.current) {
      // Only scroll if messages actually increased (new message added)
      setTimeout(() => {
        chatFlatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messagesLength]); // Use length instead of full messages array

  // Watch for new gift messages and trigger animations for ALL participants - OPTIMIZED
  const lastMessageId = useMemo(() => {
    return messages.length > 0 ? messages[messages.length - 1].id : 0;
  }, [messages.length]); // Only update when messages count changes, not content
  
  useEffect(() => {
    if (messages.length > 0 && lastMessageId > 0) {
      const latestMessage = messages[messages.length - 1] as any; // Type casting for extended message properties
      
      // Trigger animation for ALL gift messages (including host's own gifts)
      if (latestMessage.message_type === 'gift') {
        const animationId = Date.now().toString() + Math.random().toString();
        
        // Construct proper profile picture URL
        const profilePictureUrl = (() => {
          const rawUrl = latestMessage.user.profile_picture_url || latestMessage.user.profile_picture;
          if (!rawUrl) return null;
          
          // If already absolute URL, return as is
          if (rawUrl.startsWith('http')) {
            return rawUrl;
          }
          
          // Construct absolute URL
          const baseUrl = apiBaseUrl.replace('/api/', '');
          const cleanPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
          return baseUrl + cleanPath;
        })();
        
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
            full_name: (latestMessage.user.first_name && latestMessage.user.last_name)
              ? `${latestMessage.user.first_name} ${latestMessage.user.last_name}`
              : (latestMessage.user.username || 'User'),
            profile_picture_url: profilePictureUrl,
          },
          animationKey: animationId,
        };
        
        setActiveGiftAnimations(prev => [...prev, newGiftAnimation]);
      }
    }
  }, [lastMessageId, currentUser?.id, apiBaseUrl]); // Only trigger when a new message ID appears

  const initializeStream = async () => {
    // Dismiss keyboard to prevent auto-focus issues during stream initialization
    Keyboard.dismiss();
    
    // Check if user is loaded
    if (!currentUser?.id) {
      // console.log('User not loaded yet, waiting...');
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
      
      // console.log('🔄 Creating and joining call...');
      
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
            // console.log('🔄 Enabling camera and microphone...');
            await Promise.all([
              call.camera.enable(),
              call.microphone.enable()
            ]);
            // console.log('✅ Camera and microphone enabled');
          } catch (error) {
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
            // console.log(' Stream started in database');
          } catch (startError) {
            // Don't fail the stream, UI is already shown
          }
        })()
      ]);
      
      // Set call after everything is ready
      setCall(call);
      
      // console.log('✅ Stream setup complete - host automatically joined as participant');

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
    
    try {
      // End the stream in the database
      if (streamId) {
        try {
          const result = await streamAction({
            streamId: streamId,
            action: { action: 'end' }
          }).unwrap();
          
          // Aggressively invalidate ALL stream-related cache to ensure ended streams don't appear instantly
          dispatch(streamsApi.util.invalidateTags(['Stream', 'StreamMessage']));
          
          // Also reset the entire API state and force immediate refetch
          dispatch(streamsApi.util.resetApiState());
          
          // Add a small delay then invalidate again to ensure cache is completely cleared
          setTimeout(() => {
            dispatch(streamsApi.util.invalidateTags(['Stream']));
          }, 500);
          
        } catch (endError) {
          
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
      }
      
      // Leave the GetStream call
      if (call) {
        await call.leave();
      }
  
      router.replace('/(tabs)/home'); // Navigate to homepage instead of going back
    } catch (error) {
      
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

  // REMOVED: Debounced input logic moved to isolated component

  // OPTIMIZED: Simple message handler for isolated component
  const handleSendMessageFromInput = useCallback(async (message: string) => {
    if (!streamId || sendingMessage) return;

    setSendingMessage(true);
    try {
      await sendMessage({
        streamId,
        data: { message }
      }).unwrap();
      
  // Removed refetchMessages; rely on optimistic + WS
    } catch (error: any) {
      // console.error('Send message error:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  }, [streamId, sendingMessage, sendMessage, refetchMessages]);

  // REMOVED: Old input state management and button optimization

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
  // Removed refetchMessages; rely on optimistic + WS
      
      // Auto-scroll to show the new message (like Instagram Live)
      setTimeout(() => {
        chatFlatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to send comment');
    }
  };

  const handleGiftPress = () => {
    // console.log(' Gift modal opening...', { giftsCount: safeGifts.length, walletBalance: walletSummary?.coins || 0 });
    setGiftModalVisible(true);
    // Refresh gifts when modal opens to get latest gifts from admin
    refetchGifts();
  };

  const handleSendGift = async (gift: any) => {
    // console.log(' Gift sending initiated:', { giftId: gift.id, giftName: gift.name, giftCost: gift.cost, streamId });
    
    if (!streamId) {
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
    
    // console.log('💰 Balance check:', { currentBalance, giftCost, hasEnoughBalance: currentBalance >= giftCost });
    
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
      
      // Construct proper profile picture URL for host
      const hostProfilePictureUrl = (() => {
        const rawUrl = currentUser?.profile_picture_url || currentUser?.profile_picture;
        if (!rawUrl) return null;
        
        // If already absolute URL, return as is
        if (rawUrl.startsWith('http')) {
          return rawUrl;
        }
        
        // Construct absolute URL
        const baseUrl = apiBaseUrl.replace('/api/', '');
        const cleanPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
        return baseUrl + cleanPath;
      })();
      
      const newGiftAnimation = {
        id: animationId,
        gift: gift,
        sender: {
          username: currentUser?.username || 'User',
          full_name: currentUser?.first_name && currentUser?.last_name 
            ? `${currentUser.first_name} ${currentUser.last_name}`
            : currentUser?.username || 'User',
          profile_picture_url: hostProfilePictureUrl
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
      const walletRefetchResult = await refetchWallet();
      
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
      const baseURL = await getAPIBaseURL();
      const searchURL = `${baseURL}/api/users/search/?search=${encodeURIComponent(searchTerm)}`;
      
      const response = await fetch(searchURL, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      
      if (response.ok) {
        // Get existing participants from THIS specific stream only
        const currentStreamParticipantIds = streamDetails?.participants?.map(p => p.user?.id).filter(Boolean) || [];
        
        // console.log('📊 Stream participants analysis:', {
        //   streamId,
        //   streamDetails: !!streamDetails,
        //   rawParticipants: streamDetails?.participants || [],
        //   participantIds: currentStreamParticipantIds,
        //   searchTermLower: searchTerm.toLowerCase(),
        //   allResultsFromAPI: data.results?.map((u: any) => ({ 
        //     id: u.id, 
        //     username: u.username, 
        //     isCurrentUser: u.id === currentUser?.id,
        //     isParticipant: currentStreamParticipantIds.includes(u.id)
        //   })) || []
        // });
        
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
            return canBeInvited;
          } else {
            // In Audience tab: Only show current viewers (no invitation/promotion actions)
            const isViewer = existingParticipant && existingParticipant.participant_type === 'viewer';

            return !isCurrentUser && isViewer;
          }
        }) || [];
        
        setSearchResults(filteredUsers.slice(0, 10)); // Limit to 10 results
      } else {
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
      const baseURL = await getAPIBaseURL();
      
      console.log('🚀 Sending invitation to:', {
        userId: selectedUser.id,
        username: selectedUser.username,
        streamId,
        hasToken: !!accessToken,
        baseURL
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
                const baseURL = await getAPIBaseURL();
                const removeURL = `${baseURL}/api/streams/${streamId}/remove-participant/`;
                
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
                const data = await response.json();
                
                if (response.ok) {
                  // Refresh stream details to update participants list
                  refetchStreamDetails();
                  
                  Alert.alert(
                    'Participant Removed',
                    'The participant has been removed from your stream.',
                    [{ text: 'OK', style: 'default' }]
                  );
                } else {                
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
      const baseURL = await getAPIBaseURL();
      const inviteURL = `${baseURL}/api/streams/${streamId}/invite-users/`;
      
      // Check if user is already a viewer in this stream
      const existingViewer = streamDetails?.participants?.find(p => 
        p.user?.id === user.id && p.is_active && p.participant_type === 'viewer'
      );
      
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

  const CustomStreamContent = React.memo(() => {
    const { useParticipants } = useCallStateHooks();
    const participants = useParticipants();
    
    // CRITICAL: Memoize participant calculations to reduce re-renders
    const participantData = useMemo(() => {
      const localParticipant = participants.find(p => p.isLocalParticipant);
      const remoteParticipants = participants.filter(p => !p.isLocalParticipant);
      const allActiveParticipants = participants.filter(p => p.videoStream);
      
      return {
        localParticipant,
        remoteParticipants,
        allActiveParticipants,
        participantCount: participants.length
      };
    }, [participants.length]); // OPTIMIZED: Only re-calculate when count changes

    const { localParticipant, remoteParticipants, allActiveParticipants } = participantData;

    // COMPLETELY DISABLE all logging to prevent Fast Refresh triggers
    // console.log('🎥 Stream participants (HOST VIEW):', {
    //   total: participants.length,
    //   local: localParticipant ? 1 : 0,
    //   remote: remoteParticipants.length,
    //   activeVideo: allActiveParticipants.length,
    //   participantDetails: participants.map(p => ({
    //     id: p.userId,
    //     name: p.name,
    //     isLocal: p.isLocalParticipant,
    //     hasVideo: !!p.videoStream,
    //     hasAudio: !!p.audioStream,
    //   })),
    //   remoteDetails: remoteParticipants.map(p => ({
    //     id: p.userId,
    //     name: p.name,
    //     hasVideo: !!p.videoStream,
    //     hasAudio: !!p.audioStream,
    //   }))
    // });

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
  });

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
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <KeyboardAvoidingView 
        className="flex-1" 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20}
        style={{ flex: 1 }}
        enabled={true}
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
                mediaUrl={(currentUser?.profile_picture_url || currentUser?.profile_picture) ?? null}
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
          
          {/* Legacy overlay FlatList removed (replaced by unified renderer further below) */}
        </View>
      )}

      {/* Bottom Comment Bar - For hosts: no gift icon, keep add team for inviting participants */}
      {isLive && (
        <Animated.View 
          className="absolute left-4 right-4 flex-row items-center gap-3" 
          style={{ 
            zIndex: 10,
            bottom: isKeyboardVisible ? keyboardHeight + 80 : 48, // Increased spacing significantly when keyboard is visible
            backgroundColor: isKeyboardVisible ? 'rgba(0,0,0,0.9)' : 'transparent', // Darker background when keyboard is visible
            paddingVertical: isKeyboardVisible ? 16 : 0, // More padding when keyboard is visible
            paddingHorizontal: isKeyboardVisible ? 8 : 0, // Add horizontal padding when keyboard is visible
            borderRadius: isKeyboardVisible ? 16 : 0, // Add border radius when keyboard is visible
            marginBottom: isKeyboardVisible ? 10 : 0, // Add bottom margin when keyboard is visible
          }}
        >
          {/* Comment Input */}
          <View className={`flex-1 rounded-full px-4 py-4 ${
            isKeyboardVisible ? 'bg-black/80' : 'bg-black/40'
          }`}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                if (!allowCommentFocus) {
                  setAllowCommentFocus(true);
                  // Let state update then focus
                  requestAnimationFrame(() => {
                    commentInputRef.current?.focus();
                  });
                } else {
                  commentInputRef.current?.focus();
                }
              }}
              className="flex-row items-center"
            >
              <View className="flex-1">
                <TextInput
                  ref={commentInputRef}
                  placeholder={allowCommentFocus ? 'Type comment here...' : 'Tap to comment'}
                  placeholderTextColor="#999"
                  value={comment}
                  onChangeText={setComment}
                  className="text-white text-base"
                  multiline={false}
                  maxLength={200}
                  returnKeyType="send"
                  onSubmitEditing={handleSendComment}
                  blurOnSubmit={false}
                  autoFocus={false}
                  autoCorrect={false}
                  selectTextOnFocus={false}
                  style={{ 
                    minHeight: 20,
                    textAlignVertical: 'center',
                  }}
                  editable={allowCommentFocus}
                  // Prevent iOS from auto showing keyboard when editable toggles
                  showSoftInputOnFocus={allowCommentFocus}
                />
              </View>
            </TouchableOpacity>
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
                  autoFocus={false}
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
                      profilePictureUrl={participant.user?.profile_picture_url ?? null}
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
                              profilePictureUrl={viewer.user?.profile_picture_url ?? null}
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
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          enabled={true}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View className="bg-[#1A1A1A] rounded-t-3xl" style={{ maxHeight: '80%', minHeight: '50%' }}>
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
            <View className="flex-1 px-4 pb-2">
              <FlatList
                data={messages}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View className="py-2">
                    {item.message_type === 'join' ? (
                      <View className="items-center py-1">
                        <View className="bg-green-500/20 rounded-full px-3 py-1 border border-green-500/30">
                          <Text className="text-green-400 text-xs font-medium">
                            {`${item.user.first_name || ''} ${item.user.last_name || ''}`.trim() || item.user.username || 'User'} joined the stream
                          </Text>
                        </View>
                      </View>
                    ) : item.message_type === 'leave' ? (
                      <View className="items-center py-1">
                        <View className="bg-red-500/20 rounded-full px-3 py-1 border border-red-500/30">
                          <Text className="text-red-400 text-xs font-medium">
                            {`${item.user.first_name || ''} ${item.user.last_name || ''}`.trim() || item.user.username || 'User'} left the stream
                          </Text>
                        </View>
                      </View>
                    ) : item.message_type === 'gift' ? (
                      <View className="items-center py-1">
                        <View className="bg-purple-500/20 rounded-lg px-3 py-2 border border-purple-500/30">
                          <Text className="text-purple-300 text-sm font-medium text-center">
                            <Text className="font-bold text-purple-200">{`${item.user.first_name || ''} ${item.user.last_name || ''}`.trim() || item.user.username || 'User'}</Text> gifted{' '}
                            <Text className="text-yellow-400">{item.gift_icon || '🎁'} {item.gift_name || 'a gift'}</Text>
                            {/* gift_quantity removed */}
                            {/* gift_receiver removed */}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View className="flex-row items-start gap-3 py-2">
                        {/* User Avatar */}
                        <View className="w-10 h-10 rounded-full bg-gray-400 overflow-hidden flex-shrink-0">
                          {(item.user.profile_picture_url) ? (
                            <Image 
                              source={{ uri: (() => {
                                const profileUrl = item.user.profile_picture_url;
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
                                {(`${item.user.first_name || ''} ${item.user.last_name || ''}`.trim() || item.user.username || 'U').charAt(0).toUpperCase()}
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
                            {`${item.user.first_name || ''} ${item.user.last_name || ''}`.trim() || item.user.username || 'User'}
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
                contentContainerStyle={{ paddingBottom: 10 }}
                keyboardShouldPersistTaps="handled"
              />
            </View>
            
            {/* COMPLETELY ISOLATED Message Input - ZERO parent dependency */}
            <IsolatedMessageInput 
              onSendMessage={handleSendMessageFromInput}
              sending={sendingMessage}
            />
            </View>
          </TouchableWithoutFeedback>
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
                  autoFocus={false}
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
    </TouchableWithoutFeedback>
  );
} 
export default MultiStreamScreen;