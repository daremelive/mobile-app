import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SuccessIcon from '../../assets/icons/success.svg';

interface BankDetailsAddedModalProps {
  visible: boolean;
  onClose: () => void;
}

const BankDetailsAddedModal: React.FC<BankDetailsAddedModalProps> = ({
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
        <View className="bg-[#1E1E1E] rounded-2xl p-8 items-center w-[95%] relative">
          <View className="relative mb-6">
            <SuccessIcon width={120} height={120} className="absolute -top-5 -left-5" />
          </View>

          <Text className="text-white text-2xl font-bold mb-2 text-center">Bank Details Added Successfully!</Text>
          <Text className="text-gray-400 text-center mb-8">
            Your bank account has been verified. You can now withdraw your earnings.
          </Text>

          <View className="w-full h-[52px] rounded-full overflow-hidden">
            <LinearGradient
              colors={['#C40000', '#6F0000']}
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

export default BankDetailsAddedModal; 