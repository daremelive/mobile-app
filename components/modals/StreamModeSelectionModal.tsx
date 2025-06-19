import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import CancelIcon from '../../assets/icons/cancel.svg';
import UserIcon from '../../assets/icons/user.svg';
import UsersIcon from '../../assets/icons/users.svg';
import VideoIcon from '../../assets/icons/video.svg';
import GameIcon from '../../assets/icons/game.svg';
import TruthOrDareIcon from '../../assets/icons/truth-or-dare.svg';
import BanterIcon from '../../assets/icons/banter.svg';
import SeatsIcon from '../../assets/icons/seat-selector.svg';

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

  const seatOptions = [4, 6, 8, 12];

  const handleProceed = () => {
    if (selectedMode === 'multi' && selectedChannel && selectedSeats) {
      onClose();
      router.push({
        pathname: '/info',
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
    router.replace('/home');
  };

  const handleSingleSelect = () => {
    setSelectedMode('single');
    setSelectedChannel('video');
    onClose();
    router.push({
      pathname: '/info',
      params: { 
        mode: 'single',
        channel: 'video' 
      }
    });
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

          <View className="flex-row gap-4 mb-6">
            <TouchableOpacity 
              className={`flex-1 bg-[#1A1A1A] rounded-xl border p-4 items-center
                ${selectedMode === 'single' ? 'border-[#C42720] bg-[#C42720]/20' : 'border-[#2A2A2A]'}`}
              onPress={handleSingleSelect}
            >
              <View className="w-16 h-16 rounded-full bg-[#2A2A2A] items-center justify-center mb-2">
                <UserIcon width={32} height={32} />
              </View>
              <Text className="text-white text-base font-medium">Single Live</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              className={`flex-1 bg-[#1A1A1A] rounded-xl border p-4 items-center
                ${selectedMode === 'multi' ? 'border-[#C42720] bg-[#C42720]/20' : 'border-[#2A2A2A]'}`}
              onPress={() => {
                setSelectedMode('multi');
                setSelectedChannel(null);
                setSelectedSeats(null);
              }}
            >
              <View className="w-16 h-16 rounded-full bg-[#2A2A2A] items-center justify-center mb-2">
                <UsersIcon width={32} height={32} />
              </View>
              <Text className="text-white text-base font-medium">Multi Live</Text>
            </TouchableOpacity>
          </View>

          {selectedMode === 'multi' && (
            <>
              <Text className="text-white text-base font-medium mb-4">
                Select Stream Channel
              </Text>

              <View className="mb-6">
                {/* First Row */}
                <View className="flex-row gap-4 mb-4">
                  <TouchableOpacity 
                    className={`flex-1 bg-[#1A1A1A] rounded-xl border p-4 items-center
                      ${selectedChannel === 'video' ? 'border-[#C42720] bg-[#C42720]/20' : 'border-[#2A2A2A]'}`}
                    onPress={() => setSelectedChannel('video')}
                  >
                    <View className="w-16 h-16 rounded-full bg-[#2A2A2A] items-center justify-center mb-2">
                      <VideoIcon width={32} height={32} />
                    </View>
                    <Text className="text-white text-base font-medium">Video</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    className={`flex-1 bg-[#1A1A1A] rounded-xl border p-4 items-center
                      ${selectedChannel === 'game' ? 'border-[#C42720] bg-[#C42720]/20' : 'border-[#2A2A2A]'}`}
                    onPress={() => setSelectedChannel('game')}
                  >
                    <View className="w-16 h-16 rounded-full bg-[#2A2A2A] items-center justify-center mb-2">
                      <GameIcon width={32} height={32} />
                    </View>
                    <Text className="text-white text-base font-medium">Game</Text>
                  </TouchableOpacity>
                </View>

                {/* Second Row */}
                <View className="flex-row gap-4">
                  <TouchableOpacity 
                    className={`flex-1 bg-[#1A1A1A] rounded-xl border p-4 items-center
                      ${selectedChannel === 'truth-or-dare' ? 'border-[#C42720] bg-[#C42720]/20' : 'border-[#2A2A2A]'}`}
                    onPress={() => setSelectedChannel('truth-or-dare')}
                  >
                    <View className="w-16 h-16 rounded-full bg-[#2A2A2A] items-center justify-center mb-2">
                      <TruthOrDareIcon width={32} height={32} />
                    </View>
                    <Text className="text-white text-base font-medium">Truth or Dare</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    className={`flex-1 bg-[#1A1A1A] rounded-xl border p-4 items-center
                      ${selectedChannel === 'banter' ? 'border-[#C42720] bg-[#C42720]/20' : 'border-[#2A2A2A]'}`}
                    onPress={() => setSelectedChannel('banter')}
                  >
                    <View className="w-16 h-16 rounded-full bg-[#2A2A2A] items-center justify-center mb-2">
                      <BanterIcon width={32} height={32} />
                    </View>
                    <Text className="text-white text-base font-medium">Banter</Text>
                  </TouchableOpacity>
                </View>
              </View>

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

              <TouchableOpacity
                className={`w-full h-12 rounded-full items-center justify-center
                  ${selectedChannel && selectedSeats ? 'bg-white' : 'bg-white/50'}`}
                onPress={handleProceed}
                disabled={!selectedChannel || !selectedSeats}
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