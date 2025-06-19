import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import LockIcon from '../../assets/icons/lock.svg';
import CancelIcon from '../../assets/icons/cancel.svg';
import LockPasswordIcon from '../../assets/icons/lock-password.svg';
import { router } from 'expo-router';

interface ChangePasswordConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ChangePasswordConfirmationModal: React.FC<ChangePasswordConfirmationModalProps> = ({
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
          <TouchableOpacity className="absolute top-4 right-4" onPress={onClose}>
            <CancelIcon width={24} height={24} stroke="#8A8A8E" />
          </TouchableOpacity>
          
          <View className="w-16 h-16 rounded-full bg-[#333333] justify-center items-center mb-4">
            <LockPasswordIcon width={32} height={32} />
          </View>
          
          <Text className="text-white text-xl font-bold mb-2 text-center">Change Password</Text>
          <Text className="text-[#EBEBF599] text-base text-center mb-5">
            For your account's safety, avoid reusing old passwords. You'll be logged out of all devices after this change.
          </Text>

          <TouchableOpacity className="bg-[#333333] w-full rounded-full py-3 px-12" onPress={() => router.replace('/(auth)/verify-change-password')}>
            <Text className="text-white text-center font-bold text-base">Proceed</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ChangePasswordConfirmationModal; 