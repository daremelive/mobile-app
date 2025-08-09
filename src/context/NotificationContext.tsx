import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNotificationWebSocket } from '../hooks/useNotificationWebSocket';
import { notificationApi, useGetNotificationStatsQuery } from '../api/notificationApi';
import { useDispatch } from 'react-redux';

interface NotificationContextType {
  isConnected: boolean;
  stats: {
    total_notifications: number;
    unread_notifications: number;
  };
  connectionError: string | null;
  connect: () => void;
  disconnect: () => void;
  markAsRead: (notificationId: number) => void;
  requestStats: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const dispatch = useDispatch();
  const [lastNotificationId, setLastNotificationId] = useState<number | null>(null);
  const [usingPollingFallback, setUsingPollingFallback] = useState(false);

  // Fallback polling for notification stats when WebSocket isn't available
  const { data: pollingStats } = useGetNotificationStatsQuery(undefined, {
    pollingInterval: usingPollingFallback ? 5000 : 0, // Poll every 5 seconds when WebSocket unavailable
    skip: !usingPollingFallback
  });

  const {
    isConnected,
    stats: wsStats,
    connectionError,
    connect,
    disconnect,
    markAsRead,
    requestStats
  } = useNotificationWebSocket({
    onNewNotification: (notification, newStats) => {
      console.log('🔔 [NotificationProvider] New notification received:', notification);
      
      // Prevent duplicate notifications by checking ID
      if (lastNotificationId !== notification.id) {
        setLastNotificationId(notification.id);
        
        // Invalidate the inbox notifications cache to trigger a refetch
        dispatch(notificationApi.util.invalidateTags(['InboxNotifications', 'NotificationStats']));
      }
    },
    
    onNotificationUpdated: (notification, newStats) => {
      console.log('📝 [NotificationProvider] Notification updated:', notification);
      dispatch(notificationApi.util.invalidateTags(['InboxNotifications', 'NotificationStats']));
    },
    
    onNotificationDeleted: (notificationId, newStats) => {
      console.log('🗑️ [NotificationProvider] Notification deleted:', notificationId);
      dispatch(notificationApi.util.invalidateTags(['InboxNotifications', 'NotificationStats']));
    },
    
    onNotificationsCleared: (newStats) => {
      console.log('🧹 [NotificationProvider] All notifications cleared');
      dispatch(notificationApi.util.invalidateTags(['InboxNotifications', 'NotificationStats']));
    },
    
    onStatsUpdate: (newStats) => {
      console.log('📊 [NotificationProvider] Stats updated:', newStats);
      dispatch(notificationApi.util.invalidateTags(['NotificationStats']));
    },
    
    onError: (error) => {
      console.error('❌ [NotificationProvider] WebSocket error:', error);
      // Enable polling fallback if WebSocket fails
      if (error.includes('WebSocket not supported') || error.includes('404')) {
        console.log('🔄 [NotificationProvider] Enabling polling fallback');
        setUsingPollingFallback(true);
      }
    },
    
    autoConnect: true
  });

  // Use WebSocket stats if connected, otherwise use polling stats
  const stats = isConnected ? wsStats : (pollingStats || { total_notifications: 0, unread_notifications: 0 });

  const value: NotificationContextType = {
    isConnected,
    stats,
    connectionError,
    connect,
    disconnect,
    markAsRead,
    requestStats
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
