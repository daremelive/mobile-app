import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface LogoutConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({
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
        <View className="bg-[#1E1E1E] rounded-2xl p-8 items-center w-[95%]">
          <Text className="text-white text-2xl font-bold mb-4">Log Out</Text>
          <Text className="text-gray-400 text-center mb-8">Are you sure you want to log out?</Text>

          <View className="w-full h-[52px] rounded-full overflow-hidden mb-4">
            <LinearGradient
              colors={['#C40000', '#6F0000']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="w-full h-full"
            >
              <TouchableOpacity
                className="w-full h-full items-center justify-center"
                onPress={onConfirm}
              >
                <Text className="text-white text-[17px] font-semibold">Confirm</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
          <TouchableOpacity
            className="w-full h-[52px] items-center justify-center bg-[#2C2C2E] rounded-full"
            onPress={onClose}
          >
            <Text className="text-white text-[17px] font-semibold">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default LogoutConfirmationModal; 