import { useState, useEffect, useRef, useCallback } from 'react';
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
  const { data: streamDetails, isLoading: streamLoading, error: streamError } = useGetStreamQuery(streamId);
  const [joinStream] = useJoinStreamMutation();
  const [leaveStream] = useLeaveStreamMutation();
  const [sendMessage] = useSendMessageMutation();
  const [streamAction] = useStreamActionMutation();
  const { data: messages = [], refetch: refetchMessages } = useGetStreamMessagesQuery(
    streamId, 
    { 
      // pollingInterval: 3000, // Disabled to prevent screen blinking
      refetchOnMountOrArgChange: true,
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
  
  // Stream initialization - simplified version
  const initializeStream = useCallback(async () => {
    // Allow host to initialize even if streamDetails hasn't loaded yet; others wait
    if (!currentUser?.id) return;
    if (userRole !== 'host' && !streamDetails) return; // viewers/participants still need details
    if (isOperationInProgress || hasJoined) return;

    setIsOperationInProgress(true);
    setIsConnecting(true);

    try {
      const client = await createStreamClient(currentUser);
      setStreamClient(client);

  const callId = `stream_${streamId}`;
  // Use the same call type as existing multi implementation ('default') for consistency
  const newCall = client.call('default', callId);
      if (userRole === 'host') {
        await newCall.join({ create: true });
        // Request and enable media for host
        try {
          const camPerm = await Camera.requestCameraPermissionsAsync();
          const micPerm = await Camera.requestMicrophonePermissionsAsync();
          if (camPerm.status === 'granted') {
            await newCall.camera.enable().catch(() => {});
          }
          if (micPerm.status === 'granted') {
            await newCall.microphone.enable().catch(() => {});
          }
        } catch (permErr) {
          console.log('⚠️ Media permission/enable error (host):', permErr);
        }
      } else {
        await newCall.join();
      }
      setCall(newCall);
      setHasJoined(true);

      // For hosts: automatically start the stream to make it visible in popular channels
      if (userRole === 'host') {
        try {
          await streamAction({
            streamId,
            action: { action: 'start' }
          }).unwrap();
          console.log('✅ Stream started and is now live');
          
          // Invalidate streams cache to update popular channels immediately
          dispatch(streamsApi.util.invalidateTags(['Stream']));
        } catch (startError: any) {
          console.log('ℹ️ Stream start action failed (may already be live):', startError?.data?.error || startError.message);
          // Don't fail the entire initialization if start action fails
          // The stream might already be live or in a valid state
        }
      }

      if (userRole !== 'host') {
        try {
          await joinStream({
            streamId,
            data: { participant_type: userRole === 'participant' ? 'guest' : 'viewer' }
          }).unwrap();
        } catch (e) {
          // Non-fatal
        }
      }
    } catch (error: any) {
      console.error('❌ Stream initialization error:', error);
      setVideoLoadError(error.message || 'Failed to join stream');
    } finally {
      setIsConnecting(false);
      setIsOperationInProgress(false);
    }
  }, [currentUser, streamDetails, isOperationInProgress, hasJoined, streamId, userRole, joinStream, streamAction, dispatch]);
  
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
          console.log('✅ Stream ended and removed from popular channels');
          
          // Invalidate streams cache to update popular channels immediately
          dispatch(streamsApi.util.invalidateTags(['Stream']));
        } catch (endError: any) {
          console.log('ℹ️ Stream end action failed (may already be ended):', endError?.data?.error || endError.message);
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
  }, [isOperationInProgress, hasJoined, call, streamClient, leaveStream, streamId, userRole, streamAction, dispatch]);
  
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
  }, [hasJoined, streamId, sendMessage, refetchMessages]);
  
  const state: StreamState = {
    streamClient,
    call,
    hasJoined,
    isConnecting,
    isOperationInProgress,
    baseURL,
    keyboardHeight,
    isKeyboardVisible,
    videoLoadError,
  };
  
  const actions: StreamActions = {
    initializeStream,
    handleLeaveStream,
    handleSendMessage,
    setVideoLoadError,
    refetchMessages,
  };
  
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
