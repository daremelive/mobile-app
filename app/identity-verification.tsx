import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import { LinearGradient } from 'expo-linear-gradient';
import VerificationInProgressModal from '../components/modals/VerificationInProgressModal';

const IdentityVerificationScreen = () => {
  const router = useRouter();
  const [isModalVisible, setModalVisible] = useState(false);

  const handleVerify = () => {
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    router.back(); // Or navigate to another screen
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      <View className="flex-row items-center relative px-4 pt-3 pb-3 mb-6">
        <TouchableOpacity onPress={() => router.back()} className="absolute left-4 z-10 bg-[#1E1E1E] w-14 h-14 rounded-full justify-center items-center">
          <ArrowLeftIcon width={24} height={24} />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-white text-xl font-semibold">Identity Verification</Text>
        </View>
      </View>

      <View className="flex-1 px-4">
        <View className="bg-[#C4A020]/20 border border-yellow-400 rounded-lg p-4 mb-8">
          <Text className="text-white font-bold text-base mb-2">Input Bank Verification Number</Text>
          <Text className="text-gray-400">
            To unlock additional features and fully enjoy the benefits of our platform, please verify your <Text className="font-bold">BVN</Text>
          </Text>
        </View>

        <View>
          <Text className="text-white mb-2">BVN</Text>
          <TextInput
            placeholder="Enter your 11 digit number"
            placeholderTextColor="#8A8A8E"
            className="bg-[#1C1C1E] text-white rounded-full border border-[#333333] p-4 w-full h-14 mb-8"
            keyboardType="number-pad"
            maxLength={11}
          />
        </View>

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
              onPress={handleVerify}
            >
              <Text className="text-white text-[17px] font-semibold">Verify</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
      <VerificationInProgressModal
        visible={isModalVisible}
        onClose={handleCloseModal}
      />
    </SafeAreaView>
  );
};

export default IdentityVerificationScreen; 