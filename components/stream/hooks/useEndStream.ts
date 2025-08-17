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
      await streamAction({ 
        streamId, 
        action: { action: 'end' } 
      }).unwrap();
      
      dispatch(streamsApi.util.invalidateTags(['Stream']));
      
      if (onStreamEnd) {
        onStreamEnd();
      }
      
      setIsEndStreamModalVisible(false);
      
      router.replace('/(tabs)/home');
      
    } catch (error: any) {
      console.error('Failed to end stream:', error);
      Alert.alert(
        'Error', 
        error?.data?.error || 'Failed to end stream. Please try again.'
      );
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
