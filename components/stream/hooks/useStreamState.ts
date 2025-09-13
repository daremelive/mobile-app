import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, Platform, Keyboard, AppState } from 'react-native';
import { Camera } from 'expo-camera';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser } from '../../../src/store/authSlice';
import { debugLog, logGetStreamStep } from '../../../src/utils/productionStreamDebug';
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
  
  // Use ref to track initialization state more reliably
  const initializationInProgress = useRef(false);
  
  // Reset connection state when call is disconnected
  const resetConnectionState = useCallback(() => {
    setCall(null);
    setStreamClient(null);
    setHasJoined(false);
    setIsConnecting(false);
    setVideoLoadError(null);
    setIsOperationInProgress(false);
    initializationInProgress.current = false;
  }, []);

  // Stream initialization - simplified version with better timeout handling
  const initializeStream = useCallback(async () => {
    console.log('🔍 [StreamState] initializeStream called - entry point');
    console.log('🔍 [StreamState] Current state:', {
      currentUserId: currentUser?.id,
      userRole,
      hasStreamDetails: !!streamDetails,
      streamLoading,
      streamError: !!streamError,
      isOperationInProgress,
      initInProgress: initializationInProgress.current,
      hasJoined,
      hasCall: !!call
    });
    
    // Allow host to initialize even if streamDetails hasn't loaded yet; others wait
    if (!currentUser?.id) {
      console.log('🔍 [StreamState] No current user - exiting');
      return;
    }
    
    if (userRole !== 'host') {
      // Viewers need stream details to load first
      if (streamLoading) {
        console.log('🔍 [StreamState] Stream details still loading for viewer - waiting...');
        return;
      }
      if (!streamDetails) {
        console.log('🔍 [StreamState] No stream details available for viewer - exiting');
        return;
      }
    }
    
    if (isOperationInProgress || initializationInProgress.current) {
      console.log('🔄 Initialization already in progress - skipping duplicate call');
      return;
    }

    // If hasJoined is true but no call exists, reset state first
    if (hasJoined && !call) {
      console.log('🔍 [StreamState] Detected stale hasJoined state, resetting...');
      resetConnectionState();
      return;
    }

    if (hasJoined && call) {
      console.log('🔍 [StreamState] Already properly connected - exiting');
      // Already properly connected
      return;
    }

    console.log('🔍 [StreamState] Setting initialization flags');
    setIsOperationInProgress(true);
    setIsConnecting(true);
    initializationInProgress.current = true;
    
    // Enhanced production debugging
    console.log('🚀 [StreamState] Starting stream initialization', {
      environment: __DEV__ ? 'development' : 'production',
      streamId,
      userRole,
      userId: currentUser?.id,
      username: currentUser?.username
    });

    let initTimeoutRef: number | null = null;
    
    try {
      // Set a timeout for the entire initialization - extended for production
      const connectionTimeout = __DEV__ ? 20000 : 45000; // 45 seconds for production
      
      initTimeoutRef = setTimeout(() => {
        console.log('⚠️ Stream initialization timeout - forcing reset');
        setIsConnecting(false);
        setIsOperationInProgress(false);
        initializationInProgress.current = false;
        setVideoLoadError('Connection timeout. Please check your internet and try again.');
      }, connectionTimeout);

      console.log('🎯 [StreamState] Creating GetStream client...');
      logGetStreamStep('CLIENT_CREATE_START', true, { userId: currentUser?.id, userRole });
      
      const client = await createStreamClient(currentUser);
      
      console.log('🔍 [StreamState] GetStream client created successfully');
      logGetStreamStep('CLIENT_CREATE_SUCCESS', true, { hasClient: !!client });
      console.log('✅ [StreamState] GetStream client created successfully');
      setStreamClient(client);

      const callId = `stream_${streamId}`;
      // Use 'livestream' call type for proper video streaming
      const newCall = client.call('livestream', callId);
      
      console.log('🎯 [StreamState] Created livestream call with ID:', callId, 'for role:', userRole);
      
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
          // Safely refetch stream details to update viewer count
          try {
            refetchStreamDetails();
          } catch (error) {
            console.log('⚠️ Could not refetch stream details (query may be inactive):', error);
          }
        }
      });
      
      newCall.on('call.session_participant_joined', (event) => {
        console.log('Participant joined event detected:', event);
        // Safely refetch stream details to update viewer count
        try {
          refetchStreamDetails();
        } catch (error) {
          console.log('⚠️ Could not refetch stream details (query may be inactive):', error);
        }
      });
      
      newCall.on('call.ended', () => {
        console.log('Call ended event detected');
        
        // In production, don't immediately reset on call.ended - network hiccups can trigger this
        if (__DEV__) {
          resetConnectionState();
        } else {
          console.log('⚠️ Production: Call ended detected but not resetting state to prevent false disconnections');
          // Add production-specific handling for immediate call endings
          setTimeout(() => {
            if (!call) { // Only reset if no call exists after delay
              console.log('Delayed reset after call ended in production');
              resetConnectionState();
            } else {
              // Force reset the UI loading state even if call exists
              console.log('🔧 Production: Forcing UI state reset while maintaining call');
              setIsConnecting(false);
              setIsOperationInProgress(false);
            }
          }, 2000); // Reduced to 2 seconds for faster UI response
        }
      });

      if (userRole === 'host') {
        console.log('🎥 Host joining livestream call...');
        await newCall.join({ 
          create: true,
          ring: false,
          notify: false
        });
        // Request and enable media for host with timeout
        try {
          const mediaTimeout = setTimeout(() => {
            console.log('Media enable timeout - continuing with stream');
            // Force reset connecting state if media times out
            setIsConnecting(false);
            setIsOperationInProgress(false);
          }, 8000); // 8 second media timeout
          
          const camPerm = await Camera.requestCameraPermissionsAsync();
          const micPerm = await Camera.requestMicrophonePermissionsAsync();
          
          console.log('📷 Camera permission:', camPerm.status, '🎤 Mic permission:', micPerm.status);
          
          if (camPerm.status === 'granted') {
            console.log('🎥 Enabling camera for host...');
            try {
              // Enable camera first
              await Promise.race([
                newCall.camera.enable(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Camera timeout')), 5000))
              ]);
              
              console.log('✅ Camera enabled successfully');
              
              // Wait for camera to fully initialize
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Check if camera is actually enabled and streaming
              const cameraState = await newCall.camera.state;
              console.log('📹 Camera state after enable:', {
                isEnabled: cameraState.status === 'enabled',
                status: cameraState.status,
                direction: cameraState.direction
              });
              
              // Force enable video track for publishing to remote participants
              try {
                await newCall.camera.enable();
                console.log('🔄 Re-enabled camera to ensure publishing');
                
                // For livestream calls, we need to "go live" to start broadcasting
                if (userRole === 'host') {
                  try {
                    await newCall.goLive();
                    console.log('📡 Host went live - broadcasting to viewers');
                  } catch (goLiveErr: any) {
                    console.log('⚠️ Could not go live (may not be available in this SDK version):', goLiveErr.message);
                  }
                }
                
              } catch (reEnableErr) {
                console.log('⚠️ Camera re-enable attempt failed:', reEnableErr);
              }
              
            } catch (err: any) {
              console.log('❌ Camera enable failed:', err.message);
            }
          } else {
            console.log('⚠️ Camera permission denied - continuing without camera');
          }
          
          if (micPerm.status === 'granted') {
            await Promise.race([
              newCall.microphone.enable(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Mic timeout')), 5000))
            ]).catch((err) => {
              console.log('Microphone enable failed or timed out:', err.message);
            });
          } else {
            console.log('⚠️ Microphone permission denied - continuing without mic');
          }
          
          clearTimeout(mediaTimeout);
          
          // Ensure UI state is updated after permissions
          console.log('🎯 Media setup complete - updating UI state');
          setIsConnecting(false);
          setIsOperationInProgress(false);
          
        } catch (permErr) {
          console.log('Media permission/enable error (non-fatal):', permErr);
          // Always reset UI state even on permission errors
          setIsConnecting(false);
          setIsOperationInProgress(false);
        }
      } else {
        console.log('🔍 [StreamState] Viewer branch - starting call join...');
        console.log('🎥 Viewer joining livestream call...');
        
        await newCall.join({ 
          create: false,
          ring: false,
          notify: false
        });
        
        console.log('🔍 [StreamState] Viewer call join completed successfully');
        
        // Immediately set viewer states to prevent endless connecting
        console.log('✅ Viewer joined call successfully - updating states');
        setIsConnecting(false);
        setIsOperationInProgress(false);
        console.log('🔍 [StreamState] Viewer states updated after join');
      }
      
      console.log('🔍 [StreamState] Setting final call and joined states');
      clearTimeout(initTimeoutRef!); // Clear timeout on success
      setCall(newCall);
      setHasJoined(true);
      console.log('🔍 [StreamState] Final states set - hasJoined: true, call set');
      console.log('✅ [StreamState] Stream call joined successfully');

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
          // Ensure UI state is reset on successful stream start
          setIsConnecting(false);
          setIsOperationInProgress(false);
          dispatch(streamsApi.util.invalidateTags(['Stream']));
        }).catch((startError: any) => {
          console.log('❌ Stream start action failed:', startError);
          // Always reset UI state on stream start completion (success or failure)
          setIsConnecting(false);
          setIsOperationInProgress(false);
          
          // Show user-friendly error but don't fail the entire initialization
          if (startError.message?.includes('timeout')) {
            setVideoLoadError('Stream is taking longer than expected to start. You may continue, but viewers might need to refresh.');
          }
        });
      }

      if (userRole !== 'host') {
        // Don't await this either - non-blocking join - run in background
        console.log('🔗 [Viewer] Starting backend join stream API call (non-blocking)...');
        joinStream({
          streamId,
          data: { participant_type: userRole === 'participant' ? 'guest' : 'viewer' }
        }).unwrap().then(() => {
          console.log('✅ [Viewer] Backend join stream completed successfully');
        }).catch((e) => {
          console.log('⚠️ [Viewer] Join stream API failed (non-fatal):', e);
        });
      }
    } catch (error: any) {
      console.error('❌ Stream initialization error:', error);
      
      if (initTimeoutRef) clearTimeout(initTimeoutRef); // Clear timeout on error too
      setIsConnecting(false);
      setIsOperationInProgress(false);
      initializationInProgress.current = false;
      
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
      initializationInProgress.current = false;
    }
  }, [currentUser?.id, streamDetails?.id, isOperationInProgress, hasJoined, streamId, userRole, streamLoading]);
  
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
        try {
          await leaveStream(streamId).unwrap();
        } catch (leaveError: any) {
          // Silently handle expected "not in stream" errors that occur during normal cleanup
          if (leaveError?.data?.error === 'You are not in this stream') {
            console.log('[StreamState] ℹ️ User already left stream or stream ended - continuing cleanup');
          } else {
            console.error('[StreamState] ❌ Unexpected leave stream error:', leaveError);
          }
        }
      }

      // Leave GetStream call
      if (call) {
        try {
          await call.leave();
        } catch (callLeaveError: any) {
          // Silently handle expected call leave errors during cleanup
          console.log('[StreamState] ℹ️ Call leave completed with expected cleanup response');
        }
      }

      // Disconnect client
      if (streamClient) {
        try {
          await streamClient.disconnectUser();
        } catch (disconnectError: any) {
          // Silently handle expected disconnect errors during cleanup
          console.log('[StreamState] ℹ️ Stream client disconnect completed');
        }
      }

      // Reset state
      setCall(null);
      setStreamClient(null);
      setHasJoined(false);
      setIsConnecting(false);
      setVideoLoadError(null);
      
    } catch (error: any) {
      console.error('[StreamState] ❌ Unexpected error during stream cleanup:', error);
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
