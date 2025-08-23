import { useRef, useEffect, useCallback } from 'react';
import { StreamWebSocketService } from '../services/StreamWebSocketService';

interface UseStreamingWebSocketProps {
  streamId: string;
  userId: string;
  token: string;
  onGuestInvited?: (guest: any, invitedBy: any) => void;
  onGuestJoined?: (participant: any) => void;
  onGuestDeclined?: (guest: any) => void;
  onGuestRemoved?: (guestId: string, removedBy: string) => void;
  onCameraToggled?: (userId: string, enabled: boolean) => void;
  onMicrophoneToggled?: (userId: string, enabled: boolean) => void;
  onStreamMessage?: (message: any) => void;
  onStreamState?: (state: any) => void;
  onError?: (error: string) => void;
  enabled?: boolean;
}

/**
 * Streaming-optimized WebSocket hook that minimizes re-renders
 * and provides stable connection during video streaming
 */
export const useStreamingWebSocket = ({
  streamId,
  userId,
  token,
  onGuestInvited,
  onGuestJoined,
  onGuestDeclined,
  onGuestRemoved,
  onCameraToggled,
  onMicrophoneToggled,
  onStreamMessage,
  onStreamState,
  onError,
  enabled = true
}: UseStreamingWebSocketProps) => {
  const serviceRef = useRef<StreamWebSocketService | null>(null);
  const isConnectedRef = useRef(false);

  // Stable callback refs to prevent reconnections
  const stableCallbacks = useRef({
    onGuestInvited: onGuestInvited || (() => {}),
    onGuestJoined: onGuestJoined || (() => {}),
    onGuestDeclined: onGuestDeclined || (() => {}),
    onGuestRemoved: onGuestRemoved || (() => {}),
    onCameraToggled: onCameraToggled || (() => {}),
    onMicrophoneToggled: onMicrophoneToggled || (() => {}),
    onStreamMessage: onStreamMessage || (() => {}),
    onStreamState: onStreamState || (() => {}),
    onError: onError || (() => {})
  });

  // Update callbacks without causing reconnection
  useEffect(() => {
    stableCallbacks.current = {
      onGuestInvited: onGuestInvited || (() => {}),
      onGuestJoined: onGuestJoined || (() => {}),
      onGuestDeclined: onGuestDeclined || (() => {}),
      onGuestRemoved: onGuestRemoved || (() => {}),
      onCameraToggled: onCameraToggled || (() => {}),
      onMicrophoneToggled: onMicrophoneToggled || (() => {}),
      onStreamMessage: onStreamMessage || (() => {}),
      onStreamState: onStreamState || (() => {}),
      onError: onError || (() => {})
    };
  }, [onGuestInvited, onGuestJoined, onGuestDeclined, onGuestRemoved, 
      onCameraToggled, onMicrophoneToggled, onStreamMessage, onStreamState, onError]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!enabled || !streamId || !userId || !token) {
      return;
    }

    // Create service with stable callback references
    const service = new StreamWebSocketService({
      streamId,
      userId,
      token,
      onGuestInvited: (guest, invitedBy) => stableCallbacks.current.onGuestInvited(guest, invitedBy),
      onGuestJoined: (participant) => stableCallbacks.current.onGuestJoined(participant),
      onGuestDeclined: (guest) => stableCallbacks.current.onGuestDeclined(guest),
      onGuestRemoved: (guestId, removedBy) => stableCallbacks.current.onGuestRemoved(guestId, removedBy),
      onCameraToggled: (userId, enabled) => stableCallbacks.current.onCameraToggled(userId, enabled),
      onMicrophoneToggled: (userId, enabled) => stableCallbacks.current.onMicrophoneToggled(userId, enabled),
      onStreamMessage: (message) => stableCallbacks.current.onStreamMessage(message),
      onStreamState: (state) => stableCallbacks.current.onStreamState(state),
      onError: (error) => stableCallbacks.current.onError(error)
    });

    serviceRef.current = service;

    // Connect asynchronously to avoid blocking render
    const connectAsync = async () => {
      try {
        await service.connect();
        isConnectedRef.current = true;
      } catch (error) {
        // Silent connection error - no logging to prevent screen refresh
      }
    };

    connectAsync();

    return () => {
      if (serviceRef.current) {
        serviceRef.current.disconnect();
        serviceRef.current = null;
      }
      isConnectedRef.current = false;
    };
  }, [streamId, userId, token, enabled]);

  // Stable methods that don't cause re-renders
  const sendChatMessage = useCallback((message: string) => {
    serviceRef.current?.sendChatMessage(message);
  }, []);

  const inviteGuest = useCallback((username: string) => {
    serviceRef.current?.inviteGuest(username);
  }, []);

  const toggleCamera = useCallback((enabled: boolean) => {
    serviceRef.current?.toggleCamera(enabled);
  }, []);

  const toggleMicrophone = useCallback((enabled: boolean) => {
    serviceRef.current?.toggleMicrophone(enabled);
  }, []);

  const isConnected = useCallback(() => {
    return serviceRef.current?.isConnectedToStream() || false;
  }, []);

  return {
    sendChatMessage,
    inviteGuest,
    toggleCamera,
    toggleMicrophone,
    isConnected,
    service: serviceRef.current
  };
};
