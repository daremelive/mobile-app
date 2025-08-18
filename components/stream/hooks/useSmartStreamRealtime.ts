import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { SmartRealtimeService } from '../../../src/services/SmartRealtimeService';

interface UseSmartStreamRealtimeProps {
  streamId: string;
  userId: string;
  enabled?: boolean;
}

interface StreamRealtimeData {
  newMessages: any[];
  viewerCount: number;
  participants: any[];
  gifts: any[];
}

export const useSmartStreamRealtime = ({
  streamId,
  userId,
  enabled = true
}: UseSmartStreamRealtimeProps) => {
  const serviceRef = useRef<SmartRealtimeService | null>(null);
  const [data, setData] = useState<StreamRealtimeData>({
    newMessages: [],
    viewerCount: 0,
    participants: [],
    gifts: []
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Optimized message handler - prevents re-renders
  const handleNewMessage = useCallback((message: any) => {
    setData(prev => ({
      ...prev,
      newMessages: [...prev.newMessages.slice(-49), message] // Keep last 50 messages
    }));
    setLastUpdate(new Date());
  }, []);

  // Optimized viewer count handler - only updates if changed
  const handleViewerUpdate = useCallback((count: number) => {
    setData(prev => {
      if (prev.viewerCount === count) return prev;
      return { ...prev, viewerCount: count };
    });
  }, []);

  // Optimized participant handler
  const handleParticipantUpdate = useCallback((participants: any[]) => {
    setData(prev => ({ ...prev, participants }));
  }, []);

  // Gift handler with animation trigger
  const handleGiftReceived = useCallback((gift: any) => {
    setData(prev => ({
      ...prev,
      gifts: [...prev.gifts.slice(-9), gift] // Keep last 10 gifts for animations
    }));
  }, []);

  // Initialize service
  useEffect(() => {
    if (!enabled || !streamId || !userId) return;

    const service = new SmartRealtimeService({
      streamId,
      userId,
      onNewMessage: handleNewMessage,
      onViewerUpdate: handleViewerUpdate,
      onParticipantUpdate: handleParticipantUpdate,
      onGiftReceived: handleGiftReceived
    });

    serviceRef.current = service;
    service.start();
    setIsConnected(true);

    return () => {
      service.stop();
      setIsConnected(false);
    };
  }, [streamId, userId, enabled, handleNewMessage, handleViewerUpdate, handleParticipantUpdate, handleGiftReceived]);

  // Handle app state changes for optimal performance
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (serviceRef.current) {
        serviceRef.current.onVisibilityChange(nextAppState === 'active');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  // Public methods for manual interaction
  const forceUpdate = useCallback(() => {
    serviceRef.current?.forceUpdate();
  }, []);

  const onUserInteraction = useCallback(() => {
    serviceRef.current?.onUserInteraction();
  }, []);

  // Clear new messages (call after processing)
  const clearNewMessages = useCallback(() => {
    setData(prev => ({ ...prev, newMessages: [] }));
  }, []);

  // Clear gifts (call after animations complete)
  const clearGifts = useCallback(() => {
    setData(prev => ({ ...prev, gifts: [] }));
  }, []);

  return {
    // Data
    newMessages: data.newMessages,
    viewerCount: data.viewerCount,
    participants: data.participants,
    gifts: data.gifts,
    
    // Status
    isConnected,
    lastUpdate,
    
    // Actions
    forceUpdate,
    onUserInteraction,
    clearNewMessages,
    clearGifts
  };
};
