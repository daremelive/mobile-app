import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/authSlice';
import { Stream, StreamHost } from '../store/streamsApi';
import { useGetUserStreamPrivilegesQuery } from '../api/levelsApi';

export type TierLevel = 'basic' | 'premium' | 'vip' | 'vvip';

interface TierAccessResult {
  canAccess: boolean;
  userTier: TierLevel | null;
  hostTier: TierLevel | null;
  reason?: string;
  channelBasedAccess?: boolean; // NEW: indicates if access is granted due to channel privileges
}

interface TierAccessOptions {
  requireExactMatch?: boolean; // If true, user must have exact same tier as host
  allowHigherTier?: boolean;   // If true, user with higher tier can access lower tier streams
  checkChannelAccess?: boolean; // NEW: If true, check if user has channel access for hierarchical access
}

/**
 * Custom hook for managing tier-based access control for streams
 * Enhanced with channel-based hierarchical access
 */
export const useTierAccessControl = () => {
  const currentUser = useSelector(selectCurrentUser);
  const { data: privileges } = useGetUserStreamPrivilegesQuery();

  /**
   * Check if user has access to a specific channel
   */
  const hasChannelAccess = (channelCode: string): boolean => {
    if (!privileges || !privileges.all_channels) {
      return false;
    }

    const channel = privileges.all_channels.find(ch => ch.code === channelCode);
    return channel ? channel.is_accessible : false;
  };

  /**
   * Check if the current user can access a stream based on tier levels and channel access
   */
  const checkStreamAccess = (
    stream: Stream | null,
    options: TierAccessOptions = { 
      requireExactMatch: true, 
      allowHigherTier: false,
      checkChannelAccess: true 
    }
  ): TierAccessResult => {
    // If no user is authenticated, deny access
    if (!currentUser) {
      return {
        canAccess: false,
        userTier: null,
        hostTier: null,
        reason: 'User not authenticated',
        channelBasedAccess: false
      };
    }

    // If no stream provided, deny access
    if (!stream) {
      return {
        canAccess: false,
        userTier: currentUser.vip_level,
        hostTier: null,
        reason: 'Stream not found',
        channelBasedAccess: false
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

    // First check traditional tier-based access
    let traditionalAccess = false;
    
    if (options.requireExactMatch && !options.allowHigherTier) {
      traditionalAccess = userTier === hostTier;
    } else if (options.allowHigherTier) {
      traditionalAccess = userTierLevel >= hostTierLevel;
    } else {
      traditionalAccess = userTier === hostTier;
    }

    // If traditional access is granted, allow
    if (traditionalAccess) {
      return {
        canAccess: true,
        userTier,
        hostTier,
        channelBasedAccess: false
      };
    }

    // NEW: Check channel-based hierarchical access
    if (options.checkChannelAccess && stream.channel) {
      const userHasChannelAccess = hasChannelAccess(stream.channel);
      
      // If user has channel access and host tier is higher, grant access
      if (userHasChannelAccess && hostTierLevel > userTierLevel) {
        return {
          canAccess: true,
          userTier,
          hostTier,
          reason: `Channel access granted for ${stream.channel}`,
          channelBasedAccess: true
        };
      }
    }

    // Access denied
    return {
      canAccess: false,
      userTier,
      hostTier,
      reason: `Access requires ${hostTier} tier or higher. Your tier: ${userTier}`,
      channelBasedAccess: false
    };
  };

  /**
   * Check access based on host information only with channel consideration
   */
  const checkHostAccess = (
    host: StreamHost | null,
    options: TierAccessOptions = { 
      requireExactMatch: true, 
      allowHigherTier: false,
      checkChannelAccess: true 
    },
    channelCode?: string
  ): TierAccessResult => {
    if (!currentUser) {
      return {
        canAccess: false,
        userTier: null,
        hostTier: null,
        reason: 'User not authenticated',
        channelBasedAccess: false
      };
    }

    if (!host) {
      return {
        canAccess: false,
        userTier: currentUser.vip_level,
        hostTier: null,
        reason: 'Host not found',
        channelBasedAccess: false
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

    // First check traditional tier-based access
    let traditionalAccess = false;
    
    if (options.allowHigherTier) {
      traditionalAccess = userTierLevel >= hostTierLevel;
    } else {
      traditionalAccess = userTier === hostTier;
    }

    // If traditional access is granted, allow
    if (traditionalAccess) {
      return {
        canAccess: true,
        userTier,
        hostTier,
        channelBasedAccess: false
      };
    }

    // NEW: Check channel-based hierarchical access if channel is provided
    if (options.checkChannelAccess && channelCode) {
      const userHasChannelAccess = hasChannelAccess(channelCode);
      
      // If user has channel access and host tier is higher, grant access
      if (userHasChannelAccess && hostTierLevel > userTierLevel) {
        return {
          canAccess: true,
          userTier,
          hostTier,
          reason: `Channel access granted for ${channelCode}`,
          channelBasedAccess: true
        };
      }
    }

    // Access denied
    return {
      canAccess: false,
      userTier,
      hostTier,
      reason: `Access requires ${hostTier} tier or higher. Your tier: ${userTier}`,
      channelBasedAccess: false
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

  /** Get the customer-facing tier name. */
  const getTierDisplayName = (tier: TierLevel): string => {
    const tierNames: { [key in TierLevel]: string } = {
      basic: 'Basic',
      premium: 'Premium',
      vip: 'VIP',
      vvip: 'VVIP'
    };
    return tierNames[tier];
  };

  return {
    checkStreamAccess,
    checkHostAccess,
    getUserTier,
    compareTiers,
    getTierDisplayName,
    hasChannelAccess, // NEW: Expose channel access check
    currentUserTier: currentUser?.vip_level || null
  };
};

export default useTierAccessControl;
