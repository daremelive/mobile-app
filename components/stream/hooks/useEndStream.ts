import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { useStreamActionMutation, streamsApi } from '../../../src/store/streamsApi';

interface UseEndStreamProps {
  streamId: string;
  onStreamEnd?: () => void;
}

export const useEndStream = ({ streamId, onStreamEnd }: UseEndStreamProps) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [streamAction] = useStreamActionMutation();
  
  const [isEndStreamModalVisible, setIsEndStreamModalVisible] = useState(false);
  const [isEndingStream, setIsEndingStream] = useState(false);

  const showEndStreamModal = useCallback(() => {
    setIsEndStreamModalVisible(true);
  }, []);

  const hideEndStreamModal = useCallback(() => {
    setIsEndStreamModalVisible(false);
  }, []);

  const handleEndStream = useCallback(async () => {
    if (!streamId || isEndingStream) return;

    setIsEndingStream(true);

    try {
      const response = await streamAction({ 
        streamId, 
        action: { action: 'end' } 
      }).unwrap();
      
      dispatch(streamsApi.util.invalidateTags(['Stream']));
      
      if (onStreamEnd) {
        onStreamEnd();
      }
      
      setIsEndStreamModalVisible(false);
      
      // Navigate away regardless of whether stream was already ended
      router.replace('/(tabs)/home');
      
    } catch (error: any) {
      console.error('Failed to end stream:', error);
      
      // Check if this is the "already ended" case - if so, treat as success
      const errorMessage = error?.data?.error || error?.data?.message || '';
      const isAlreadyEnded = errorMessage.toLowerCase().includes('already ended') || 
                           errorMessage.toLowerCase().includes('stream ended') ||
                           error?.status === 200;
      
      if (isAlreadyEnded) {
        setIsEndStreamModalVisible(false);
        
        if (onStreamEnd) {
          onStreamEnd();
        }
        
        // Navigate away since the stream is ended anyway
        router.replace('/(tabs)/home');
      } else {
        // Only show error for actual failures
        Alert.alert(
          'Error', 
          errorMessage || 'Failed to end stream. Please try again.'
        );
      }
    } finally {
      setIsEndingStream(false);
    }
  }, [streamId, isEndingStream, streamAction, dispatch, onStreamEnd, router]);

  return {
    isEndStreamModalVisible,
    isEndingStream,
    showEndStreamModal,
    hideEndStreamModal,
    handleEndStream,
  };
};
