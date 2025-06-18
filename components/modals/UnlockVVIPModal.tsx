import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import CancelIcon from '../../assets/icons/cancel.svg';
import VVIPBadge from '../../assets/icons/vvip.svg';
import CheckIcon from '../../assets/icons/check.svg';

interface UnlockVVIPModalProps {
  visible: boolean;
  onClose: () => void;
  onUnlock: () => void;
}

const UnlockVVIPModal: React.FC<UnlockVVIPModalProps> = ({
  visible,
  onClose,
  onUnlock,
}) => {
  const requirements = [
    'Requirement one',
    'Requirement one',
    'Requirement one',
    'Requirement one',
  ];

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/80">
        <View className="bg-[#1E1E1E] rounded-2xl p-6 items-center w-[90%] relative">
          <TouchableOpacity
            className="absolute top-4 right-4 bg-[#2C2C2E] w-14 h-14 rounded-full justify-center items-center"
            onPress={onClose}
          >
            <CancelIcon width={20} height={20} stroke="#FFFFFF" />
          </TouchableOpacity>

          <VVIPBadge width={80} height={80} className="mb-4" />

          <Text className="text-white text-xl font-bold mb-2">Unlock VVIP Level</Text>
          <Text className="text-gray-400 text-center mb-6">
            You can unlock this level by meeting the following requirements:
          </Text>

          <View className="w-full items-start mb-6">
            {requirements.map((req, index) => (
              <View key={index} className="flex-row items-center mb-2">
                <CheckIcon width={16} height={16} fill="#34C759" />
                <Text className="text-white ml-2">{req}</Text>
              </View>
            ))}
          </View>
            <View className="w-full h-[52px] rounded-full overflow-hidden mb-6">
                <LinearGradient
                    colors={['#FF0000', '#330000']}
                    locations={[0, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="w-full h-full"
                >
                    <TouchableOpacity 
                    className="w-full h-full items-center justify-center"
                    >
                    <Text className="text-white text-[17px] font-semibold">Unlock Now</Text>
                    </TouchableOpacity>
                </LinearGradient>
            </View>
        </View>
      </View>
    </Modal>
  );
};

export default UnlockVVIPModal; 