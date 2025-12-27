/**
 * Stream connection state hook
 * Manages connection states, rate limiting, and retry logic
 */

import { useState, useCallback, useRef } from 'react';
import { ConnectionState } from '../../../../types/stream/state';
import { UseConnectionStateProps, UseConnectionStateReturn } from '../types';

export const useConnectionState = ({
  maxRetries = 3,
  retryDelay = 5000,
  rateLimitDuration = 30000
}: UseConnectionStateProps = {}): UseConnectionStateReturn => {
  
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnecting: false,
    isRateLimited: false,
    rateLimitedUntil: 0,
    consecutiveFailures: 0,
    canConnect: true,
    nextAllowedConnection: 0
  });

  const setConnecting = useCallback((connecting: boolean) => {
    setConnectionState(prev => ({
      ...prev,
      isConnecting: connecting
    }));
  }, []);

  const resetConnectionState = useCallback(() => {
    setConnectionState({
      isConnecting: false,
      isRateLimited: false,
      rateLimitedUntil: 0,
      consecutiveFailures: 0,
      canConnect: true,
      nextAllowedConnection: 0
    });
  }, []);

  const canAttemptConnection = useCallback((): boolean => {
    const now = Date.now();
    
    if (connectionState.isRateLimited && now < connectionState.rateLimitedUntil) {
      return false;
    }
    
    if (now < connectionState.nextAllowedConnection) {
      return false;
    }
    
    return connectionState.canConnect && !connectionState.isConnecting;
  }, [connectionState]);

  const recordFailure = useCallback(() => {
    const now = Date.now();
    const failures = connectionState.consecutiveFailures + 1;
    
    setConnectionState(prev => {
      const shouldRateLimit = failures >= maxRetries;
      
      return {
        ...prev,
        consecutiveFailures: failures,
        isRateLimited: shouldRateLimit,
        rateLimitedUntil: shouldRateLimit ? now + rateLimitDuration : 0,
        nextAllowedConnection: now + (retryDelay * Math.min(failures, 5)), // Exponential backoff
        canConnect: !shouldRateLimit,
        isConnecting: false
      };
    });
  }, [connectionState.consecutiveFailures, maxRetries, rateLimitDuration, retryDelay]);

  const recordSuccess = useCallback(() => {
    setConnectionState(prev => ({
      ...prev,
      consecutiveFailures: 0,
      isRateLimited: false,
      rateLimitedUntil: 0,
      canConnect: true,
      nextAllowedConnection: 0,
      isConnecting: false
    }));
  }, []);

  return {
    connectionState,
    setConnecting,
    resetConnectionState,
    canAttemptConnection,
    recordFailure,
    recordSuccess
  };
};