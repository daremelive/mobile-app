import React from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput } from 'react-native';
import CancelIcon from '../../assets/icons/cancel.svg';
import ChatIcon from '../../assets/icons/chat.svg';
import CommentIcon from '../../assets/icons/comment.svg';
import { LinearGradient } from 'expo-linear-gradient';

interface HelpUsImproveModalProps {
  visible: boolean;
  onClose: () => void;
  onContinue: () => void;
}

const HelpUsImproveModal: React.FC<HelpUsImproveModalProps> = ({
  visible,
  onClose,
  onContinue,
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
            className="absolute bg-[#333333] w-14 h-14 rounded-full justify-center items-center top-4 right-4" 
            onPress={onClose}
          >
            <CancelIcon width={24} height={24} stroke="#8A8A8E" />
          </TouchableOpacity>
          
          <View className="w-16 h-16 rounded-full bg-[#333333] justify-center items-center mb-4">
            <CommentIcon width={24} height={24} />
          </View>
          
          <Text className="text-white text-xl font-bold mb-2 text-center">Help Us Improve</Text>
          <Text className="text-[#8A8A8E] text-base text-center mb-6">
            Let us know why you're deactivating your account.
          </Text>

          <TextInput
            placeholder="Type reason here (Optional)..."
            placeholderTextColor="#8A8A8E"
            className="bg-[#262626] text-white rounded-lg p-4 w-full h-14 mb-6"
            multiline
          />

          {/* <TouchableOpacity 
            className="w-full h-[52px] items-center justify-center bg-[#FF3B30] rounded-full mb-4"
            onPress={onClose}
          >
            <Text className="text-white text-[17px] font-semibold">Cancel</Text>
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

          <TouchableOpacity 
            className="w-full h-[52px] items-center justify-center bg-[#262626] rounded-full"
            onPress={onContinue}
          >
            <Text className="text-white text-[17px] font-semibold">Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default HelpUsImproveModal; 