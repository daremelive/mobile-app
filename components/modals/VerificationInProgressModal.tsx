import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import CancelIcon from '../../assets/icons/cancel.svg';
import AttentionIcon from '../../assets/icons/attention.svg';

interface VerificationInProgressModalProps {
  visible: boolean;
  onClose: () => void;
}

const VerificationInProgressModal: React.FC<VerificationInProgressModalProps> = ({
  visible,
  onClose,
}) => {
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

          <View className="w-16 h-16 bg-[#2C2C2E] rounded-full justify-center items-center mb-4">
            <AttentionIcon width={28} height={28} />
          </View>

          <Text className="text-white text-xl font-bold mb-2">Verification in Progress</Text>
          <Text className="text-gray-400 text-center mb-6">
            This may take a few minutes. We'll get back to you shortly.
          </Text>

          <View className="w-full h-[52px] rounded-full overflow-hidden">
            <LinearGradient
              colors={['#FF0000', '#330000']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="w-full h-full"
            >
              <TouchableOpacity
                className="w-full h-full items-center justify-center"
                onPress={onClose}
              >
                <Text className="text-white text-[17px] font-semibold">Done</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default VerificationInProgressModal; 