import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import BlockedIcon from '../../assets/icons/blocked.svg';
import CancelIcon from '../../assets/icons/cancel.svg';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

interface DeactivateAccountConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeactivateAccountConfirmationModal: React.FC<DeactivateAccountConfirmationModalProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/80">
        <View className="bg-[#1E1E1E] rounded-2xl p-6 pt-10 items-center w-[90%] relative">
          <TouchableOpacity className="absolute bg-[#333333] w-14 h-14 rounded-full justify-center items-center top-4 right-4" onPress={onClose}>
            <CancelIcon width={24} height={24} stroke="#8A8A8E" />
          </TouchableOpacity>
          
          <View className="w-16 h-16 rounded-full bg-[#333333] justify-center items-center mb-4">
            <BlockedIcon width={24} height={24} />
          </View>
          
          <Text className="text-white text-xl font-bold mb-2 text-center">We're Sorry to See You Go</Text>
          <Text className="text-[#EBEBF599] text-base text-center mb-6">
            Once deactivated, you'll lose access to your account and all associated data. Are you sure you want to proceed?
          </Text>

          {/* <TouchableOpacity className="bg-[#C42720] rounded-full py-3 w-full items-center mb-3" onPress={onClose}>
            <Text className="text-white font-bold text-base">No, Cancel</Text>
          </TouchableOpacity> */}
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
              <Text className="text-white text-[17px] font-semibold">No, Cancel</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
          <TouchableOpacity className="bg-[#333333] rounded-full py-5 w-full items-center" onPress={onConfirm}>
            <Text className="text-white font-bold text-base">Proceed</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default DeactivateAccountConfirmationModal; 