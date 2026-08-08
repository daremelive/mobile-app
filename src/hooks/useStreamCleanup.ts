// STREAM CLEANUP SYSTEM COMPLETELY DISABLED
// This file maintains API compatibility while disabling all stream cleanup functionality
// to prevent streams from ending when the app is backgrounded or loses focus

/**
 * No-op. Kept so callers do not have to change while the cleanup system is
 * disabled; streams persist until the user ends them explicitly.
 */
export const useStreamCleanup = () => {
  // Intentionally empty.
};
