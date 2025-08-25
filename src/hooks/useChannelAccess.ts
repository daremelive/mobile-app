import { useState } from 'react';
import { useGetUserStreamPrivilegesQuery } from '../api/levelsApi';

interface ChannelAccessInfo {
  canAccess: boolean;
  channelName: string;
  channelCode: string;
  requiredTier?: string;
  coinsNeeded?: number;
  unlockMessage?: string;
}

export const useChannelAccess = () => {
  const [accessModal, setAccessModal] = useState<{
    visible: boolean;
    channelInfo: ChannelAccessInfo | null;
  }>({
    visible: false,
    channelInfo: null
  });

  const { data: privileges } = useGetUserStreamPrivilegesQuery();

  const checkChannelAccess = (streamChannel: string): ChannelAccessInfo => {
    if (!privileges || !privileges.all_channels) {
      return {
        canAccess: false,
        channelName: 'Unknown Channel',
        channelCode: streamChannel,
        requiredTier: 'Premium',
        coinsNeeded: 0,
        unlockMessage: 'Unable to verify access. Please try again.'
      };
    }

    // Find the channel info
    const channel = privileges.all_channels.find(ch => ch.code === streamChannel);
    
    if (!channel) {
      return {
        canAccess: false,
        channelName: 'Unknown Channel',
        channelCode: streamChannel,
        requiredTier: 'Premium',
        coinsNeeded: 0,
        unlockMessage: 'Channel not found'
      };
    }

    return {
      canAccess: channel.is_accessible,
      channelName: channel.name,
      channelCode: channel.code,
      requiredTier: channel.unlock_tier,
      coinsNeeded: channel.coins_needed_to_unlock || 0,
      unlockMessage: channel.unlock_message || `Upgrade to ${channel.unlock_tier} to unlock`
    };
  };

  const requestChannelAccess = (streamChannel: string): boolean => {
    const accessInfo = checkChannelAccess(streamChannel);
    
    if (accessInfo.canAccess) {
      return true; // User has access, proceed
    }

    // Show upgrade modal
    setAccessModal({
      visible: true,
      channelInfo: accessInfo
    });
    
    return false; // Block access, show modal
  };

  const closeAccessModal = () => {
    setAccessModal({
      visible: false,
      channelInfo: null
    });
  };

  return {
    checkChannelAccess,
    requestChannelAccess,
    accessModal,
    closeAccessModal,
    currentCoins: privileges?.current_coins || 0,
    currentTier: privileges?.current_tier_display || 'Basic'
  };
};

export default useChannelAccess;
