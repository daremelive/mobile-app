/**
 * Stream initialization hook
 * Handles stream setup, client creation, and connection
 */

import { useState, useRef, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { Camera } from 'expo-camera';
import { useDispatch } from 'react-redux';
import { StreamVideoClient } from '@stream-io/video-react-native-sdk';
import { createStreamClient, createStreamUser } from '../../../../src/utils/streamClient';
import { streamsApi } from '../../../../src/store/streamsApi';
import { 
  UseStreamInitializationProps, 
  UseStreamInitializationReturn 
} from '../../../../types/hooks/stream';
import { ConnectionState } from '../../../../types/stream/state';

export const useStreamInitialization = ({
  streamId,
  userRole,
  autoInitialize = false
}: UseStreamInitializationProps): UseStreamInitializationReturn => {
  const dispatch = useDispatch();
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const initTimeoutRef = useRef<number>();

  const reset = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setIsInitializing(false);
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
    }
  }, []);

  const initialize = useCallback(async (): Promise<void> => {
    if (isInitializing || !streamId) {
      return;
    }

    setIsInitializing(true);
    setError(null);

    try {
      // Set initialization timeout
      initTimeoutRef.current = setTimeout(() => {
        setError('Stream initialization timed out');
        setIsInitializing(false);
      }, 30000) as any;

      // Create stream client and user
      const streamClient = await createStreamClient('dummy');
      const userData = await createStreamUser('dummy');
      
      if (!streamClient || !userData) {
        throw new Error('Failed to create stream client or user');
      }

      // Connect to stream
      await streamClient.connectUser(userData, 'dummy_token');

      // Create call
      const newCall = streamClient.call('livestream', streamId);
      
      if (!newCall) {
        throw new Error('Failed to create stream call');
      }

      // Join call based on user role
      if (userRole === 'host') {
        await newCall.join({ 
          create: true,
          ring: false,
          notify: false
        });

        // Handle host media setup
        await setupHostMedia(newCall, userRole);
      } else {
        await newCall.join({ 
          create: false,
          ring: false,
          notify: false
        });
      }

      clearTimeout(initTimeoutRef.current!);
      setIsInitializing(false);
      
      // Return success - caller will handle the actual values
      
    } catch (error: any) {
      if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
      setError(error.message);
      setIsInitializing(false);
      setRetryCount(prev => prev + 1);
      throw error;
    }
  }, [streamId, userRole, isInitializing]);

  return {
    initialize,
    isInitializing,
    error,
    retryCount,
    reset
  };
};

// Helper function for host media setup
const setupHostMedia = async (call: any, userRole: string) => {
  try {
    const mediaTimeout = setTimeout(() => {
      // Media setup timeout - continue anyway
    }, 8000);

    const camPerm = await Camera.requestCameraPermissionsAsync();
    const micPerm = await Camera.requestMicrophonePermissionsAsync();

    if (camPerm.status === 'granted') {
      try {
        await Promise.race([
          call.camera.enable(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Camera timeout')), 5000))
        ]);

        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const cameraState = await call.camera.state;
        
        try {
          await call.camera.enable();
          
          if (userRole === 'host') {
            try {
              await call.goLive();
            } catch (goLiveErr: any) {
              // Continue without going live
            }
          }
        } catch (reEnableErr) {
          // Continue anyway
        }
      } catch (err: any) {
        // Continue without camera
      }
    }

    if (micPerm.status === 'granted') {
      await Promise.race([
        call.microphone.enable(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Mic timeout')), 5000))
      ]).catch((err) => {
        // Continue without microphone
      });
    }

    clearTimeout(mediaTimeout);
  } catch (permErr) {
    // Continue with initialization even on permission errors
  }
};