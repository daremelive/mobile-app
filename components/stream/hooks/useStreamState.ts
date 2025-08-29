import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, Platform, Keyboard, AppState } from 'react-native';
import { Camera } from 'expo-camera';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser } from '../../../src/store/authSlice';
import { 
  useGetStreamQuery, 
  useJoinStreamMutation, 
  useLeaveStreamMutation, 
  useGetStreamMessagesQuery, 
  useSendMessageMutation,
  useStreamActionMutation,
  streamsApi
} from '../../../src/store/streamsApi';
import { StreamVideoClient } from '@stream-io/video-react-native-sdk';
import { createStreamClient, createStreamUser } from '../../../src/utils/streamClient';
import ipDetector from '../../../src/utils/ipDetector';

export interface UseStreamStateProps {
  streamId: string;
  userRole: 'viewer' | 'host' | 'participant';
}

export interface StreamState {
  // Connection state
  streamClient: StreamVideoClient | null;
  call: any;
  hasJoined: boolean;
  isConnecting: boolean;
  isOperationInProgress: boolean;
  baseURL: string;
  
  // UI state
  keyboardHeight: number;
  isKeyboardVisible: boolean;
  
  // Error state
  videoLoadError: string | null;
}

export interface StreamActions {
  initializeStream: () => Promise<void>;
  handleLeaveStream: () => Promise<void>;
  handleSendMessage: (message: string) => Promise<void>;
  setVideoLoadError: (error: string | null) => void;
  refetchMessages: () => void;
  resetConnectionState: () => void;
  refetchStreamDetails: () => void;
}

export const useStreamState = ({ streamId, userRole }: UseStreamStateProps) => {
  const currentUser = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  
  // App state for smart polling
  const [appState, setAppState] = useState(AppState.currentState);
  
  // Connection state
  const [streamClient, setStreamClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<any>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isOperationInProgress, setIsOperationInProgress] = useState(false);
  const [baseURL, setBaseURL] = useState<string>('');
  
  // UI state
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  
  // Error state
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);
  
  // API hooks with smart polling based on app state
  const { data: streamDetails, isLoading: streamLoading, error: streamError, refetch: refetchStreamDetails } = useGetStreamQuery(streamId, {
    skip: !streamId || streamId.length === 0, // Skip query if streamId is empty
    pollingInterval: appState === 'active' ? 5000 : 30000, // Active: 5s, Background: 30s
  });
  const [joinStream] = useJoinStreamMutation();
  const [leaveStream] = useLeaveStreamMutation();
  const [sendMessage] = useSendMessageMutation();
  const [streamAction] = useStreamActionMutation();
  const { data: messages = [], refetch: refetchMessages } = useGetStreamMessagesQuery(
    streamId, 
    { 
      // pollingInterval: 3000, // Disabled to prevent screen blinking
      refetchOnMountOrArgChange: true,
      skip: !streamId || streamId.length === 0, // Skip query if streamId is empty
    }
  );
  
  // Initialize base URL
  useEffect(() => {
    const initializeBaseURL = async () => {
      try {
        const detection = await ipDetector.detectIP();
        
        // Force production URL in production builds
        if (!__DEV__ || detection.ip === 'daremelive.pythonanywhere.com') {
          setBaseURL('https://daremelive.pythonanywhere.com');
          console.log('🌐 Using production URL for streaming');
        } else {
          const url = `http://${detection.ip}:8000`;
          setBaseURL(url);
          console.log('🔧 Using development URL:', url);
        }
      } catch (error) {
        console.error('❌ Failed to detect IP, using production fallback:', error);
        setBaseURL('https://daremelive.pythonanywhere.com');
      }
    };
    
    initializeBaseURL();
  }, []);
  
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

  // App state listener for smart polling
  useEffect(() => {
    const handleAppStateChange = (nextAppState: any) => {
      console.log('📱 App state changed from', appState, 'to', nextAppState);
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState]);
  
  // Reset connection state when call is disconnected
  const resetConnectionState = useCallback(() => {
    setCall(null);
    setStreamClient(null);
    setHasJoined(false);
    setIsConnecting(false);
    setVideoLoadError(null);
    setIsOperationInProgress(false);
  }, []);

  // Stream initialization - simplified version with better timeout handling
  const initializeStream = useCallback(async () => {
    // Allow host to initialize even if streamDetails hasn't loaded yet; others wait
    if (!currentUser?.id) return;
    if (userRole !== 'host' && !streamDetails) return; // viewers/participants still need details
    if (isOperationInProgress) return;

    // If hasJoined is true but no call exists, reset state first
    if (hasJoined && !call) {
      console.log('Detected stale hasJoined state, resetting...');
      resetConnectionState();
      return;
    }

    if (hasJoined && call) {
      // Already properly connected
      return;
    }

    setIsOperationInProgress(true);
    setIsConnecting(true);

    try {
      // Set a timeout for the entire initialization - extended for production
      const connectionTimeout = __DEV__ ? 20000 : 45000; // 45 seconds for production
      const initTimeoutRef = setTimeout(() => {
        console.log('⚠️ Stream initialization timeout - forcing reset');
        setIsConnecting(false);
        setIsOperationInProgress(false);
        setVideoLoadError('Connection timeout. Please check your internet and try again.');
      }, connectionTimeout);

      const client = await createStreamClient(currentUser);
      setStreamClient(client);

      const callId = `stream_${streamId}`;
      // Use the same call type as existing multi implementation ('default') for consistency
      const newCall = client.call('default', callId);
      
      // Add call event listeners to detect disconnections
      newCall.on('call.session_participant_left', (event) => {
        console.log('Participant left event detected:', event);
        
        // Only reset connection state if the current user (host) is the one who left
        // Don't reset when other participants/viewers leave
        if (event.participant?.user?.id === String(currentUser?.id)) {
          console.log('Host left the call, resetting connection state');
          resetConnectionState();
        } else {
          console.log('Another participant left, maintaining host connection');
          // Immediately refetch stream details to update viewer count
          refetchStreamDetails();
        }
      });
      
      newCall.on('call.session_participant_joined', (event) => {
        console.log('Participant joined event detected:', event);
        // Immediately refetch stream details to update viewer count
        refetchStreamDetails();
      });
      
      newCall.on('call.ended', () => {
        console.log('Call ended event detected');
        resetConnectionState();
      });

      if (userRole === 'host') {
        await newCall.join({ create: true });
        // Request and enable media for host with timeout
        try {
          const mediaTimeout = setTimeout(() => {
            console.log('Media enable timeout - continuing with stream');
          }, 8000); // 8 second media timeout
          
          const camPerm = await Camera.requestCameraPermissionsAsync();
          const micPerm = await Camera.requestMicrophonePermissionsAsync();
          
          if (camPerm.status === 'granted') {
            await Promise.race([
              newCall.camera.enable(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Camera timeout')), 5000))
            ]).catch((err) => {
              console.log('Camera enable failed or timed out:', err.message);
            });
          }
          if (micPerm.status === 'granted') {
            await Promise.race([
              newCall.microphone.enable(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Mic timeout')), 5000))
            ]).catch((err) => {
              console.log('Microphone enable failed or timed out:', err.message);
            });
          }
          
          clearTimeout(mediaTimeout);
        } catch (permErr) {
          console.log('Media permission/enable error (non-fatal):', permErr);
        }
      } else {
        await newCall.join();
      }
      
      setCall(newCall);
      setHasJoined(true);
      clearTimeout(initTimeoutRef);

      // For hosts: try to start the stream but don't block on it
      if (userRole === 'host') {
        // Don't await this - let it happen in background with extended timeout for production
        const streamStartPromise = streamAction({
          streamId,
          action: { action: 'start' }
        }).unwrap();
        
        // Add timeout specifically for stream start action in production
        const streamStartTimeout = __DEV__ ? 10000 : 25000; // 25s for production
        Promise.race([
          streamStartPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Stream start timeout')), streamStartTimeout)
          )
        ]).then(() => {
          console.log('✅ Stream start action completed successfully');
          dispatch(streamsApi.util.invalidateTags(['Stream']));
        }).catch((startError: any) => {
          console.log('❌ Stream start action failed:', startError);
          // Show user-friendly error but don't fail the entire initialization
          if (startError.message?.includes('timeout')) {
            setVideoLoadError('Stream is taking longer than expected to start. You may continue, but viewers might need to refresh.');
          }
        });
      }

      if (userRole !== 'host') {
        // Don't await this either - non-blocking join
        joinStream({
          streamId,
          data: { participant_type: userRole === 'participant' ? 'guest' : 'viewer' }
        }).unwrap().catch((e) => {
          console.log('Join stream failed (non-fatal):', e);
        });
      }
    } catch (error: any) {
      console.error('❌ Stream initialization error:', error);
      
      clearTimeout(initTimeoutRef); // Clear timeout on error too
      setIsConnecting(false);
      setIsOperationInProgress(false);
      
      // Provide production-specific error messages
      if (error.message?.includes('timeout')) {
        setVideoLoadError(__DEV__ 
          ? 'Connection timeout. Please check your development server is running.'
          : 'Connection timeout. Please check your internet connection and try again.'
        );
      } else if (error.message?.includes('credentials') || error.message?.includes('401')) {
        setVideoLoadError('Authentication failed. Please log out and log back in.');
      } else if (error.message?.includes('GetStream')) {
        setVideoLoadError('Video service temporarily unavailable. Please try again in a moment.');
      } else {
        setVideoLoadError(__DEV__
          ? `Development error: ${error.message}`
          : 'Unable to start stream. Please check your connection and try again.'
        );
      }
    } finally {
      setIsConnecting(false);
      setIsOperationInProgress(false);
    }
  }, [currentUser?.id, streamDetails?.id, isOperationInProgress, hasJoined, streamId, userRole]);
  
  // Leave stream
  const handleLeaveStream = useCallback(async () => {
    if (isOperationInProgress) {
      return;
    }

    // Debug log to track stream leave behavior
    console.log('[StreamState] 🎯 handleLeaveStream called');
    console.log('[StreamState] Call stack:', new Error().stack);
    console.log('[StreamState] Leaving stream:', {
      streamId,
      userRole,
      hasJoined,
      currentUserId: currentUser?.id,
      streamHostId: streamDetails?.host?.id,
      isActualHost: userRole === 'host' && streamDetails?.host?.id === currentUser?.id,
      streamDetailsRaw: streamDetails
    });

    setIsOperationInProgress(true);

    try {
      // For hosts: end the stream to remove it from popular channels
      // IMPORTANT: Only allow actual stream owners to end the stream
      // Multiple verification layers to prevent unauthorized stream ending
      const isUserActuallyHost = userRole === 'host' && 
                                hasJoined && 
                                streamDetails?.host?.id === currentUser?.id;
      
      // Additional safety check: verify user role is actually 'host' and not incorrectly assigned
      const isCurrentUserStreamOwner = currentUser?.id && 
                                      streamDetails?.host?.id && 
                                      currentUser.id === streamDetails.host.id;
      
      // Final verification: both conditions must be true to end stream
      const shouldEndStream = isUserActuallyHost && isCurrentUserStreamOwner;
      
      console.log('[StreamState] Host verification check:', {
        userRole,
        hasJoined,
        currentUserId: currentUser?.id,
        streamHostId: streamDetails?.host?.id,
        isUserActuallyHost,
        isCurrentUserStreamOwner,
        shouldEndStream
      });
      
      if (shouldEndStream) {
        console.log('[StreamState] ✅ Verified user is actual stream owner - ending stream');
        try {
          await streamAction({
            streamId,
            action: { action: 'end' }
          }).unwrap();
          
          // Invalidate streams cache to update popular channels immediately
          dispatch(streamsApi.util.invalidateTags(['Stream']));
        } catch (endError: any) {
          console.error('[StreamState] ❌ Failed to end stream:', endError);
          // Continue with cleanup even if end action fails
        }
      } else {
        console.log('[StreamState] ⚠️ User not authorized to end stream - skipping stream end');
      }

      // Leave backend stream
      if (hasJoined) {
        await leaveStream(streamId).unwrap();
      }

      // Leave GetStream call
      if (call) {
        await call.leave();
      }

      // Disconnect client
      if (streamClient) {
        await streamClient.disconnectUser();
      }

      // Reset state
      setCall(null);
      setStreamClient(null);
      setHasJoined(false);
      setIsConnecting(false);
      setVideoLoadError(null);
      
    } catch (error: any) {
      console.error('❌ Leave stream error:', error);
    } finally {
      setIsOperationInProgress(false);
    }
  }, [isOperationInProgress, hasJoined, call, streamClient, streamId, userRole]);
  
  // Send message
  const handleSendMessage = useCallback(async (message: string) => {
    if (!hasJoined) {
      return;
    }

    try {
      await sendMessage({
        streamId,
        data: { message }
      }).unwrap();
      
      refetchMessages();
    } catch (error: any) {
      console.error('Send message error:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  }, [hasJoined, streamId]);
  
  const state: StreamState = React.useMemo(() => ({
    streamClient,
    call,
    hasJoined,
    isConnecting,
    isOperationInProgress,
    baseURL,
    keyboardHeight,
    isKeyboardVisible,
    videoLoadError,
  }), [streamClient, call, hasJoined, isConnecting, isOperationInProgress, baseURL, keyboardHeight, isKeyboardVisible, videoLoadError]);
  
  const actions: StreamActions = React.useMemo(() => ({
    initializeStream,
    handleLeaveStream,
    handleSendMessage,
    setVideoLoadError,
    refetchMessages,
    resetConnectionState,
    refetchStreamDetails,
  }), [initializeStream, handleLeaveStream, handleSendMessage, setVideoLoadError, refetchMessages, resetConnectionState, refetchStreamDetails]);
  
  return {
    state,
    actions,
    streamDetails,
    streamLoading,
    streamError,
    messages,
    currentUser,
  };
};
