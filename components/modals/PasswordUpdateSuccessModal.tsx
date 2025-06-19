import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import CheckIcon from '../../assets/icons/check.svg';
import StarsIcon from '../../assets/icons/stars.svg';
import SuccessIcon from '../../assets/icons/success.svg';

interface PasswordUpdateSuccessModalProps {
  visible: boolean;
  onDone: () => void;
}

const PasswordUpdateSuccessModal: React.FC<PasswordUpdateSuccessModalProps> = ({
  visible,
  onDone,
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onDone}
    >
      <View className="flex-1 justify-center items-center bg-black/80">
        <View className="bg-[#1E1E1E] rounded-2xl p-6 items-center w-[95%] relative">
          <View className="relative w-20 h-20 mb-4">
          <View className="w-16 h-16 rounded-full bg-white justify-center items-center mb-4">
            <SuccessIcon width={80} height={80} />
          </View>
          </View>
          
          <Text className="text-white text-xl font-bold mb-2 text-center">Password Update Successful</Text>
          <Text className="text-[#EBEBF599] text-base text-center mb-6 max-w-[90%]">
            For security, we've logged you out. Just sign back in with your new password when you're ready.
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
              onPress={onDone}
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

export default PasswordUpdateSuccessModal; 