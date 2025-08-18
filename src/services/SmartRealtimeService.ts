/**
 * Professional Real-time Service without WebSockets
 * Optimized for award-winning user experience
 */
import React from 'react';

interface RealtimeConfig {
  streamId: string;
  userId: string;
  onNewMessage?: (message: any) => void;
  onViewerUpdate?: (count: number) => void;
  onParticipantUpdate?: (participants: any[]) => void;
  onGiftReceived?: (gift: any) => void;
}

export class SmartRealtimeService {
  private config: RealtimeConfig;
  private isActive = false;
  private lastMessageId: number | null = null;
  private lastViewerCount: number = 0;
  private lastParticipantHash: string = '';
  private pollTimeout: ReturnType<typeof setTimeout> | null = null;
  
  // Intelligent polling intervals based on user activity
  private readonly ACTIVE_POLL_INTERVAL = 2000; // 2 seconds when user is actively viewing
  private readonly BACKGROUND_POLL_INTERVAL = 10000; // 10 seconds when in background
  private readonly INACTIVE_POLL_INTERVAL = 30000; // 30 seconds when inactive
  
  // UX optimization flags
  private isUserInteracting = true;
  private lastInteractionTime = Date.now();
  private visibilityState: 'visible' | 'hidden' = 'visible';

  constructor(config: RealtimeConfig) {
    this.config = config;
    this.setupVisibilityDetection();
    this.setupInteractionDetection();
  }

  /**
   * Start intelligent polling based on user activity
   */
  start() {
    if (this.isActive) return;
    
    this.isActive = true;
    this.startSmartPolling();
    console.log('🟢 Smart Realtime Service started');
  }

  /**
   * Stop all polling
   */
  stop() {
    this.isActive = false;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
    console.log('🔴 Smart Realtime Service stopped');
  }

  /**
   * Intelligent polling that adapts to user behavior
   */
  private startSmartPolling() {
    const poll = async () => {
      if (!this.isActive) return;

      const interval = this.getOptimalPollInterval();
      
      try {
        await this.fetchUpdates();
      } catch (error) {
        console.error('❌ Smart polling error:', error);
      }

      // Schedule next poll with dynamic interval
      if (this.isActive) {
        this.pollTimeout = setTimeout(poll, interval);
      }
    };

    // Start first poll immediately
    poll();
  }

  /**
   * Calculate optimal polling interval based on user activity
   */
  private getOptimalPollInterval(): number {
    const timeSinceLastInteraction = Date.now() - this.lastInteractionTime;
    
    // App is hidden or minimized
    if (this.visibilityState === 'hidden') {
      return this.BACKGROUND_POLL_INTERVAL;
    }
    
    // User is actively interacting (typing, scrolling, etc.)
    if (this.isUserInteracting && timeSinceLastInteraction < 5000) {
      return this.ACTIVE_POLL_INTERVAL;
    }
    
    // User has been inactive for a while
    if (timeSinceLastInteraction > 30000) {
      return this.INACTIVE_POLL_INTERVAL;
    }
    
    // Default active polling
    return this.ACTIVE_POLL_INTERVAL;
  }

  /**
   * Fetch only incremental updates to minimize data and re-renders
   */
  private async fetchUpdates() {
    try {
      // Fetch only new messages since last known message
      const messagesResponse = await fetch(
        `/api/streams/${this.config.streamId}/messages/?since=${this.lastMessageId || 0}&limit=10`,
        { headers: this.getAuthHeaders() }
      );
      
      if (messagesResponse.ok) {
        const newMessages = await messagesResponse.json();
        this.processNewMessages(newMessages);
      }

      // Fetch lightweight stream stats (viewer count, participant count)
      const statsResponse = await fetch(
        `/api/streams/${this.config.streamId}/stats/`,
        { headers: this.getAuthHeaders() }
      );
      
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        this.processStatsUpdate(stats);
      }

    } catch (error) {
      console.error('Failed to fetch updates:', error);
    }
  }

  /**
   * Process new messages without causing re-renders of entire chat
   */
  private processNewMessages(messages: any[]) {
    if (!messages.length) return;

    const trulyNewMessages = messages.filter(msg => 
      !this.lastMessageId || msg.id > this.lastMessageId
    );

    if (trulyNewMessages.length > 0) {
      this.lastMessageId = Math.max(...trulyNewMessages.map(m => m.id));
      
      // Process each message individually to avoid batch re-renders
      trulyNewMessages.forEach(message => {
        // Throttle callbacks to prevent overwhelming the UI
        this.throttledCallback(() => {
          if (message.message_type === 'gift') {
            this.config.onGiftReceived?.(message.gift);
          } else {
            this.config.onNewMessage?.(message);
          }
        });
      });
    }
  }

  /**
   * Process stats updates only if values actually changed
   */
  private processStatsUpdate(stats: any) {
    // Only trigger updates if values actually changed
    if (stats.viewer_count !== this.lastViewerCount) {
      this.lastViewerCount = stats.viewer_count;
      this.config.onViewerUpdate?.(stats.viewer_count);
    }

    // Check for participant changes using hash comparison
    const participantHash = this.hashParticipants(stats.participants || []);
    if (participantHash !== this.lastParticipantHash) {
      this.lastParticipantHash = participantHash;
      this.config.onParticipantUpdate?.(stats.participants || []);
    }
  }

  /**
   * Throttled callback execution to prevent UI overwhelming
   */
  private callbackQueue: (() => void)[] = [];
  private isProcessingCallbacks = false;

  private throttledCallback(callback: () => void) {
    this.callbackQueue.push(callback);
    
    if (!this.isProcessingCallbacks) {
      this.isProcessingCallbacks = true;
      
      // Process callbacks in next tick to batch updates
      setTimeout(() => {
        const callbacks = [...this.callbackQueue];
        this.callbackQueue = [];
        
        // Execute all callbacks in a single batch
        callbacks.forEach(cb => cb());
        
        this.isProcessingCallbacks = false;
      }, 100); // 100ms batching window
    }
  }

  /**
   * Create hash of participants to detect changes efficiently
   */
  private hashParticipants(participants: any[]): string {
    return participants
      .map(p => `${p.id}-${p.participant_type}-${p.is_active}`)
      .sort()
      .join('|');
  }

  /**
   * Setup app visibility detection for background optimization
   */
  private setupVisibilityDetection() {
    // This would be implemented differently in React Native
    // For now, we'll track it manually through app state changes
  }

  /**
   * Track user interaction to optimize polling frequency
   */
  private setupInteractionDetection() {
    // This should be called whenever user interacts with the stream
    // (typing, scrolling, tapping, etc.)
  }

  /**
   * Public method to signal user interaction
   */
  public onUserInteraction() {
    this.lastInteractionTime = Date.now();
    this.isUserInteracting = true;
    
    // Reset interaction flag after 5 seconds
    setTimeout(() => {
      this.isUserInteracting = false;
    }, 5000);
  }

  /**
   * Public method to signal app visibility change
   */
  public onVisibilityChange(visible: boolean) {
    this.visibilityState = visible ? 'visible' : 'hidden';
    
    if (visible) {
      // App became visible - do a quick refresh
      this.lastInteractionTime = Date.now();
      this.isUserInteracting = true;
    }
  }

  /**
   * Force immediate update (for pull-to-refresh)
   */
  public async forceUpdate() {
    if (!this.isActive) return;
    
    try {
      await this.fetchUpdates();
    } catch (error) {
      console.error('Force update failed:', error);
    }
  }

  private getAuthHeaders() {
    // Implement auth headers
    return {
      'Authorization': `Bearer ${this.getAuthToken()}`,
      'Content-Type': 'application/json'
    };
  }

  private getAuthToken(): string {
    // Implement token retrieval
    return '';
  }
}

/**
 * React Hook for Smart Realtime Integration
 */
export const useSmartRealtime = (config: RealtimeConfig) => {
  const serviceRef = React.useRef<SmartRealtimeService | null>(null);

  React.useEffect(() => {
    serviceRef.current = new SmartRealtimeService(config);
    serviceRef.current.start();

    return () => {
      serviceRef.current?.stop();
    };
  }, [config.streamId]);

  return {
    forceUpdate: () => serviceRef.current?.forceUpdate(),
    onUserInteraction: () => serviceRef.current?.onUserInteraction(),
    onVisibilityChange: (visible: boolean) => serviceRef.current?.onVisibilityChange(visible)
  };
};
