import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/authSlice';
import { useStreamActionMutation } from '../store/streamsApi';

export const useStreamHeartbeat = (streamId: string | null, isActive: boolean = false) => {
  const currentUser = useSelector(selectCurrentUser);
  const [streamAction] = useStreamActionMutation();
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isActiveRef = useRef(isActive);
  
  // Update active status
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    // Enhanced validation - check for valid UUID format
    const isValidStreamId = streamId && 
      typeof streamId === 'string' && 
      streamId.trim().length > 0 &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(streamId);

    if (!isValidStreamId || !currentUser || !isActive) {
      // Clear heartbeat if stream is not active or invalid
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
        // Silent operation - no logging to prevent screen refresh
      }
      
      // Silent validation - no logging
      
      return;
    }

    // Silent heartbeat start - no logging

    // Send initial heartbeat
    const sendHeartbeat = async () => {
      // Double-check conditions before sending
      if (!isActiveRef.current || !isValidStreamId) {
        // Silent skip - no logging
        return;
      }
      
      try {
        await streamAction({
          streamId,
          action: { action: 'heartbeat' }
        }).unwrap();
        // Silent success - no logging
      } catch (error: any) {
        // Silent error handling - no logging
        
        // If stream is not found or not live, stop heartbeat IMMEDIATELY
        if (error?.status === 404) {
          // Silent cleanup - no logging
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
          }
          // Update the active ref to prevent further heartbeats
          isActiveRef.current = false;
        } else if (error?.status === 400) {
          // Silent cleanup - no logging
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
          }
          // Update the active ref to prevent further heartbeats
          isActiveRef.current = false;
        }
      }
    };

    // Send heartbeat immediately
    sendHeartbeat();

    // Send heartbeat every 10 seconds (more aggressive for force-close protection)
    // Industry standard is typically 15-30s, but for mobile apps prone to force-close,
    // a shorter interval ensures better ghost stream detection
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 10000);

    // Handle app state changes
    const handleAppStateChange = (nextAppState: any) => {
      if (nextAppState === 'background') {
        // Silent background handling - no logging
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
      } else if (nextAppState === 'active' && isActiveRef.current && isValidStreamId) {
        // Silent resume - no logging
        sendHeartbeat();
        heartbeatIntervalRef.current = setInterval(sendHeartbeat, 10000);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      // Silent cleanup - no logging
    };
  }, [streamId, currentUser, isActive, streamAction]);

  // Memoized sendHeartbeat function to prevent useEffect re-runs
  const sendHeartbeat = useCallback(async () => {
    const isValidStreamId = streamId && 
      typeof streamId === 'string' && 
      streamId.trim().length > 0 &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(streamId);
      
    if (isValidStreamId && isActive) {
      try {
        await streamAction({
          streamId,
          action: { action: 'heartbeat' }
        }).unwrap();
      } catch (error) {
        // Silent error - no logging
      }
    } else {
      // Silent warning - no logging
    }
  }, [streamId, isActive, streamAction]);

  return {
    sendHeartbeat
  };
};
