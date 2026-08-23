import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { BlurView } from 'expo-blur';
import { SvgUri, type SvgProps } from 'react-native-svg';
import { useGetUserStreamPrivilegesQuery } from '../../src/api/levelsApi';
import { useGetProfileQuery } from '../../src/store/authApi';
import { selectCurrentUser } from '../../src/store/authSlice';
import { StreamModeSelectionModalProps } from './types';

import UserIcon from '../../assets/icons/user.svg';
import UsersIcon from '../../assets/icons/users.svg';
import VideoIcon from '../../assets/icons/video.svg';
import GameIcon from '../../assets/icons/game.svg';
import TruthOrDareIcon from '../../assets/icons/truth-or-dare.svg';
import BanterIcon from '../../assets/icons/banter.svg';
import CancelIcon from '../../assets/icons/cancel.svg';
import SeatIcon from '../../assets/icons/seat-selector.svg';

/** Design tokens from the stream-mode design. */
const SURFACE = 'rgba(237,238,249,0.08)';
const SURFACE_BORDER = 'rgba(237,238,249,0.12)';
const SELECTED_SURFACE = 'rgba(196,39,32,0.12)';
const SELECTED_BORDER = '#C42720';

const CHANNEL_ICONS: Record<string, React.FC<SvgProps>> = {
  video: VideoIcon,
  game: GameIcon,
  'truth-or-dare': TruthOrDareIcon,
  banter: BanterIcon,
};

/** Uploaded icons may be SVG, which needs a different renderer to raster. */
const isSvgUrl = (url: string) => url.split('?')[0].toLowerCase().endsWith('.svg');

/**
 * Circular icon chip shared by the mode and channel cards.
 *
 * A channel's admin-uploaded image wins when present, so new channels get their
 * own artwork without a code change. `Icon` is the bundled fallback used until
 * an image is uploaded.
 */
const IconChip = ({ Icon, imageUrl }: { Icon: React.FC<SvgProps>; imageUrl?: string }) => (
  <View
    className="rounded-full border p-[10px]"
    style={{ backgroundColor: SURFACE, borderColor: SURFACE_BORDER }}
  >
    {!imageUrl ? (
      <Icon width={16} height={16} />
    ) : isSvgUrl(imageUrl) ? (
      // React Native's Image cannot decode SVG; SvgUri renders it properly.
      <SvgUri uri={imageUrl} width={16} height={16} />
    ) : (
      <Image
        source={{ uri: imageUrl }}
        style={{ width: 16, height: 16 }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    )}
  </View>
);

/** Selectable card used for both stream modes and channels. */
const SelectableCard = ({
  Icon,
  imageUrl,
  label,
  selected,
  disabled,
  onPress,
}: {
  Icon: React.FC<SvgProps>;
  imageUrl?: string;
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    className="flex-1 items-center justify-center gap-3 rounded-lg border p-4"
    style={{
      backgroundColor: selected ? SELECTED_SURFACE : SURFACE,
      borderColor: selected ? SELECTED_BORDER : SURFACE_BORDER,
      opacity: disabled ? 0.5 : 1,
    }}
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityState={{ selected, disabled: !!disabled }}
  >
    <IconChip Icon={Icon} imageUrl={imageUrl} />
    <Text className="text-center text-xs text-[#EDEEF9]">{label}</Text>
  </TouchableOpacity>
);

const StreamModeSelectionModal: React.FC<StreamModeSelectionModalProps> = ({
  visible,
  onClose,
}) => {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<'single' | 'multi' | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<number | null>(null);

  const { data: privileges, isLoading: privilegesLoading, refetch: refetchPrivileges } =
    useGetUserStreamPrivilegesQuery(undefined, {
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    });
  const { data: currentUserProfile } = useGetProfileQuery();
  const currentUser = useSelector(selectCurrentUser);

  // Mirrors MIN_MULTI_SEATS in streams/serializers.py.
  const MIN_MULTI_SEATS = 2;

  // Only channels this user can actually stream in are offered.
  const channels = privileges?.accessible_channels ?? [];

  /**
   * Seat choices offered for a multi-live stream, capped by the channel's
   * max_participants. The server validates the same bound, so every option
   * shown here is one the API will accept.
   */
  const getDynamicSeatOptions = (): number[] => {
    const candidates = [2, 4, 6, 8, 12, 16, 20, 30, 50, 100];
    const defaults = [4, 6, 8, 12];

    const channel = selectedChannel
      ? channels.find(ch => ch.code === selectedChannel)
      : undefined;

    // No channel selected yet, or the channel is unlimited (0).
    if (!channel?.max_participants) {
      return defaults;
    }

    const withinCap = candidates.filter(
      option => option >= MIN_MULTI_SEATS && option <= channel.max_participants
    );

    // A cap below the smallest option still needs one usable choice.
    return withinCap.length > 0 ? withinCap : [MIN_MULTI_SEATS];
  };

  const seatOptions = getDynamicSeatOptions();

  React.useEffect(() => {
    if (visible && !privilegesLoading) {
      refetchPrivileges();
    }
  }, [visible, refetchPrivileges, privilegesLoading]);

  React.useEffect(() => {
    if (selectedChannel) {
      setSelectedSeats(null);
    }
  }, [selectedChannel]);

  const handleProceed = () => {
    // Get user data - prioritize fresh profile data over cached user
    const userData = currentUserProfile || currentUser;

    const hasProfilePicture = !!(
      userData?.profile_picture_url ||
      userData?.profile_picture
    );

    if (!hasProfilePicture) {
      Alert.alert(
        'Profile picture required',
        'Add a profile picture before going live so viewers can recognise you.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upload photo',
            onPress: () => {
              onClose();
              router.push('/(tabs)/profile');
            }
          }
        ]
      );
      return;
    }

    if (!privileges?.can_create_streams) {
      Alert.alert(
        'Stream creation restricted',
        'Your current level does not allow creating streams.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upgrade level', onPress: () => {
              onClose();
              router.push('/unlock-level');
            }
          }
        ]
      );
      return;
    }

    if (selectedMode === 'single' && selectedChannel) {
      onClose();
      // Single live has its own title step: no seat preview, no guest invites.
      router.push({
        pathname: '/(stream)/single-stream-title',
        params: { mode: selectedMode, channel: selectedChannel }
      });
    } else if (selectedMode === 'multi' && selectedChannel && selectedSeats) {
      onClose();
      router.push({
        pathname: '/(stream)/stream-title',
        params: {
          mode: selectedMode,
          channel: selectedChannel,
          seats: selectedSeats
        }
      });
    }
  };

  const handleCancel = () => {
    onClose();
    router.replace('/(tabs)/home');
  };

  const selectMode = (mode: 'single' | 'multi') => {
    setSelectedMode(mode);
    setSelectedChannel(null);
    setSelectedSeats(null);
  };

  const canProceed =
    selectedMode === 'single'
      ? !!selectedChannel
      : selectedMode === 'multi' && !!selectedChannel && !!selectedSeats;

  const canCreate = privileges?.can_create_streams !== false;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <BlurView intensity={20} tint="dark" className="flex-1 items-center justify-center px-4">
        <View
          className="w-full max-w-[343px] gap-5 overflow-hidden rounded-xl px-4 py-6"
          style={{ backgroundColor: 'rgba(38,38,38,0.94)' }}
        >
          <View className="flex-row items-start justify-between">
            <Text className="text-lg font-semibold text-[#EDEEF9]">
              Choose Your Stream Mode
            </Text>
            <TouchableOpacity onPress={handleCancel} accessibilityLabel="Close">
              <CancelIcon width={24} height={24} />
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-4">
            <SelectableCard
              Icon={UserIcon}
              label="Single Live"
              selected={selectedMode === 'single'}
              disabled={!canCreate}
              onPress={() => selectMode('single')}
            />
            <SelectableCard
              Icon={UsersIcon}
              label="Multi Live"
              selected={selectedMode === 'multi'}
              disabled={!canCreate}
              onPress={() => selectMode('multi')}
            />
          </View>

          {selectedMode && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              className="max-h-[360px]"
              contentContainerStyle={{ gap: 12 }}
            >
              <Text className="text-sm font-semibold text-[#EDEEF9]">
                Select Stream Channel
              </Text>

              {privilegesLoading && channels.length === 0 ? (
                <ActivityIndicator color="#EDEEF9" className="py-6" />
              ) : channels.length === 0 ? (
                <Text className="py-4 text-center text-xs text-[#62636E]">
                  We couldn't load the channels just now. Please check your
                  connection and try again.
                </Text>
              ) : (
                <View className="gap-4">
                  {Array.from(
                    { length: Math.ceil(channels.length / 2) },
                    (_, row) => channels.slice(row * 2, row * 2 + 2)
                  ).map((pair, row) => (
                    <View key={row} className="flex-row gap-4">
                      {pair.map((channel) => (
                        <SelectableCard
                          key={channel.id}
                          Icon={CHANNEL_ICONS[channel.code] ?? VideoIcon}
                          imageUrl={channel.image_url}
                          label={channel.name}
                          selected={selectedChannel === channel.code}
                          onPress={() => setSelectedChannel(channel.code)}
                        />
                      ))}
                      {/* Keep a lone card at half width on an odd final row. */}
                      {pair.length === 1 && <View className="flex-1" />}
                    </View>
                  ))}
                </View>
              )}

              {selectedMode === 'multi' && selectedChannel && (
                <View className="gap-3">
                  <Text className="text-sm font-semibold text-[#EDEEF9]">
                    Select No of Seats
                  </Text>
                  <View className="flex-row flex-wrap gap-3">
                    {seatOptions.map((seats) => {
                      const selected = selectedSeats === seats;
                      return (
                        <TouchableOpacity
                          key={seats}
                          className="h-11 flex-row items-center justify-center gap-2 rounded-lg border px-4"
                          style={{
                            backgroundColor: selected ? SELECTED_SURFACE : SURFACE,
                            borderColor: selected ? SELECTED_BORDER : SURFACE_BORDER,
                          }}
                          onPress={() => setSelectedSeats(seats)}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                        >
                          <SeatIcon width={14} height={14} />
                          <Text className="text-xs text-[#EDEEF9]">{seats}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <TouchableOpacity
                className="mt-2 h-12 items-center justify-center rounded-full"
                style={{ backgroundColor: canProceed ? '#EDEEF9' : 'rgba(237,238,249,0.4)' }}
                onPress={handleProceed}
                disabled={!canProceed}
              >
                <Text className="text-base font-semibold text-[#090909]">Proceed</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </BlurView>
    </Modal>
  );
};

export default StreamModeSelectionModal;
