import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectAccessToken, selectCurrentUser } from '../store/authSlice';
import { WS_BASE_URL } from '../config/env';
import { logger } from '../utils/logger';

interface NotificationStats {
  total_notifications: number;
  unread_notifications: number;
}

interface NotificationWebSocketMessage {
  type: 'new_notification' | 'notification_updated' | 'notification_deleted' | 'notifications_cleared' | 'stats_update' | 'error';
  notification?: any;
  notification_id?: number;
  stats?: NotificationStats;
  message?: string;
}

interface UseNotificationWebSocketOptions {
  onNewNotification?: (notification: any, stats: NotificationStats) => void;
  onNotificationUpdated?: (notification: any, stats: NotificationStats) => void;
  onNotificationDeleted?: (notificationId: number, stats: NotificationStats) => void;
  onNotificationsCleared?: (stats: NotificationStats) => void;
  onStatsUpdate?: (stats: NotificationStats) => void;
  onError?: (error: string) => void;
  autoConnect?: boolean;
}

export const useNotificationWebSocket = (options: UseNotificationWebSocketOptions = {}) => {
  const {
    onNewNotification,
    onNotificationUpdated,
    onNotificationDeleted,
    onNotificationsCleared,
    onStatsUpdate,
    onError,
    autoConnect = true
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState<NotificationStats>({ total_notifications: 0, unread_notifications: 0 });
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const connectRef = useRef<() => Promise<void>>(async () => undefined);
  const callbacksRef = useRef({
    onNewNotification,
    onNotificationUpdated,
    onNotificationDeleted,
    onNotificationsCleared,
    onStatsUpdate,
    onError,
  });
  callbacksRef.current = {
    onNewNotification,
    onNotificationUpdated,
    onNotificationDeleted,
    onNotificationsCleared,
    onStatsUpdate,
    onError,
  };
  const maxReconnectAttempts = 5;

  const accessToken = useSelector(selectAccessToken);
  const currentUser = useSelector(selectCurrentUser);

  const connect = useCallback(async () => {
    if (!accessToken || !currentUser) {
      return;
    }

    try {
      // Use centralized WebSocket configuration
      const wsUrl = `${WS_BASE_URL.replace(/\/+$/, '')}/ws/notifications/?token=${encodeURIComponent(accessToken)}`;

      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: NotificationWebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'new_notification':
              if (message.notification && message.stats) {
                setStats(message.stats);
                callbacksRef.current.onNewNotification?.(message.notification, message.stats);
              }
              break;

            case 'notification_updated':
              if (message.notification && message.stats) {
                setStats(message.stats);
                callbacksRef.current.onNotificationUpdated?.(message.notification, message.stats);
              }
              break;

            case 'notification_deleted':
              if (message.notification_id && message.stats) {
                setStats(message.stats);
                callbacksRef.current.onNotificationDeleted?.(message.notification_id, message.stats);
              }
              break;

            case 'notifications_cleared':
              if (message.stats) {
                setStats(message.stats);
                callbacksRef.current.onNotificationsCleared?.(message.stats);
              }
              break;

            case 'stats_update':
              if (message.stats) {
                setStats(message.stats);
                callbacksRef.current.onStatsUpdate?.(message.stats);
              }
              break;

            case 'error':
              logger.error('[NotificationWS] Server error:', message.message);
              setConnectionError(message.message || 'Unknown server error');
              callbacksRef.current.onError?.(message.message || 'Unknown server error');
              break;
          }
        } catch (error) {
          logger.error('[NotificationWS] Error parsing message:', error);
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        wsRef.current = null;

        // If we get a 404 (WebSocket not supported), don't try to reconnect
        if (event.code === 1006 && event.reason?.includes('404')) {
          setConnectionError('WebSocket not supported - using polling fallback');
          return;
        }

        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            void connectRef.current();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        logger.error('[NotificationWS] WebSocket error:', error);
        setConnectionError('Connection error');
      };

    } catch (error) {
      logger.error('[NotificationWS] Failed to connect:', error);
      setConnectionError('Failed to connect');
    }
  }, [accessToken, currentUser]);

  connectRef.current = connect;

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    setIsConnected(false);
    reconnectAttempts.current = 0;
  }, []);

  const markAsRead = useCallback((notificationId: number) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify({
        type: 'mark_as_read',
        notification_id: notificationId
      }));
    }
  }, [isConnected]);

  const requestStats = useCallback(() => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify({
        type: 'get_stats'
      }));
    }
  }, [isConnected]);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    stats,
    connectionError,
    connect,
    disconnect,
    markAsRead,
    requestStats
  };
};
