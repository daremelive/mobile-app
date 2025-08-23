import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/authSlice';
import { useGetMyStreamsQuery, useStreamActionMutation, useEmergencyCleanupStreamsMutation, streamsApi } from '../store/streamsApi';
import { useDispatch } from 'react-redux';

export const useStreamCleanup = () => {
  const currentUser = useSelector(selectCurrentUser);
  const { data: myStreams, refetch: refetchStreams } = useGetMyStreamsQuery(undefined, {
    skip: !currentUser,
    pollingInterval: 30000, // Poll every 30 seconds to keep data fresh
  });
  const [streamAction] = useStreamActionMutation();
  const [emergencyCleanup] = useEmergencyCleanupStreamsMutation();
  const dispatch = useDispatch();
  
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const backgroundTimeRef = useRef<number | null>(null);
  const cleanupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasEndedStreamsRef = useRef<boolean>(false);

  const endActiveStreams = useCallback(async (reason: string) => {
    if (hasEndedStreamsRef.current) {
      // Silent operation - no logging
      return;
    }
    
    if (!currentUser) return;
    
    try {
      // Silent operation - no logging
      hasEndedStreamsRef.current = true;
      
      const { data: streams } = await refetchStreams();
      
      if (streams) {
        const activeStreams = streams.filter((stream: any) => 
          stream.status === 'live' && stream.host?.id === currentUser.id
        );
        
        // Silent operation - no logging
        
        if (activeStreams.length > 0) {
          for (const stream of activeStreams) {
            // Silent operation - no logging
            await streamAction({
              streamId: stream.id,
              action: { action: 'end' }
            }).unwrap();
            // Silent success - no logging
          }
        }
      }
    } catch (error) {
      // Silent error handling - no logging
      
      // Emergency cleanup as fallback
      try {
        const result = await emergencyCleanup().unwrap();
        // Silent success - no logging
      } catch (emergencyError) {
        // Silent error - no logging
      }
      
      // Reset flag on error so we can retry
      hasEndedStreamsRef.current = false;
    }
  }, [currentUser, refetchStreams, streamAction, emergencyCleanup]);

  // Reset the ended streams flag when streams data changes
  useEffect(() => {
    hasEndedStreamsRef.current = false;
  }, [myStreams]);

  useEffect(() => {
    if (!currentUser) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const currentAppState = appStateRef.current;
      
      // Silent state change - no logging
      
      if (currentAppState === 'active' && nextAppState === 'background') {
        backgroundTimeRef.current = Date.now();
        hasEndedStreamsRef.current = false;
        
        // Silent background handling - no logging
        
        // Multiple aggressive cleanup attempts to catch app dismissal
        
        // Immediate cleanup after 1 second 
        setTimeout(async () => {
          if (appStateRef.current === 'background') {
            // Silent cleanup - no logging
            await endActiveStreams('App backgrounded - immediate cleanup (1s)');
          }
        }, 1000);
        
        // Secondary cleanup after 3 seconds 
        setTimeout(async () => {
          if (appStateRef.current === 'background') {
            // Silent cleanup - no logging
            await endActiveStreams('App backgrounded - secondary cleanup (3s)');
          }
        }, 3000);
        
        // Final cleanup after 5 seconds
        cleanupTimeoutRef.current = setTimeout(async () => {
          if (appStateRef.current === 'background') {
            // Silent cleanup - no logging
            await endActiveStreams('App backgrounded for 5+ seconds');
          }
        }, 5000);
        
      } else if (currentAppState === 'background' && nextAppState === 'active') {
        // Silent return to foreground - no logging
        if (cleanupTimeoutRef.current) {
          clearTimeout(cleanupTimeoutRef.current);
          cleanupTimeoutRef.current = null;
        }
        backgroundTimeRef.current = null;
        hasEndedStreamsRef.current = false;
        
        refetchStreams();
      }
      
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
    };
  }, [currentUser, endActiveStreams, refetchStreams]);
};
