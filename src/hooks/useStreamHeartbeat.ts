import { logger } from '../utils/logger';
// HEARTBEAT SYSTEM COMPLETELY DISABLED
// This file maintains API compatibility while disabling all heartbeat functionality
// to prevent streams from ending when the app is backgrounded or loses focus

export const useStreamHeartbeat = (streamId: string | null, isActive: boolean = false) => {
  // HEARTBEAT SYSTEM COMPLETELY DISABLED
  // This prevents streams from ending when the app is backgrounded or loses focus
  
  // Return a no-op function to maintain API compatibility
  return {
    sendHeartbeat: async () => {
      // No-op: Heartbeat system is disabled
      logger.log('Heartbeat system is disabled - no action taken');
    }
  };
};
