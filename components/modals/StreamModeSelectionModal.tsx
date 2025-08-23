import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import CancelIcon from '../../assets/icons/cancel.svg';
import UserIcon from '../../assets/icons/user.svg';
import UsersIcon from '../../assets/icons/users.svg';
import VideoIcon from '../../assets/icons/video.svg';
import GameIcon from '../../assets/icons/game.svg';
import TruthOrDareIcon from '../../assets/icons/truth-or-dare.svg';
import BanterIcon from '../../assets/icons/banter.svg';
import SeatsIcon from '../../assets/icons/seat-selector.svg';
import LockIcon from '../../assets/icons/lock.svg';
import { useGetUserStreamPrivilegesQuery, StreamChannel } from '../../src/api/levelsApi';

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

  const { data: privileges, isLoading: privilegesLoading, refetch: refetchPrivileges } = useGetUserStreamPrivilegesQuery();

  const getDynamicSeatOptions = (): number[] => {
    if (!selectedChannel || !privileges?.all_channels) {
      return [4, 6, 8, 12];
    }
    
    const channel = privileges.all_channels.find(ch => ch.code === selectedChannel);
    if (!channel) {
      return [4, 6, 8, 12];
    }
    
    const maxParticipants = channel.max_participants;
    
    const baseOptions = [4, 6, 8, 12];
    const additionalOptions = [];
    
    if (maxParticipants >= 16) additionalOptions.push(16);
    if (maxParticipants >= 20) additionalOptions.push(20);
    if (maxParticipants >= 30) additionalOptions.push(30);
    if (maxParticipants >= 50) additionalOptions.push(50);
    if (maxParticipants >= 100) additionalOptions.push(100);
    
    const allOptions = [...baseOptions, ...additionalOptions]
      .filter(option => option <= maxParticipants)
      .sort((a, b) => a - b);
    
    const uniqueOptions = Array.from(new Set(allOptions));
    return uniqueOptions.length >= 4 ? uniqueOptions : baseOptions;
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
        pathname: '/(stream)/stream-title',
        params: { 
          mode: selectedMode,
          channel: selectedChannel
        }
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

  const getChannelDisplayName = (channelCode: string | null) => {
    const channel = privileges?.accessible_channels.find(ch => ch.code === channelCode);
    return channel?.name || 'Unknown';
  };

  const isChannelAccessible = (channelCode: string) => {
    if (!privileges) return false;
    return privileges.accessible_channels.some(channel => channel.code === channelCode);
  };

  const getChannelIcon = (channelCode: string) => {
    switch (channelCode) {
      case 'video': return VideoIcon;
      case 'game': return GameIcon;
      case 'truth-or-dare': return TruthOrDareIcon;
      case 'banter': return BanterIcon;
      default: return VideoIcon;
    }
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
        <View className="bg-[#1A1A1A] rounded-2xl w-[90%] max-h-[85%] relative p-6">
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
            <ScrollView 
              showsVerticalScrollIndicator={false}
              className="max-h-[400px]"
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <Text className="text-white text-base font-medium mb-4">
                Select Stream Channel
              </Text>

              <View className="mb-6">
                <View className="flex-row flex-wrap justify-between">
                  {privileges?.all_channels?.map((channel, index) => {
                    const IconComponent = getChannelIcon(channel.code);
                    const isSelected = selectedChannel === channel.code;
                    const isLocked = channel.is_locked;
                    
                    const handleChannelPress = () => {
                      if (isLocked) {
                        Alert.alert(
                          `🔒 Unlock ${channel.name}`,
                          channel.unlock_message || `Upgrade to ${channel.unlock_tier} to access this channel!`,
                          [
                            { text: 'Maybe Later', style: 'cancel' },
                            {
                              text: `💰 Get Coins`,
                              onPress: () => {
                                onClose();
                                router.push('/get-coins');
                              }
                            },
                            {
                              text: `💎 Upgrade Now`,
                              onPress: () => {
                                onClose();
                                router.push('/unlock-level');
                              }
                            }
                          ]
                        );
                      } else {
                        setSelectedChannel(channel.code);
                      }
                    };
                    
                    return (
                      <TouchableOpacity
                        key={channel.id}
                        className={`w-[48%] rounded-xl border p-4 items-center mb-4 relative
                          ${isSelected && !isLocked ? 'border-[#C42720] bg-[#C42720]/20' : 'border-[#2A2A2A]'}
                          ${isLocked ? 'bg-[#1A1A1A]/50 border-orange-500/30' : 'bg-[#1A1A1A]'}`}
                        onPress={handleChannelPress}
                      >
                        {isLocked && (
                          <View className="absolute top-2 right-2 bg-orange-500/20 rounded-full p-1">
                            <LockIcon width={12} height={12} fill="#F97316" />
                          </View>
                        )}
                        
                        <View className={`w-16 h-16 rounded-full items-center justify-center mb-2
                          ${isLocked ? 'bg-[#2A2A2A]/50' : 'bg-[#2A2A2A]'}`}>
                          <IconComponent 
                            width={32} 
                            height={32} 
                            fill={isLocked ? '#9CA3AF' : '#FFFFFF'} 
                          />
                        </View>
                        
                        <Text className={`text-base font-medium text-center mb-1
                          ${isLocked ? 'text-gray-400' : 'text-white'}`}>
                          {channel.name}
                        </Text>
                        
                        {isLocked ? (
                          <View className="items-center">
                            <Text className="text-orange-400 text-xs font-semibold">
                              🔒 {channel.unlock_tier}
                            </Text>
                            {channel.coins_needed_to_unlock > 0 && (
                              <Text className="text-orange-300 text-xs">
                                {channel.coins_needed_to_unlock} more Riz
                              </Text>
                            )}
                          </View>
                        ) : (
                          channel.description && (
                            <Text className="text-green-400 text-xs text-center">
                              {channel.description}
                            </Text>
                          )
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                
                {privileges?.locked_channels && privileges.locked_channels.length > 0 && (
                  <View className="p-4 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 rounded-lg border border-orange-500/30 mb-4">
                    <Text className="text-orange-400 text-center font-semibold mb-1">
                      🎯 Unlock More Channels!
                    </Text>
                    <Text className="text-orange-300 text-xs text-center">
                      You currently have {privileges.current_tier_display} access. 
                      Upgrade to unlock {privileges.locked_channels.length} premium channels!
                    </Text>
                  </View>
                )}
                
                {/* Fallback if no channels available */}
                {(!privileges?.all_channels || privileges.all_channels.length === 0) && (
                  <View className="p-4 bg-yellow-500/20 rounded-lg">
                    <Text className="text-yellow-400 text-center">
                      No channels available. Contact support.
                    </Text>
                  </View>
                )}
              </View>

              {/* Only show seat selection for multi streams */}
              {selectedMode === 'multi' && (
                <>
                  <View className="mb-4">
                    <Text className="text-white text-base font-medium mb-2">
                      Select No of Seats
                    </Text>
                    {selectedChannel && privileges?.all_channels && (
                      <View className="mb-3">
                        {(() => {
                          const channel = privileges.all_channels.find(ch => ch.code === selectedChannel);
                          return channel ? (
                            <Text className="text-gray-400 text-sm">
                              {channel.name} supports up to {channel.max_participants} participants
                            </Text>
                          ) : null;
                        })()}
                      </View>
                    )}
                  </View>

                  <View className="flex-row flex-wrap gap-3 mb-6">
                    {seatOptions.map((seats) => (
                      <TouchableOpacity
                        key={seats}
                        className={`min-w-[20%] h-12 rounded-xl border items-center justify-center flex-row gap-2 px-3
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
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default StreamModeSelectionModal; 