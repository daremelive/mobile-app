import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/authSlice';
import { Stream, StreamHost } from '../store/streamsApi';

export type TierLevel = 'basic' | 'premium' | 'vip' | 'vvip';

interface TierAccessResult {
  canAccess: boolean;
  userTier: TierLevel | null;
  hostTier: TierLevel | null;
  reason?: string;
}

interface TierAccessOptions {
  requireExactMatch?: boolean; // If true, user must have exact same tier as host
  allowHigherTier?: boolean;   // If true, user with higher tier can access lower tier streams
}

/**
 * Custom hook for managing tier-based access control for streams
 * Provides modular tier checking functionality for viewer access restrictions
 */
export const useTierAccessControl = () => {
  const currentUser = useSelector(selectCurrentUser);

  /**
   * Check if the current user can access a stream based on tier levels
   */
  const checkStreamAccess = (
    stream: Stream | null,
    options: TierAccessOptions = { requireExactMatch: true, allowHigherTier: false }
  ): TierAccessResult => {
    // If no user is authenticated, deny access
    if (!currentUser) {
      return {
        canAccess: false,
        userTier: null,
        hostTier: null,
        reason: 'User not authenticated'
      };
    }

    // If no stream provided, deny access
    if (!stream) {
      return {
        canAccess: false,
        userTier: currentUser.vip_level,
        hostTier: null,
        reason: 'Stream not found'
      };
    }

    const userTier = currentUser.vip_level;
    const hostTier = stream.host.vip_level;

    // Define tier hierarchy for comparison
    const tierHierarchy: { [key in TierLevel]: number } = {
      basic: 1,
      premium: 2,
      vip: 3,
      vvip: 4
    };

    const userTierLevel = tierHierarchy[userTier];
    const hostTierLevel = tierHierarchy[hostTier];

    // Check access based on options
    if (options.requireExactMatch && !options.allowHigherTier) {
      // Strict mode: exact tier match required
      const canAccess = userTier === hostTier;
      return {
        canAccess,
        userTier,
        hostTier,
        reason: canAccess ? undefined : `Access requires ${hostTier} tier. Your tier: ${userTier}`
      };
    }

    if (options.allowHigherTier) {
      // Allow higher tier users to access lower tier streams
      const canAccess = userTierLevel >= hostTierLevel;
      return {
        canAccess,
        userTier,
        hostTier,
        reason: canAccess ? undefined : `Access requires ${hostTier} tier or higher. Your tier: ${userTier}`
      };
    }

    // Default behavior: exact match required
    const canAccess = userTier === hostTier;
    return {
      canAccess,
      userTier,
      hostTier,
      reason: canAccess ? undefined : `Access requires ${hostTier} tier. Your tier: ${userTier}`
    };
  };

  /**
   * Check access based on host information only
   */
  const checkHostAccess = (
    host: StreamHost | null,
    options: TierAccessOptions = { requireExactMatch: true, allowHigherTier: false }
  ): TierAccessResult => {
    if (!currentUser) {
      return {
        canAccess: false,
        userTier: null,
        hostTier: null,
        reason: 'User not authenticated'
      };
    }

    if (!host) {
      return {
        canAccess: false,
        userTier: currentUser.vip_level,
        hostTier: null,
        reason: 'Host not found'
      };
    }

    const userTier = currentUser.vip_level;
    const hostTier = host.vip_level;

    const tierHierarchy: { [key in TierLevel]: number } = {
      basic: 1,
      premium: 2,
      vip: 3,
      vvip: 4
    };

    const userTierLevel = tierHierarchy[userTier];
    const hostTierLevel = tierHierarchy[hostTier];

    if (options.allowHigherTier) {
      const canAccess = userTierLevel >= hostTierLevel;
      return {
        canAccess,
        userTier,
        hostTier,
        reason: canAccess ? undefined : `Access requires ${hostTier} tier or higher. Your tier: ${userTier}`
      };
    }

    const canAccess = userTier === hostTier;
    return {
      canAccess,
      userTier,
      hostTier,
      reason: canAccess ? undefined : `Access requires ${hostTier} tier. Your tier: ${userTier}`
    };
  };

  /**
   * Get user's current tier level
   */
  const getUserTier = (): TierLevel | null => {
    return currentUser?.vip_level || null;
  };

  /**
   * Compare two tier levels
   */
  const compareTiers = (tier1: TierLevel, tier2: TierLevel): 'higher' | 'lower' | 'equal' => {
    const tierHierarchy: { [key in TierLevel]: number } = {
      basic: 1,
      premium: 2,
      vip: 3,
      vvip: 4
    };

    const level1 = tierHierarchy[tier1];
    const level2 = tierHierarchy[tier2];

    if (level1 > level2) return 'higher';
    if (level1 < level2) return 'lower';
    return 'equal';
  };

  /**
   * Get tier display name with emoji
   */
  const getTierDisplayName = (tier: TierLevel): string => {
    const tierNames: { [key in TierLevel]: string } = {
      basic: '🥉 Basic',
      premium: '🥈 Premium',
      vip: '🥇 VIP',
      vvip: '💎 VVIP'
    };
    return tierNames[tier];
  };

  return {
    checkStreamAccess,
    checkHostAccess,
    getUserTier,
    compareTiers,
    getTierDisplayName,
    currentUserTier: currentUser?.vip_level || null
  };
};

export default useTierAccessControl;
