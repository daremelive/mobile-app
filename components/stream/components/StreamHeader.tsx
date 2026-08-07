import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fonts } from '../../../constants/Fonts';
import ViewIcon from '../../../assets/icons/view.svg';
import FavouriteIcon from '../../../assets/icons/favourite.svg';
import DiamondIcon from '../../../assets/icons/diamond.svg';
import ShareIcon from '../../../assets/icons/share.svg';
import CancelIcon from '../../../assets/icons/cancel.svg';
import { StreamHeaderProps } from './types';

/** Design tokens from the live stream design. */
const PILL = 'rgba(38,38,38,0.4)';
const AVATAR_BG = '#19171A';
const WHITE = '#EDEEF9';
const MUTED = '#62636E';

/** 12_400 -> "12.4k", as the viewer and like counters are shown in the design. */
const formatCount = (value: number) => {
  const count = Number(value) || 0;
  if (count < 1000) return String(count);
  const thousands = count / 1000;
  return `${thousands >= 100 ? Math.round(thousands) : Number(thousands.toFixed(1))}k`;
};

/** One of the stacked counters under the host pill. */
const StatPill = ({
  Icon,
  value,
  iconWidth = 12,
}: {
  Icon: React.FC<any>;
  value: string;
  iconWidth?: number;
}) => (
  <View
    className="flex-row items-center gap-1 rounded-[68px] px-3 py-2"
    style={{ backgroundColor: PILL }}
  >
    <Icon width={iconWidth} height={12} />
    <Text
      className="text-xs"
      style={{ color: WHITE, fontFamily: fonts.regular, lineHeight: 12 }}
    >
      {value}
    </Text>
  </View>
);

export const StreamHeader = ({
  streamTitle,
  hostName,
  hostFirstName,
  hostLastName,
  hostUsername,
  hostProfilePicture,
  viewerCount = 0,
  likesCount = 0,
  giftsCount,
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

  // Compute the display name from available data
  const displayName = hostName ||
    (hostFirstName && hostLastName ? `${hostFirstName} ${hostLastName}` :
     hostFirstName || hostLastName || hostUsername || 'Host');

  // The design sits the header 2px below the status bar.
  return (
    <View className="absolute left-4 right-4 z-10 gap-2" style={{ top: insets.top + 2 }}>
      <View className="flex-row items-center gap-2">
        <BlurView
          intensity={16}
          tint="dark"
          /* NativeWind does not style third-party components, so the pill's
             layout is set here rather than with className. */
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 68,
            overflow: 'hidden',
            backgroundColor: PILL,
          }}
        >
          <View className="flex-1 flex-row items-center gap-1">
            <View
              className="h-8 w-8 overflow-hidden rounded-full"
              style={{ backgroundColor: AVATAR_BG }}
            >
              {hostProfilePicture ? (
                <Image
                  source={{ uri: hostProfilePicture }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Ionicons name="person" size={16} color={WHITE} />
                </View>
              )}
            </View>
            <View className="flex-1 gap-1">
              <Text
                className="text-xs"
                style={{ color: WHITE, fontFamily: fonts.semiBold, lineHeight: 12 }}
                numberOfLines={1}
              >
                {streamTitle || displayName}
              </Text>
              {hostUsername && (
                <Text
                  className="text-[10px]"
                  style={{ color: MUTED, fontFamily: fonts.semiBold, lineHeight: 10 }}
                  numberOfLines={1}
                >
                  @{hostUsername}
                </Text>
              )}
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            {onToggleFollow && !disableFollow && (
              <TouchableOpacity
                onPress={onToggleFollow}
                className="h-8 items-center justify-center rounded-[36px] px-3"
                style={{ backgroundColor: WHITE, opacity: isFollowing ? 0.9 : 1 }}
                disabled={disableFollow}
              >
                <Text
                  className="text-xs"
                  style={{ color: '#262626', fontFamily: fonts.semiBold, lineHeight: 12 }}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            )}
            {onShare && (
              <TouchableOpacity
                onPress={onShare}
                className="h-8 w-8 items-center justify-center rounded-[36px]"
                style={{ backgroundColor: WHITE }}
                accessibilityRole="button"
                accessibilityLabel="Share stream"
              >
                <ShareIcon width={16} height={16} />
              </TouchableOpacity>
            )}
          </View>
        </BlurView>

        {showBackButton && onBack && (
          <TouchableOpacity
            onPress={onBack}
            className="h-12 w-12 items-center justify-center rounded-[68px]"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={WHITE} />
          </TouchableOpacity>
        )}
        {showCloseButton && onClose && (
          <BlurView
            intensity={16}
            tint="dark"
            style={{
              height: 48,
              width: 48,
              borderRadius: 68,
              overflow: 'hidden',
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Close stream"
            >
              <CancelIcon width={24} height={24} />
            </TouchableOpacity>
          </BlurView>
        )}
      </View>

      {/* Counters stack under the host pill, each hugging its own content. */}
      <View className="items-start gap-2">
        <StatPill Icon={ViewIcon} value={formatCount(viewerCount)} />
        <StatPill Icon={FavouriteIcon} value={formatCount(likesCount)} />
        {giftsCount != null && (
          <StatPill
            Icon={DiamondIcon}
            iconWidth={15}
            value={`+${(Number(giftsCount) || 0).toLocaleString()}`}
          />
        )}
      </View>
    </View>
  );
};
