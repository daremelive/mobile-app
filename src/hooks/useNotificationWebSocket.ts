import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectAccessToken, selectCurrentUser } from '../store/authSlice';
import IPDetector from '../utils/ipDetector';

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
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  
  const accessToken = useSelector(selectAccessToken);
  const currentUser = useSelector(selectCurrentUser);

  const connect = async () => {
    if (!accessToken || !currentUser) {
      console.log('🔗 [NotificationWS] Cannot connect: missing auth token or user');
      return;
    }

    try {
      // Always use IP detector - get dynamic IP with production domain support
      let wsUrl = 'wss://daremelive.pythonanywhere.com/ws/notifications/'; // Production fallback
      
      try {
        const detectionResult = await IPDetector.detectIP();
        // Check if it's production domain or local IP
        if (detectionResult.ip === 'daremelive.pythonanywhere.com') {
          wsUrl = `wss://${detectionResult.ip}/ws/notifications/`;
        } else {
          wsUrl = `ws://${detectionResult.ip}:8000/ws/notifications/`;
        }
        console.log('🔗 [NotificationWS] Using detected WebSocket URL:', wsUrl);
      } catch (error) {
        console.error('❌ [NotificationWS] IP detection failed, using fallback:', error);
      }

      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ [NotificationWS] Connected to notification WebSocket');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        
        // Send authentication
        ws.send(JSON.stringify({
          type: 'authenticate',
          token: accessToken
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: NotificationWebSocketMessage = JSON.parse(event.data);
          console.log('📨 [NotificationWS] Received message:', message);

          switch (message.type) {
            case 'new_notification':
              if (message.notification && message.stats) {
                setStats(message.stats);
                onNewNotification?.(message.notification, message.stats);
              }
              break;
              
            case 'notification_updated':
              if (message.notification && message.stats) {
                setStats(message.stats);
                onNotificationUpdated?.(message.notification, message.stats);
              }
              break;
              
            case 'notification_deleted':
              if (message.notification_id && message.stats) {
                setStats(message.stats);
                onNotificationDeleted?.(message.notification_id, message.stats);
              }
              break;
              
            case 'notifications_cleared':
              if (message.stats) {
                setStats(message.stats);
                onNotificationsCleared?.(message.stats);
              }
              break;
              
            case 'stats_update':
              if (message.stats) {
                setStats(message.stats);
                onStatsUpdate?.(message.stats);
              }
              break;
              
            case 'error':
              console.error('❌ [NotificationWS] Server error:', message.message);
              setConnectionError(message.message || 'Unknown server error');
              onError?.(message.message || 'Unknown server error');
              break;
          }
        } catch (error) {
          console.error('❌ [NotificationWS] Error parsing message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 [NotificationWS] Connection closed:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // If we get a 404 (WebSocket not supported), don't try to reconnect
        if (event.code === 1006 && event.reason?.includes('404')) {
          console.log('⚠️ [NotificationWS] WebSocket not supported on server, falling back to polling');
          setConnectionError('WebSocket not supported - using polling fallback');
          return;
        }

        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`🔄 [NotificationWS] Reconnecting in ${delay}ms... (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay) as any;
        }
      };

      ws.onerror = (error) => {
        console.error('❌ [NotificationWS] WebSocket error:', error);
        setConnectionError('Connection error');
      };

    } catch (error) {
      console.error('❌ [NotificationWS] Failed to connect:', error);
      setConnectionError('Failed to connect');
    }
  };

  const disconnect = () => {
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
  };

  const markAsRead = (notificationId: number) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify({
        type: 'mark_as_read',
        notification_id: notificationId
      }));
    }
  };

  const requestStats = () => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify({
        type: 'get_stats'
      }));
    }
  };

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [accessToken, currentUser, autoConnect]);

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
