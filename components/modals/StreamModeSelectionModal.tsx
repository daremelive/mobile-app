import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import CancelIcon from '../../assets/icons/cancel.svg';
import UserIcon from '../../assets/icons/user.svg';
import UsersIcon from '../../assets/icons/users.svg';
import VideoIcon from '../../assets/icons/video.svg';
import GameIcon from '../../assets/icons/game.svg';
import TruthOrDareIcon from '../../assets/icons/truth-or-dare.svg';
import BanterIcon from '../../assets/icons/banter.svg';
import SeatsIcon from '../../assets/icons/seat-selector.svg';
import { useGetUserStreamPrivilegesQuery } from '../../src/api/levelsApi';

interface StreamModeSelectionModalProps {
  visible: boolean;
  onClose: () => void;
}

const StreamModeSelectionModal: React.FC<StreamModeSelectionModalProps> = ({
  visible,
  onClose,
}) => {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<'single' | 'multi' | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<number | null>(null);

  // Get user's streaming privileges
  const { data: privileges, isLoading: privilegesLoading, refetch: refetchPrivileges } = useGetUserStreamPrivilegesQuery();

  const seatOptions = [4, 6, 8, 12];

  // Refetch privileges when modal becomes visible
  React.useEffect(() => {
    if (visible && !privilegesLoading) {
      refetchPrivileges();
    }
  }, [visible, refetchPrivileges, privilegesLoading]);

  const handleProceed = () => {
    // Check if user can create streams
    if (!privileges?.can_create_streams) {
      Alert.alert(
        'Stream Creation Restricted',
        `Your current tier (${privileges?.tier_display_name || 'Unknown'}) does not allow stream creation. Please upgrade your level to create streams.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade Level', onPress: () => {
            onClose();
            router.push('/unlock-level');
          }}
        ]
      );
      return;
    }

    // Check if user has access to selected channel
    const hasChannelAccess = privileges?.accessible_channels.some(
      channel => channel.code === selectedChannel
    );

    if (!hasChannelAccess) {
      const channelName = getChannelDisplayName(selectedChannel);
      Alert.alert(
        'Channel Access Restricted',
        `Your current tier (${privileges?.tier_display_name || 'Unknown'}) does not have access to the '${channelName}' channel. Please upgrade your level to access this channel.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade Level', onPress: () => {
            onClose();
            router.push('/unlock-level');
          }}
        ]
      );
      return;
    }

    if (selectedMode === 'single' && selectedChannel) {
      onClose();
      router.push({
        pathname: '/stream/single',
        params: { 
          mode: selectedMode,
          channel: selectedChannel
        }
      });
    } else if (selectedMode === 'multi' && selectedChannel && selectedSeats) {
      onClose();
      router.push({
        pathname: '/stream/multi',
        params: { 
          mode: selectedMode,
          channel: selectedChannel,
          seats: selectedSeats
        }
      });
    }
  };

  const getChannelDisplayName = (channelCode: string | null) => {
    switch (channelCode) {
      case 'video': return 'Normal Live';
      case 'game': return 'Gaming';
      case 'truth-or-dare': return 'Truth or Dare';
      case 'banter': return 'Banter';
      default: return 'Unknown';
    }
  };

  const isChannelAccessible = (channelCode: string) => {
    if (!privileges) return false;
    return privileges.accessible_channels.some(channel => channel.code === channelCode);
  };

  const handleCancel = () => {
    onClose();
    router.replace('/(tabs)/home');
  };

  const handleSingleSelect = () => {
    setSelectedMode('single');
    setSelectedChannel(null);
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/80">
        <View className="bg-[#1A1A1A] rounded-2xl w-[90%] relative p-6">
          <TouchableOpacity 
            className="absolute right-4 top-4 z-10" 
            onPress={handleCancel}
          >
            <CancelIcon width={24} height={24} />
          </TouchableOpacity>

          <Text className="text-white text-xl font-semibold mb-4">
            Choose Your Stream Mode
          </Text>

          {/* Show loading or privilege error states */}
          {privilegesLoading && (
            <View className="mb-4 p-3 bg-yellow-500/20 rounded-lg">
              <Text className="text-yellow-400 text-sm">Loading stream privileges...</Text>
            </View>
          )}

          {privileges && !privileges.can_create_streams && (
            <View className="mb-4 p-3 bg-red-500/20 rounded-lg border border-red-500/30">
              <Text className="text-red-400 text-sm font-medium">
                Stream Creation Restricted
              </Text>
              <Text className="text-red-300 text-xs mt-1">
                Your current tier ({privileges.tier_display_name}) does not allow stream creation.
              </Text>
            </View>
          )}

          <View className="flex-row gap-4 mb-6">
            <TouchableOpacity 
              className={`flex-1 bg-[#1A1A1A] rounded-xl border p-4 items-center
                ${selectedMode === 'single' ? 'border-[#C42720] bg-[#C42720]/20' : 'border-[#2A2A2A]'}
                ${privileges && !privileges.can_create_streams ? 'opacity-50' : ''}`}
              onPress={handleSingleSelect}
              disabled={privileges && !privileges.can_create_streams}
            >
              <View className="w-16 h-16 rounded-full bg-[#2A2A2A] items-center justify-center mb-2">
                <UserIcon width={32} height={32} />
              </View>
              <Text className="text-white text-base font-medium">Single Live</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              className={`flex-1 bg-[#1A1A1A] rounded-xl border p-4 items-center
                ${selectedMode === 'multi' ? 'border-[#C42720] bg-[#C42720]/20' : 'border-[#2A2A2A]'}
                ${privileges && !privileges.can_create_streams ? 'opacity-50' : ''}`}
              onPress={() => {
                setSelectedMode('multi');
                setSelectedChannel(null);
                setSelectedSeats(null);
              }}
              disabled={privileges && !privileges.can_create_streams}
            >
              <View className="w-16 h-16 rounded-full bg-[#2A2A2A] items-center justify-center mb-2">
                <UsersIcon width={32} height={32} />
              </View>
              <Text className="text-white text-base font-medium">Multi Live</Text>
            </TouchableOpacity>
          </View>

          {(selectedMode === 'single' || selectedMode === 'multi') && (
            <>
              <Text className="text-white text-base font-medium mb-4">
                Select Stream Channel
              </Text>

              <View className="mb-6">
                {/* First Row */}
                <View className="flex-row gap-4 mb-4">
                  <TouchableOpacity 
                    className={`flex-1 bg-[#1A1A1A] rounded-xl border p-4 items-center
                      ${selectedChannel === 'video' ? 'border-[#C42720] bg-[#C42720]/20' : 'border-[#2A2A2A]'}
                      ${!isChannelAccessible('video') ? 'opacity-50' : ''}`}
                    onPress={() => setSelectedChannel('video')}
                    disabled={!isChannelAccessible('video')}
                  >
                    <View className="w-16 h-16 rounded-full bg-[#2A2A2A] items-center justify-center mb-2">
                      <VideoIcon width={32} height={32} />
                    </View>
                    <Text className="text-white text-base font-medium">Video</Text>
                    {!isChannelAccessible('video') && (
                      <Text className="text-red-400 text-xs mt-1">🔒 Locked</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity 
                    className={`flex-1 bg-[#1A1A1A] rounded-xl border p-4 items-center
                      ${selectedChannel === 'game' ? 'border-[#C42720] bg-[#C42720]/20' : 'border-[#2A2A2A]'}
                      ${!isChannelAccessible('game') ? 'opacity-50' : ''}`}
                    onPress={() => setSelectedChannel('game')}
                    disabled={!isChannelAccessible('game')}
                  >
                    <View className="w-16 h-16 rounded-full bg-[#2A2A2A] items-center justify-center mb-2">
                      <GameIcon width={32} height={32} />
                    </View>
                    <Text className="text-white text-base font-medium">Game</Text>
                    {!isChannelAccessible('game') && (
                      <Text className="text-red-400 text-xs mt-1">🔒 Locked</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Second Row */}
                <View className="flex-row gap-4">
                  <TouchableOpacity 
                    className={`flex-1 bg-[#1A1A1A] rounded-xl border p-4 items-center
                      ${selectedChannel === 'truth-or-dare' ? 'border-[#C42720] bg-[#C42720]/20' : 'border-[#2A2A2A]'}
                      ${!isChannelAccessible('truth-or-dare') ? 'opacity-50' : ''}`}
                    onPress={() => setSelectedChannel('truth-or-dare')}
                    disabled={!isChannelAccessible('truth-or-dare')}
                  >
                    <View className="w-16 h-16 rounded-full bg-[#2A2A2A] items-center justify-center mb-2">
                      <TruthOrDareIcon width={32} height={32} />
                    </View>
                    <Text className="text-white text-base font-medium">Truth or Dare</Text>
                    {!isChannelAccessible('truth-or-dare') && (
                      <Text className="text-red-400 text-xs mt-1">🔒 Locked</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity 
                    className={`flex-1 bg-[#1A1A1A] rounded-xl border p-4 items-center
                      ${selectedChannel === 'banter' ? 'border-[#C42720] bg-[#C42720]/20' : 'border-[#2A2A2A]'}
                      ${!isChannelAccessible('banter') ? 'opacity-50' : ''}`}
                    onPress={() => setSelectedChannel('banter')}
                    disabled={!isChannelAccessible('banter')}
                  >
                    <View className="w-16 h-16 rounded-full bg-[#2A2A2A] items-center justify-center mb-2">
                      <BanterIcon width={32} height={32} />
                    </View>
                    <Text className="text-white text-base font-medium">Banter</Text>
                    {!isChannelAccessible('banter') && (
                      <Text className="text-red-400 text-xs mt-1">🔒 Locked</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Only show seat selection for multi streams */}
              {selectedMode === 'multi' && (
                <>
                  <Text className="text-white text-base font-medium mb-4">
                    Select No of Seats
                  </Text>

                  <View className="flex-row gap-3 mb-6">
                    {seatOptions.map((seats) => (
                      <TouchableOpacity
                        key={seats}
                        className={`flex-1 h-12 rounded-xl border items-center justify-center flex-row gap-2
                          ${selectedSeats === seats ? 'border-[#C42720] bg-[#C42720]/20' : 'border-[#2A2A2A] bg-[#1A1A1A]'}`}
                        onPress={() => setSelectedSeats(seats)}
                      >
                        <SeatsIcon width={16} height={16} />
                        <Text className="text-white font-medium">{seats}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <TouchableOpacity
                className={`w-full h-12 rounded-full items-center justify-center
                  ${(selectedMode === 'single' && selectedChannel) || (selectedMode === 'multi' && selectedChannel && selectedSeats) 
                    ? 'bg-white' : 'bg-white/50'}`}
                onPress={handleProceed}
                disabled={
                  (selectedMode === 'single' && !selectedChannel) || 
                  (selectedMode === 'multi' && (!selectedChannel || !selectedSeats))
                }
              >
                <Text className="text-black text-base font-semibold">Proceed</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default StreamModeSelectionModal; 