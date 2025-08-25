import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, Platform, Keyboard } from 'react-native';
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
}

export const useStreamState = ({ streamId, userRole }: UseStreamStateProps) => {
  const currentUser = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  
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
  
  // API hooks
  const { data: streamDetails, isLoading: streamLoading, error: streamError } = useGetStreamQuery(streamId, {
    skip: !streamId || streamId.length === 0, // Skip query if streamId is empty
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
        const url = `http://${detection.ip}:8000`;
        setBaseURL(url);
      } catch (error) {
        console.error('❌ Failed to detect IP:', error);
        setBaseURL('http://172.20.10.2:8000');
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
      // Set a timeout for the entire initialization
      const initTimeout = setTimeout(() => {
        console.log('Stream initialization timeout - proceeding anyway');
        setIsConnecting(false);
        setIsOperationInProgress(false);
      }, 15000); // 15 second timeout

      const client = await createStreamClient(currentUser);
      setStreamClient(client);

      const callId = `stream_${streamId}`;
      // Use the same call type as existing multi implementation ('default') for consistency
      const newCall = client.call('default', callId);
      
      // Add call event listeners to detect disconnections
      newCall.on('call.session_participant_left', () => {
        console.log('Participant left event detected');
        resetConnectionState();
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
      clearTimeout(initTimeout);

      // For hosts: try to start the stream but don't block on it
      if (userRole === 'host') {
        // Don't await this - let it happen in background
        streamAction({
          streamId,
          action: { action: 'start' }
        }).unwrap().then(() => {
          dispatch(streamsApi.util.invalidateTags(['Stream']));
        }).catch((startError: any) => {
          console.log('Stream start action failed (non-fatal):', startError);
          // Don't fail the entire initialization if start action fails
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
      setVideoLoadError(error.message || 'Failed to join stream');
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

    setIsOperationInProgress(true);

    try {
      // For hosts: end the stream to remove it from popular channels
      if (userRole === 'host' && hasJoined) {
        try {
          await streamAction({
            streamId,
            action: { action: 'end' }
          }).unwrap();
          
          // Invalidate streams cache to update popular channels immediately
          dispatch(streamsApi.util.invalidateTags(['Stream']));
        } catch (endError: any) {
          // Continue with cleanup even if end action fails
        }
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
  }), [initializeStream, handleLeaveStream, handleSendMessage, setVideoLoadError, refetchMessages, resetConnectionState]);
  
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
