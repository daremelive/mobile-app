import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

interface EndStreamModalProps {
  visible: boolean;
  onCancel: () => void;
  onEndStream: () => void;
  isLoading?: boolean;
}

export const EndStreamModal: React.FC<EndStreamModalProps> = ({
  visible,
  onCancel,
  onEndStream,
  isLoading = false,
}) => {
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
            <Ionicons name="stop-circle" size={40} color="#DC2626" />
          </View>
          
          <Text className="text-white text-2xl font-bold text-center mb-3">
            End Stream
          </Text>
          
          <Text className="text-gray-300 text-base text-center leading-6 mb-8">
            Are you sure you want to end your live stream? Your viewers will no longer be able to watch and all stream data will be saved.
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
                    Not Now
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
                  onPress={onEndStream}
                  disabled={isLoading}
                >
                  <Text className="text-white text-[17px] font-semibold">
                    {isLoading ? 'Ending Stream...' : 'End Stream'}
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
