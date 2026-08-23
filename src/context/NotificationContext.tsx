import React, { createContext, useContext } from 'react';
import { useNotificationWebSocket } from '../hooks/useNotificationWebSocket';
import { notificationApi, useGetNotificationStatsQuery } from '../api/notificationApi';
import { useDispatch, useSelector } from 'react-redux';
import { logger } from '../utils/logger';
import type { RootState } from '../store';

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
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  const {
    isConnected,
    stats: wsStats,
    connectionError,
    connect,
    disconnect,
    markAsRead,
    requestStats
  } = useNotificationWebSocket({
    onNewNotification: (notification) => {
      dispatch(notificationApi.util.invalidateTags(['InboxNotifications', 'NotificationStats']));
    },

    onNotificationUpdated: (notification) => {
      dispatch(notificationApi.util.invalidateTags(['InboxNotifications', 'NotificationStats']));
    },

    onNotificationDeleted: (notificationId) => {
      dispatch(notificationApi.util.invalidateTags(['InboxNotifications', 'NotificationStats']));
    },

    onNotificationsCleared: () => {
      dispatch(notificationApi.util.invalidateTags(['InboxNotifications', 'NotificationStats']));
    },

    onStatsUpdate: (stats) => {
      dispatch(notificationApi.util.invalidateTags(['NotificationStats']));
    },

    onError: (error) => {
      logger.error('[NotificationProvider] WebSocket error:', error);
    },

    autoConnect: isAuthenticated
  });

  // REST polling provides graceful recovery while the socket is disconnected.
  const { data: pollingStats } = useGetNotificationStatsQuery(undefined, {
    pollingInterval: isAuthenticated && !isConnected ? 30_000 : 0,
    skip: !isAuthenticated,
    refetchOnReconnect: true,
  });

  // Use WebSocket stats if connected, otherwise use polling stats
  const stats = isAuthenticated && isConnected
    ? wsStats
    : (pollingStats || { total_notifications: 0, unread_notifications: 0 });

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
