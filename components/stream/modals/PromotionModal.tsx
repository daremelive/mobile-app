import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

interface PromotionModalProps {
  visible: boolean;
  onAccept: () => Promise<void>;
  onDecline: () => void;
  hostName: string;
  streamTitle: string;
  seatNumber: number;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({
  visible,
  onAccept,
  onDecline,
  hostName,
  streamTitle,
  seatNumber
}) => {
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await onAccept();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to join as guest. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/70 items-center justify-center px-6">
        <View className="bg-gray-900 rounded-3xl p-8 w-full max-w-sm items-center border border-gray-700">
          {/* Icon */}
          <View className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 items-center justify-center mb-6">
            <Ionicons name="videocam" size={40} color="white" />
          </View>

          {/* Title */}
          <Text className="text-white text-2xl font-bold text-center mb-3">
            You're Invited!
          </Text>

          {/* Host info */}
          <Text className="text-gray-300 text-base text-center mb-2">
            <Text className="font-semibold text-blue-400">@{hostName}</Text> wants you to join as a guest speaker
          </Text>

          {/* Stream title */}
          <Text className="text-gray-400 text-sm text-center mb-6">
            "{streamTitle}"
          </Text>

          {/* Seat info */}
          <View className="bg-gray-800 rounded-xl px-4 py-3 mb-8 w-full">
            <Text className="text-gray-300 text-center text-sm">
              You'll be assigned to{' '}
              <Text className="font-bold text-blue-400">Seat {seatNumber}</Text>
            </Text>
            <Text className="text-gray-500 text-center text-xs mt-1">
              Your camera and microphone will be enabled
            </Text>
          </View>

          {/* Buttons */}
          <View className="w-full space-y-3">
            {/* Accept Button */}
            <TouchableOpacity
              onPress={handleAccept}
              disabled={isAccepting}
              className={`w-full rounded-2xl overflow-hidden ${isAccepting ? 'opacity-70' : ''}`}
            >
              <LinearGradient
                colors={['#3B82F6', '#1D4ED8']}
                className="py-4 px-6 items-center"
              >
                <View className="flex-row items-center">
                  {isAccepting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="checkmark" size={20} color="white" />
                  )}
                  <Text className="text-white text-lg font-bold ml-2">
                    {isAccepting ? 'Joining...' : 'Join as Guest'}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Decline Button */}
            <TouchableOpacity
              onPress={onDecline}
              disabled={isAccepting}
              className="w-full py-4 px-6 border border-gray-600 rounded-2xl items-center"
            >
              <View className="flex-row items-center">
                <Ionicons name="close" size={20} color="#9CA3AF" />
                <Text className="text-gray-400 text-lg font-semibold ml-2">
                  Stay as Viewer
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Info text */}
          <Text className="text-gray-500 text-xs text-center mt-4 leading-4">
            You can leave the guest seat anytime and return to viewer mode
          </Text>
        </View>
      </View>
    </Modal>
  );
};

export default PromotionModal;
