import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import CheckIcon from '../../assets/icons/check.svg';
import CancelIcon from '../../assets/icons/cancel.svg';
import SuccessIcon from '../../assets/icons/success.svg';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

interface PurchaseSuccessModalProps {
  visible: boolean;
  onClose: () => void;
}

const PurchaseSuccessModal: React.FC<PurchaseSuccessModalProps> = ({
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
        <View className="bg-[#1E1E1E] rounded-2xl p-6 pt-10 items-center w-[95%] relative">
          <TouchableOpacity className="absolute top-4 right-4 bg-[#262626] rounded-full p-2 w-14 h-14 justify-center items-center" onPress={onClose}>
            <CancelIcon width={24} height={24} stroke="#8A8A8E" />
          </TouchableOpacity>
          
          <View className="w-16 h-16 rounded-full bg-white justify-center items-center mb-4">
            <SuccessIcon width={80} height={80} />
          </View>
          
          <Text className="text-white text-xl font-bold mb-2 text-center">Purchase Successful!</Text>
          <Text className="text-[#EBEBF599] text-base text-center mb-6">
            Your coins have been added to your wallet. Start gifting now!
          </Text>

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

export default PurchaseSuccessModal; 