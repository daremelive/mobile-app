/**
 * Stream cleanup hook
 * Handles stream disconnection, resource cleanup, and state reset
 */

import { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { streamsApi } from '../../../../src/store/streamsApi';
import { 
  UseStreamCleanupProps, 
  UseStreamCleanupReturn 
} from '../../../../types/hooks/stream';

export const useStreamCleanup = ({
  call,
  streamClient,
  onCleanupComplete
}: UseStreamCleanupProps): UseStreamCleanupReturn => {
  const dispatch = useDispatch();
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const cleanup = useCallback(async (): Promise<void> => {
    if (isCleaningUp) return;

    setIsCleaningUp(true);

    try {
      // Leave GetStream call
      if (call) {
        try {
          await call.leave();
        } catch (callLeaveError: any) {
          // Silent cleanup
        }
      }

      // Disconnect client
      if (streamClient) {
        try {
          await streamClient.disconnectUser();
        } catch (disconnectError: any) {
          // Silent cleanup
        }
      }

      // Invalidate cache
      dispatch(streamsApi.util.invalidateTags(['Stream']));

      onCleanupComplete?.();
      
    } catch (error: any) {
      // Continue cleanup even on errors
    } finally {
      setIsCleaningUp(false);
    }
  }, [call, streamClient, isCleaningUp, dispatch, onCleanupComplete]);

  const forceCleanup = useCallback(async (): Promise<void> => {
    setIsCleaningUp(false); // Reset state
    await cleanup();
  }, [cleanup]);

  return {
    cleanup,
    isCleaningUp,
    forceCleanup
  };
};