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
import { createStreamClient, createStreamUser, getConnectionState } from '../../../src/utils/streamClient';

import {
  UseStreamStateProps,
  UseStreamStateReturn
} from '../../../types/hooks/stream';
import { StreamState, ConnectionState } from '../../../types/stream/state';
import { StreamActions } from '../../../types/stream/actions';
import { MEDIA_BASE_URL } from '../../../src/config/env';

export const useStreamState = ({
  streamId,
  userRole
}: UseStreamStateProps): UseStreamStateReturn => {
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

  // Stream.io connection state monitoring
  const [connectionState, setConnectionState] = useState(getConnectionState());

  // Monitor connection state changes - check only on mount
  useEffect(() => {
    const checkConnectionState = () => {
      const newState = getConnectionState();
      setConnectionState(newState);
    };

    // Check connection state once on mount
    checkConnectionState();

    // No interval polling - was causing screen blinking
  }, []);

  // API hooks - polling disabled to prevent screen blinking
  const { data: streamDetails, isLoading: streamLoading, error: streamError, refetch: refetchStreamDetails } = useGetStreamQuery(streamId, {
    skip: !streamId || streamId.length === 0, // Skip query if streamId is empty
    pollingInterval: 0, // Disabled to prevent screen blinking
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
    const initializeBaseURL = () => {
      setBaseURL(MEDIA_BASE_URL);
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
    if (!currentUser?.id) {
      return;
    }

    if (userRole !== 'host') {
      if (streamLoading) {
        return;
      }
      if (!streamDetails) {
        return;
      }
    }

    if (isOperationInProgress || initializationInProgress.current) {
      return;
    }

    if (hasJoined && !call) {
      resetConnectionState();
      return;
    }

    if (hasJoined && call) {
      return;
    }

    setIsOperationInProgress(true);
    setIsConnecting(true);
    initializationInProgress.current = true;

    let initTimeoutRef: number | null = null;

    try {
      const connectionTimeout = __DEV__ ? 20000 : 45000;

      initTimeoutRef = setTimeout(() => {
        setIsConnecting(false);
        setIsOperationInProgress(false);
        initializationInProgress.current = false;
        setVideoLoadError('Connection timeout. Please check your internet and try again.');
      }, connectionTimeout);

      const client = await createStreamClient(currentUser);
      setStreamClient(client);

      const callId = `stream_${streamId}`;
      const callType = 'livestream'; // Always use livestream for all stream types
      const newCall = client.call(callType, callId);

      newCall.on('call.session_participant_left', (event) => {
        if (event.participant?.user?.id === String(currentUser?.id)) {
          resetConnectionState();
        } else {
          try {
            refetchStreamDetails();
          } catch (error) {
          }
        }
      });

      newCall.on('call.session_participant_joined', (event) => {
        try {
          refetchStreamDetails();
        } catch (error) {
        }
      });

      newCall.on('call.ended', () => {
        if (__DEV__) {
          resetConnectionState();
        } else {
          setTimeout(() => {
            if (!call) {
              resetConnectionState();
            } else {
              setIsConnecting(false);
              setIsOperationInProgress(false);
            }
          }, 2000);
        }
      });

      if (userRole === 'host') {
        await newCall.join({
          create: true,
          ring: false,
          notify: false
        });
        // Request and enable media for host with timeout
        try {
          const mediaTimeout = setTimeout(() => {
            setIsConnecting(false);
            setIsOperationInProgress(false);
          }, 8000);

          const camPerm = await Camera.requestCameraPermissionsAsync();
          const micPerm = await Camera.requestMicrophonePermissionsAsync();

          if (camPerm.status === 'granted') {
            try {
              // Enable camera first
              await Promise.race([
                newCall.camera.enable(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Camera timeout')), 5000))
              ]);

              await new Promise(resolve => setTimeout(resolve, 2000));

              const cameraState = await newCall.camera.state;

              try {
                await newCall.camera.enable();

                if (userRole === 'host') {
                  try {
                    await newCall.goLive();
                  } catch (goLiveErr: any) {
                  }
                }

              } catch (reEnableErr) {
              }

            } catch (err: any) {
            }
          } else {
          }

          if (micPerm.status === 'granted') {
            await Promise.race([
              newCall.microphone.enable(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Mic timeout')), 5000))
            ]).catch((err) => {
            });
          } else {
          }

          clearTimeout(mediaTimeout);

          setIsConnecting(false);
          setIsOperationInProgress(false);

        } catch (permErr) {
          setIsConnecting(false);
          setIsOperationInProgress(false);
        }
      } else {
        // Viewers join with metadata to identify them
        await newCall.join({
          create: false,
          ring: false,
          notify: false
        });

        setIsConnecting(false);
        setIsOperationInProgress(false);
      }

      clearTimeout(initTimeoutRef!);
      setCall(newCall);
      setHasJoined(true);

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
          setIsConnecting(false);
          setIsOperationInProgress(false);
          dispatch(streamsApi.util.invalidateTags(['Stream']));
        }).catch((startError: any) => {
          setIsConnecting(false);
          setIsOperationInProgress(false);

          // Show user-friendly error but don't fail the entire initialization
          if (startError.message?.includes('timeout')) {
            setVideoLoadError('Stream is taking longer than expected to start. You may continue, but viewers might need to refresh.');
          }
        });
      }

      if (userRole !== 'host') {
        joinStream({
          streamId,
          data: { participant_type: userRole === 'participant' ? 'guest' : 'viewer' }
        }).unwrap().then(() => {
        }).catch((e) => {
        });
      }
    } catch (error: any) {
      if (initTimeoutRef) clearTimeout(initTimeoutRef);
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

      if (shouldEndStream) {
        try {
          await streamAction({
            streamId,
            action: { action: 'end' }
          }).unwrap();

          dispatch(streamsApi.util.invalidateTags(['Stream']));
        } catch (endError: any) {
        }
      } else {
      }

      // Leave backend stream
      if (hasJoined) {
        try {
          await leaveStream(streamId).unwrap();
        } catch (leaveError: any) {
          if (leaveError?.data?.error === 'You are not in this stream') {
          } else {
          }
        }
      }

      // Leave GetStream call
      if (call) {
        try {
          await call.leave();
        } catch (callLeaveError: any) {
        }
      }

      // Disconnect client
      if (streamClient) {
        try {
          await streamClient.disconnectUser();
        } catch (disconnectError: any) {
        }
      }

      // Reset state
      setCall(null);
      setStreamClient(null);
      setHasJoined(false);
      setIsConnecting(false);
      setVideoLoadError(null);

    } catch (error: any) {
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
    connectionState,
    keyboardHeight,
    isKeyboardVisible,
    videoLoadError,
  }), [streamClient, call, hasJoined, isConnecting, isOperationInProgress, baseURL, connectionState, keyboardHeight, isKeyboardVisible, videoLoadError]);

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
    // Flatten state properties
    ...state,

    // Flatten action properties
    ...actions,

    // Additional computed values
    isReady: hasJoined && streamClient && call,
    canInteract: hasJoined && !isOperationInProgress,
    streamData: streamDetails,
    messagesData: messages,
  };
};
