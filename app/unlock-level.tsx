import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import CheckIcon from '../assets/icons/check.svg';
import { LinearGradient } from 'expo-linear-gradient';

// Import Tier-specific Icons
import BasicBadge from '../assets/icons/basic.svg';
import PremiumBadge from '../assets/icons/premium.svg';
import VIPBadge from '../assets/icons/vip.svg';
import VVIPBadge from '../assets/icons/vvip.svg';
import UnlockVVIPModal from '../components/modals/UnlockVVIPModal';

const UnlockLevelScreen = () => {
  const router = useRouter();
  const progress = 0.6; // Example progress
  const [isModalVisible, setModalVisible] = useState(false);

  const handleUnlock = () => {
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  const tiers = [
    {
      name: 'Basic',
      coins: '~ 300 coins',
      status: 'Unlocked',
      badge: BasicBadge,
      color: '#D3E2F6',
      buttonColor: '#EDEEF9',
      textColor: '#9B9CA4',
    },
    {
      name: 'Premium',
      coins: '~ 300 coins',
      status: 'Unlocked',
      badge: PremiumBadge,
      color: '#FCF7E0',
      buttonColor: '#EDEEF9',
      textColor: '#9B9CA4',
    },
    {
      name: 'VIP',
      coins: '~ 300 coins',
      status: 'Current Level',
      badge: VIPBadge,
      color: '#FCE3D5',
      isCurrent: true,
    },
    {
      name: 'VVIP',
      coins: '~ 300 coins',
      status: 'Unlock',
      badge: VVIPBadge,
      color: '#C9CBF7',
      buttonColor: '#FFFFFF',
      textColor: '#090909',
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      <View className="flex-row items-center relative px-4 pt-3 pb-3 mb-6">
        <TouchableOpacity onPress={() => router.back()} className="absolute left-4 z-10 bg-[#1E1E1E] w-14 h-14 rounded-full justify-center items-center">
          <ArrowLeftIcon width={24} height={24} />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-white text-xl font-semibold">Unlock Level</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4">
        <View className="rounded-2xl overflow-hidden mb-8">
          <LinearGradient
            colors={['#FDF2EE', '#FBC19D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View className="flex-row justify-between items-center p-6">
              <View>
                <View>
                  <Text className="text-black text-2xl font-bold">VIP</Text>
                  <Text className="text-black text-sm">~ 300 coins</Text>
                </View>
                
              <Text className="text-black mt-4">Get more points to get to 500</Text>
              <View className="w-full bg-gray-300 rounded-full h-2.5 mt-2">
                <View className="bg-black h-2.5 rounded-full" style={{ width: `${progress * 100}%` }} />
              </View>
              </View>
              <VIPBadge width={80} height={80} />
            </View>
          </LinearGradient>
        </View>

        <Text className="text-white text-xl font-semibold mb-4">Tier System</Text>

        {tiers.map((tier, index) => (
          <View key={index} style={{ backgroundColor: tier.color, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }} className="rounded-xl p-4 mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <tier.badge width={40} height={40} style={{ marginRight: 16 }} />
              <View>
                <Text className="text-black text-lg font-bold">{tier.name}</Text>
                <Text className="text-gray-500">{tier.coins}</Text>
              </View>
            </View>
            {tier.isCurrent ? (
              <View className="flex-row items-center">
                <CheckIcon width={16} height={16} fill="#1D5B1D" />
                <Text className="text-[#1D5B1D] ml-2">Current Level</Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={{ backgroundColor: tier.buttonColor }} 
                className="px-6 py-2 rounded-full"
                onPress={tier.name === 'VVIP' ? handleUnlock : undefined}
              >
                <Text style={{ color: tier.textColor }} className="font-semibold">{tier.status}</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
      <UnlockVVIPModal
        visible={isModalVisible}
        onClose={handleCloseModal}
        onUnlock={() => {
          // Handle unlock logic here
          handleCloseModal();
        }}
      />
    </SafeAreaView>
  );
};

export default UnlockLevelScreen; 