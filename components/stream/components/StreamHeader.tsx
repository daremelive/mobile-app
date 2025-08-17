import React from 'react';
import { View, Text, Image, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

interface StreamHeaderProps {
  streamTitle?: string;            // e.g. "Marriage Sacrifices"
  hostName?: string;               // Full display name (optional - will be computed from first/last name)
  hostFirstName?: string;          // Host's first name
  hostLastName?: string;           // Host's last name
  hostUsername?: string;           // Username (without @)
  hostProfilePicture?: string;
  viewerCount?: number;
  likesCount?: number;
  isFollowing?: boolean;
  disableFollow?: boolean;
  onToggleFollow?: () => void;
  onShare?: () => void;
  onClose?: () => void;
  onBack?: () => void;
  showBackButton?: boolean;
  showCloseButton?: boolean;
}

export const StreamHeader = ({
  streamTitle,
  hostName,
  hostFirstName,
  hostLastName,
  hostUsername,
  hostProfilePicture,
  viewerCount = 0,
  likesCount = 0,
  isFollowing = false,
  disableFollow = false,
  onToggleFollow,
  onShare,
  onClose,
  onBack,
  showBackButton = false,
  showCloseButton = true,
}: StreamHeaderProps) => {
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, 10) + 8; // ensure visible gap below notch

  // Compute the display name from available data
  const displayName = hostName || 
    (hostFirstName && hostLastName ? `${hostFirstName} ${hostLastName}` : 
     hostFirstName || hostLastName || hostUsername || 'Host');

  return (
    <View className="absolute left-0 right-0 z-10" style={{ top: 0 }}>
      <View className="px-3" style={{ paddingTop: topPad }}>
        <View className="flex-row items-center">
          {/* Header Pill now spans full width */}
            <View className="flex-row items-center bg-black/45 rounded-full pr-3 pl-2 py-2 flex-1 mr-2">
              {/* Avatar */}
              <View className="w-12 h-12 rounded-full overflow-hidden bg-gray-600 mr-3">
                {hostProfilePicture ? (
                  <Image source={{ uri: hostProfilePicture }} className="w-full h-full" />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Ionicons name="person" size={22} color="white" />
                  </View>
                )}
              </View>
              {/* Names */}
              <View className="mr-2 flex-1">
                <Text className="text-white font-semibold text-base" numberOfLines={1}>
                  {displayName}
                </Text>
                {hostUsername && (
                  <Text className="text-white/70 text-sm" numberOfLines={1}>@{hostUsername}</Text>
                )}
              </View>
              {/* Follow Button */}
              {onToggleFollow && !disableFollow && (
                <TouchableOpacity
                  onPress={onToggleFollow}
                  className={`px-4 h-9 rounded-full items-center justify-center mr-2 ${isFollowing ? 'bg-white/90' : 'bg-white'}`}
                  disabled={disableFollow}
                >
                  <Text className={`text-xs font-semibold ${isFollowing ? 'text-black/50' : 'text-black'}`}>{isFollowing ? 'Following' : 'Follow'}</Text>
                </TouchableOpacity>
              )}
              {/* Share */}
              {onShare && (
                <TouchableOpacity onPress={onShare} className="w-9 h-9 rounded-full bg-white items-center justify-center">
                  <Ionicons 
                    name={Platform.OS === 'ios' ? 'share-outline' : 'share-social'} 
                    size={18} 
                    color="#000" 
                  />
                </TouchableOpacity>
              )}
            </View>
            {/* Close button outside the pill */}
            {showCloseButton && onClose && (
              <TouchableOpacity onPress={onClose} className="w-12 h-12 items-center justify-center ml-2" hitSlop={{top:4,bottom:4,left:4,right:4}}>
                <Ionicons name="close" size={26} color="white" />
              </TouchableOpacity>
            )}
        </View>
        {/* Stats badges below header at beginning */}
        <View className="mt-2 items-start">
          <View className="bg-black/45 rounded-full px-4 py-2 flex-row items-center mb-2">
            <Ionicons name="eye" size={16} color="white" />
            <Text className="text-white text-xs font-semibold ml-2">{viewerCount}</Text>
          </View>
          <View className="bg-black/45 rounded-full px-4 py-2 flex-row items-center">
            <Ionicons name="heart" size={16} color="white" />
            <Text className="text-white text-xs font-semibold ml-2">{likesCount}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};
