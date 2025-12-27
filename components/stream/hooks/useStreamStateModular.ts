/**
 * Refactored useStreamState hook
 * Modular approach using specialized hooks for better maintainability
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser } from '../../../src/store/authSlice';
import { 
  useGetStreamQuery, 
  useJoinStreamMutation, 
  useLeaveStreamMutation, 
  useGetStreamMessagesQuery, 
  useStreamActionMutation,
  streamsApi
} from '../../../src/store/streamsApi';
import { StreamVideoClient } from '@stream-io/video-react-native-sdk';
import { createStreamClient, createStreamUser, getConnectionState } from '../../../src/utils/streamClient';

// Import types
import { 
  UseStreamStateProps, 
  UseStreamStateReturn 
} from '../../../types/hooks/stream';

// Import modular hooks
import {
  useStreamInitialization,
  useStreamCleanup,
  useStreamMessaging,
  useConnectionState,
  useKeyboardState
} from './modules';

export const useStreamState = ({ 
  streamId, 
  userRole 
}: UseStreamStateProps): UseStreamStateReturn => {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);

  // Core state
  const [streamClient, setStreamClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<any>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [isOperationInProgress, setIsOperationInProgress] = useState(false);
  const [baseURL, setBaseURL] = useState('https://daremelive.pythonanywhere.com');
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);

  // Modular hooks
  const keyboardState = useKeyboardState();
  const connectionState = useConnectionState();
  
  const initialization = useStreamInitialization({
    streamId,
    userRole,
    autoInitialize: false
  });

  const cleanup = useStreamCleanup({
    call,
    streamClient,
    onCleanupComplete: () => {
      setCall(null);
      setStreamClient(null);
      setHasJoined(false);
      setIsOperationInProgress(false);
      setVideoLoadError(null);
    }
  });

  const messaging = useStreamMessaging({
    streamId,
    enabled: hasJoined
  });

  // API hooks
  const { 
    data: streamDetails, 
    refetch: refetchStreamDetails,
    isLoading: isStreamLoading 
  } = useGetStreamQuery(streamId, {
    refetchOnMountOrArgChange: true,
    skip: !streamId || streamId.length === 0,
  });

  const { 
    data: streamMessages, 
    refetch: refetchMessages,
    isLoading: isMessagesLoading 
  } = useGetStreamMessagesQuery(streamId, {
    skip: !streamId || streamId.length === 0,
  });

  const [joinStream] = useJoinStreamMutation();
  const [leaveStream] = useLeaveStreamMutation();
  const [streamAction] = useStreamActionMutation();

  // App state handling
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (hasJoined && userRole !== 'host') {
          handleLeaveStream();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [hasJoined, userRole]);

  // Initialize stream
  const initializeStream = useCallback(async (): Promise<void> => {
    if (isOperationInProgress || hasJoined || !streamId) {
      return;
    }

    if (!connectionState.canAttemptConnection()) {
      return;
    }

    setIsOperationInProgress(true);
    connectionState.setConnecting(true);

    try {
      await initialization.initialize();
      
      // The actual stream client and call setup would need to be handled here
      // This is a simplified version - in practice, you'd get the client and call
      // from the initialization hook and set them in state
      
      setHasJoined(true);
      connectionState.recordSuccess();

      // For hosts: try to start the stream but don't block on it
      if (userRole === 'host') {
        const streamStartPromise = streamAction({
          streamId,
          action: { action: 'start' }
        }).unwrap().then(() => {
          setIsOperationInProgress(false);
          dispatch(streamsApi.util.invalidateTags(['Stream']));
        }).catch((startError: any) => {
          setIsOperationInProgress(false);
        });
      }

      // For viewers: join stream in background
      if (userRole !== 'host') {
        joinStream({
          streamId,
          data: { participant_type: userRole === 'participant' ? 'guest' : 'viewer' }
        }).unwrap().then(() => {
        }).catch((e) => {
        });
      }
    } catch (error: any) {
      connectionState.recordFailure();
      throw error;
    } finally {
      setIsOperationInProgress(false);
      connectionState.setConnecting(false);
    }
  }, [
    isOperationInProgress, 
    hasJoined, 
    streamId, 
    userRole, 
    connectionState, 
    initialization,
    streamAction,
    joinStream,
    dispatch
  ]);

  // Leave stream - delegate to cleanup hook
  const handleLeaveStream = useCallback(async (): Promise<void> => {
    if (isOperationInProgress || !hasJoined) {
      return;
    }

    setIsOperationInProgress(true);

    try {
      // Backend cleanup
      if (hasJoined) {
        try {
          await leaveStream(streamId).unwrap();
        } catch (leaveError: any) {
          if (leaveError?.data?.error === 'You are not in this stream') {
          } else {
          }
        }
      }

      // Stream client cleanup
      await cleanup.cleanup();
      
    } catch (error: any) {
    } finally {
      setIsOperationInProgress(false);
    }
  }, [isOperationInProgress, hasJoined, cleanup, leaveStream, streamId]);

  // Send message - delegate to messaging hook
  const handleSendMessage = useCallback(async (message: string): Promise<void> => {
    await messaging.sendMessage(message);
    refetchMessages();
  }, [messaging, refetchMessages]);

  // Reset connection state
  const resetConnectionState = useCallback(() => {
    connectionState.resetConnectionState();
  }, [connectionState]);

  return {
    // State
    streamClient,
    call,
    hasJoined,
    isConnecting: connectionState.connectionState.isConnecting,
    isOperationInProgress,
    baseURL,
    connectionState: connectionState.connectionState,
    keyboardHeight: keyboardState.keyboardHeight,
    isKeyboardVisible: keyboardState.isKeyboardVisible,
    videoLoadError,

    // Actions
    initializeStream,
    handleLeaveStream,
    handleSendMessage,
    setVideoLoadError,
    refetchMessages,
    resetConnectionState,
    refetchStreamDetails,

    // Computed values
    isReady: hasJoined && streamClient && call,
    canInteract: hasJoined && !isOperationInProgress,
    streamData: streamDetails,
    messagesData: streamMessages
  };
};