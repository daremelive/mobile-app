import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

interface LeaveConfirmationModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
}

export const LeaveConfirmationModal = ({
  visible,
  onCancel,
  onConfirm,
  title = "Leave Stream?",
  message = "Are you sure you want to leave this stream?",
  confirmText = "Leave Stream",
  cancelText = "Cancel",
  isLoading = false,
  iconName = "exit-outline"
}: LeaveConfirmationModalProps) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <View className="flex-1 bg-black/70 items-center justify-center px-6">
        <View className="bg-gray-800/95 rounded-3xl p-8 w-full max-w-sm items-center">
          <View className="w-20 h-20 rounded-full bg-gray-700 items-center justify-center mb-6">
            <Ionicons name={iconName} size={40} color="#DC2626" />
          </View>
          
          <Text className="text-white text-2xl font-bold text-center mb-3">
            {title}
          </Text>
          
          <Text className="text-gray-300 text-base text-center leading-6 mb-8">
            {message}
          </Text>
          
          <View className="w-full space-y-3">
            <View className="w-full h-[52px] rounded-full overflow-hidden mb-6">
              <LinearGradient
                colors={['#DC2626', '#7F1D1D']}
                locations={[0, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="w-full h-full"
              >
                <TouchableOpacity 
                  className="w-full h-full items-center justify-center"
                  onPress={onCancel}
                  disabled={isLoading}
                >
                  <Text className="text-white text-[17px] font-semibold">
                    {cancelText}
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
            
            <View className="w-full h-[52px] rounded-full overflow-hidden">
              <LinearGradient
                colors={['#6B7280', '#374151']}
                locations={[0, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="w-full h-full"
              >
                <TouchableOpacity 
                  className="w-full h-full items-center justify-center"
                  onPress={onConfirm}
                  disabled={isLoading}
                >
                  <Text className="text-white text-[17px] font-semibold">
                    {confirmText}
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
