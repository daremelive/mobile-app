import React from 'react';
import { View, Text, TouchableOpacity, ImageBackground, Alert } from 'react-native';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import EyeIcon from '../../assets/icons/eye.svg';
import ProfileAvatar from '../ui/ProfileAvatar';
import useChannelAccess from '../../src/hooks/useChannelAccess';

interface StreamHost {
  id: string | number;
  username: string;
  first_name?: string;
  last_name?: string;
  profile_picture_url?: string | null;
}

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
  const { requestChannelAccess } = useChannelAccess();

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    // Default behavior: channel access check and navigation
    const hasAccess = requestChannelAccess(channel);
    
    if (!hasAccess) {
      console.log(`🔒 Access denied for ${channel} channel. Showing upgrade modal.`);
      return;
    }

    // User has access - proceed with confirmation
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

  const profileImageUrl = host.profile_picture_url?.startsWith('http') 
    ? host.profile_picture_url 
    : host.profile_picture_url 
      ? `${baseURL}${host.profile_picture_url}`
      : null;

  return (
    <TouchableOpacity 
      className={`${width} ${height} rounded-2xl overflow-hidden mb-4`}
      onPress={handlePress}
    >
      {profileImageUrl ? (
        <ImageBackground 
          source={{ uri: profileImageUrl }} 
          className="w-full h-full justify-between"
        >
          {/* Viewer count and live status */}
          <View className="items-end p-2">
            <View className="bg-black/60 px-3 py-1.5 rounded-full flex-row items-center gap-1">
              <EyeIcon width={16} height={16} stroke="#FFFFFF" className="mr-1.5" />
              <Text className="text-white text-xs font-semibold">
                {formatViewerCount(viewer_count)}
              </Text>
            </View>
            {status === 'live' && (
              <View className="bg-red-600 px-2 py-1 rounded-full mt-1">
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
          
          {/* Viewer count and live status */}
          <View className="items-end p-2 relative z-10">
            <View className="bg-black/60 px-3 py-1.5 rounded-full flex-row items-center gap-1">
              <EyeIcon width={16} height={16} stroke="#FFFFFF" className="mr-1.5" />
              <Text className="text-white text-xs font-semibold">
                {formatViewerCount(viewer_count)}
              </Text>
            </View>
            {status === 'live' && (
              <View className="bg-red-600 px-2 py-1 rounded-full mt-1">
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
  );
};

export default StreamCard;
