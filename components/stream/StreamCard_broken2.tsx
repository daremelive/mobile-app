import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ImageBackground, Alert } from 'react-native';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../src/store/authSlice';
import { StreamHost } from '../../src/store/streamsApi';
import EyeIcon from '../../assets/icons/eye.svg';
import ProfileAvatar from '../ui/ProfileAvatar';
import useChannelAccess from '../../src/hooks/useChannelAccess';
import { useTierAccessControl, TierLevel } from '../../src/hooks/useTierAccessControl';
import TierAccessModal from '../modals/TierAccessModal';

interface StreamCardProps {
  id: string;
  title: string;
  host: StreamHost;
  channel: string;
  viewer_count?: number;
  status?: string;
  baseURL: string;
  onPress?: () => void;
  width?: string; // Tailwind width class, default "w-[48%]"
  height?: string; // Tailwind height class, default "h-[250px]"
}

const StreamCard: React.FC<StreamCardProps> = ({
  id,
  title,
  host,
  channel,
  viewer_count = 0,
  status,
  baseURL,
  onPress,
  width = 'w-[48%]',
  height = 'h-[250px]'
}) => {
  const currentUser = useSelector(selectCurrentUser);
  const { requestChannelAccess } = useChannelAccess();
  const { checkHostAccess, getTierDisplayName } = useTierAccessControl();
  const [tierModalVisible, setTierModalVisible] = useState(false);

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    console.log('🔍 StreamCard pressed - checking access...');
    console.log('User tier:', (currentUser as any)?.vip_level);
    console.log('Host tier:', host.vip_level);

    // First check tier access - user must have equal or higher tier than host
    const tierAccessResult = checkHostAccess(host, { allowHigherTier: true, requireExactMatch: false });
    
    console.log('🔍 Tier access check:', {
      userTier: (currentUser as any)?.vip_level,
      hostTier: host.vip_level,
      canAccess: tierAccessResult.canAccess,
      reason: tierAccessResult.reason
    });
    
    if (!tierAccessResult.canAccess) {
      // Show tier access modal immediately for lower tier users
      console.log('🚫 Tier access denied - showing upgrade modal');
      setTierModalVisible(true);
      return;
    }

    // If tier access is granted, then check channel access
    const hasChannelAccess = requestChannelAccess(channel);
    
    if (!hasChannelAccess) {
      console.log(`🔒 Access denied for ${channel} channel. Showing upgrade modal.`);
      return;
    }

    // User has both tier and channel access - proceed with confirmation
    console.log('✅ All access checks passed - showing join confirmation');
    Alert.alert(
      'Join Live Stream',
      `Join ${host.username || host.first_name || 'Unknown Host'}'s stream: "${title}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Join',
          onPress: () => {
            console.log(`✅ Joining ${channel} stream: ${id}`);
            router.push({
              pathname: '/stream/viewer',
              params: { 
                streamId: id,
                hostUsername: host.username || host.first_name || 'Unknown Host',
                streamTitle: title
              }
            });
          },
        },
      ]
    );
  };

  const formatViewerCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const getTierBadgeInfo = (tier: TierLevel) => {
    switch (tier) {
      case 'basic':
        return { emoji: '🥉', color: 'bg-gray-600' };
      case 'premium':
        return { emoji: '🥈', color: 'bg-blue-600' };
      case 'vip':
        return { emoji: '🥇', color: 'bg-purple-600' };
      case 'vvip':
        return { emoji: '💎', color: 'bg-yellow-600' };
      default:
        return { emoji: '🥉', color: 'bg-gray-600' };
    }
  };

  const tierBadge = getTierBadgeInfo(host.vip_level);
  const userCanAccess = currentUser ? 
    checkHostAccess(host, { allowHigherTier: true, requireExactMatch: false }).canAccess : 
    false;

  const profileImageUrl = host.profile_picture_url?.startsWith('http') 
    ? host.profile_picture_url 
    : host.profile_picture_url 
      ? `${baseURL}${host.profile_picture_url}`
      : null;

  return (
    <>
      <TouchableOpacity 
        className={`${width} ${height} rounded-2xl overflow-hidden mb-4`}
        onPress={handlePress}
      >
        {profileImageUrl ? (
          <ImageBackground 
            source={{ uri: profileImageUrl }} 
            className="w-full h-full justify-between"
          >
            {/* Viewer count, live status, and tier badge */}
            <View className="items-end p-2">
              <View className="bg-black/60 px-3 py-1.5 rounded-full flex-row items-center gap-1 mb-2">
                <EyeIcon width={16} height={16} stroke="#FFFFFF" className="mr-1.5" />
                <Text className="text-white text-xs font-semibold">
                  {formatViewerCount(viewer_count)}
                </Text>
              </View>
              
              {/* Tier Badge */}
              <View className={`${tierBadge.color} px-2 py-1 rounded-full mb-1 ${!userCanAccess ? 'border border-red-400' : ''}`}>
                <Text className="text-white text-xs font-bold">
                  {tierBadge.emoji}
                </Text>
              </View>
              
              {status === 'live' && (
                <View className="bg-red-600 px-2 py-1 rounded-full">
                  <Text className="text-white text-xs font-bold">LIVE</Text>
                </View>
              )}
            </View>
            
            {/* Title and host info */}
            <BlurView
              intensity={30}
              tint="dark"
              className="absolute bottom-0 left-0 right-0 px-4 py-4 bg-black/30"
            >
              <Text className="text-white text-base font-bold mb-2" numberOfLines={2}>
                {title}
              </Text>
              <Text className="text-gray-300 text-sm">
                @{host.username || host.first_name || 'User'}
              </Text>
            </BlurView>
          </ImageBackground>
        ) : (
          <View className="w-full h-full justify-between relative">
            <ProfileAvatar
              profilePictureUrl={null}
              username={host.username}
              firstName={host.first_name}
              lastName={host.last_name}
              size="full"
              className="absolute inset-0"
              baseURL={baseURL}
            />
            
            {/* Viewer count, live status, and tier badge */}
            <View className="items-end p-2 relative z-10">
              <View className="bg-black/60 px-3 py-1.5 rounded-full flex-row items-center gap-1 mb-2">
                <EyeIcon width={16} height={16} stroke="#FFFFFF" className="mr-1.5" />
                <Text className="text-white text-xs font-semibold">
                  {formatViewerCount(viewer_count)}
                </Text>
              </View>
              
              {/* Tier Badge */}
              <View className={`${tierBadge.color} px-2 py-1 rounded-full mb-1 ${!userCanAccess ? 'border border-red-400' : ''}`}>
                <Text className="text-white text-xs font-bold">
                  {tierBadge.emoji}
                </Text>
              </View>
              
              {status === 'live' && (
                <View className="bg-red-600 px-2 py-1 rounded-full">
                  <Text className="text-white text-xs font-bold">LIVE</Text>
                </View>
              )}
            </View>
            
            {/* Title and host info */}
            <BlurView
              intensity={30}
              tint="dark"
              className="absolute bottom-0 left-0 right-0 px-4 py-4 bg-black/30 z-10"
            >
              <Text className="text-white text-base font-bold mb-2" numberOfLines={2}>
                {title}
              </Text>
              <Text className="text-gray-300 text-sm">
                @{host.username || host.first_name || 'User'}
              </Text>
            </BlurView>
          </View>
        )}
      </TouchableOpacity>

      {/* Tier Access Modal */}
      <TierAccessModal
        visible={tierModalVisible}
        onClose={() => setTierModalVisible(false)}
        userTier={(currentUser as any)?.vip_level || 'basic'}
        requiredTier={host.vip_level}
        hostName={host.username || host.first_name || 'Unknown Host'}
        streamTitle={title}
      />
    </>
  );
};

export default StreamCard;
