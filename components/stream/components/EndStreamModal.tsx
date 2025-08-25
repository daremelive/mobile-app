import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

interface EndStreamModalProps {
  visible: boolean;
  onCancel: () => void;
  onEndStream: () => void;
  isLoading?: boolean;
  streamStatus?: 'live' | 'ended' | 'disconnected' | null;
}

export const EndStreamModal: React.FC<EndStreamModalProps> = ({
  visible,
  onCancel,
  onEndStream,
  isLoading = false,
  streamStatus,
}) => {
  // Determine if stream is already ended or disconnected
  const isStreamEnded = streamStatus === 'ended' || streamStatus === 'disconnected';
  
  // Dynamic content based on stream status
  const getModalContent = () => {
    if (isStreamEnded) {
      return {
        title: 'Stream Ended',
        description: 'Your stream has ended due to connection issues or app interruption. Tap "Close Stream" to return to the home screen.',
        primaryButtonText: 'Close Stream',
        secondaryButtonText: 'Stay Here',
        icon: 'checkmark-circle' as const,
        iconColor: '#10B981', // Green for ended
      };
    }
    
    return {
      title: 'End Stream',
      description: 'Are you sure you want to end your live stream? Your viewers will no longer be able to watch and all stream data will be saved.',
      primaryButtonText: isLoading ? 'Ending Stream...' : 'End Stream',
      secondaryButtonText: 'Not Now',
      icon: 'stop-circle' as const,
      iconColor: '#DC2626', // Red for stopping
    };
  };

  const content = getModalContent();
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
            <Ionicons name={content.icon} size={40} color={content.iconColor} />
          </View>
          
          <Text className="text-white text-2xl font-bold text-center mb-3">
            {content.title}
          </Text>
          
          <Text className="text-gray-300 text-base text-center leading-6 mb-8">
            {content.description}
          </Text>
          
          <View className="w-full space-y-3">
            <View className="w-full h-[52px] rounded-full overflow-hidden mb-6">
              <LinearGradient
                colors={isStreamEnded ? ['#10B981', '#059669'] : ['#DC2626', '#7F1D1D']}
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
                    {content.secondaryButtonText}
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
                    {content.primaryButtonText}
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
