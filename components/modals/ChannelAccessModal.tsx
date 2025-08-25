import React from 'react';
import { View, Text, Modal, TouchableOpacity, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import LockIcon from '../../assets/icons/lock.svg';
import DiamondIcon from '../../assets/icons/diamond.svg';
import StarIcon from '../../assets/icons/stars.svg';
import CrownIcon from '../../assets/icons/crown.svg';

interface ChannelAccessModalProps {
  visible: boolean;
  onClose: () => void;
  channelName: string;
  channelCode: string;
  requiredTier: string;
  coinsNeeded: number;
  currentCoins: number;
  unlockMessage: string;
}

const ChannelAccessModal: React.FC<ChannelAccessModalProps> = ({
  visible,
  onClose,
  channelName,
  channelCode,
  requiredTier,
  coinsNeeded,
  currentCoins,
  unlockMessage
}) => {
  const getTierIcon = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'premium':
        return <DiamondIcon width={24} height={24} className="text-blue-400" />;
      case 'vip':
        return <StarIcon width={24} height={24} className="text-purple-400" />;
      case 'vvip':
        return <StarIcon width={24} height={24} className="text-yellow-400" />;
      default:
        return <LockIcon width={24} height={24} className="text-gray-400" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'premium':
        return 'from-blue-500 to-blue-600';
      case 'vip':
        return 'from-purple-500 to-purple-600';
      case 'vvip':
        return 'from-yellow-500 to-yellow-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getChannelDisplayName = (code: string) => {
    switch (code) {
      case 'video':
        return '📺 Normal Live';
      case 'game':
        return '🎮 Gaming';
      case 'truth-or-dare':
        return '💫 Truth or Dare';
      case 'banter':
        return '💎 Banter';
      default:
        return channelName;
    }
  };

  const handleUpgradeNow = () => {
    onClose();
    // Navigate to get coins screen (which has upgrade options)
    router.push('/get-coins');
  };

  const handleGetCoins = () => {
    onClose();
    // Navigate to get coins screen
    router.push('/get-coins');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={20} tint="dark" className="flex-1 justify-center items-center px-6">
        <View className="bg-[#1C1C1E] rounded-3xl p-6 w-full max-w-sm border border-[#333333]">
          {/* Header with Channel Icon */}
          <View className="items-center mb-6">
            <View className="w-16 h-16 bg-[#2C2C2E] rounded-2xl items-center justify-center mb-4">
              <Text className="text-3xl">
                {channelCode === 'video' && '📺'}
                {channelCode === 'game' && '🎮'}
                {channelCode === 'truth-or-dare' && '💫'}
                {channelCode === 'banter' && '💎'}
              </Text>
            </View>
            <Text className="text-white text-xl font-bold text-center">
              {getChannelDisplayName(channelCode)}
            </Text>
            <Text className="text-gray-400 text-sm text-center mt-2">
              Exclusive Content
            </Text>
          </View>

          {/* Lock Icon */}
          <View className="items-center mb-6">
            <View className="w-12 h-12 bg-red-500/20 rounded-full items-center justify-center mb-3">
              <LockIcon width={20} height={20} className="text-red-400" />
            </View>
            <Text className="text-white text-lg font-semibold text-center">
              Upgrade Required
            </Text>
          </View>

          {/* Tier Requirement */}
          <View className={`bg-gradient-to-r ${getTierColor(requiredTier)} rounded-2xl p-4 mb-6`}>
            <View className="flex-row items-center justify-center mb-2">
              {getTierIcon(requiredTier)}
              <Text className="text-white text-lg font-bold ml-2">
                {requiredTier} Tier
              </Text>
            </View>
            <Text className="text-white/90 text-sm text-center">
              {unlockMessage}
            </Text>
          </View>

          {/* Progress */}
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-400 text-sm">Your Progress</Text>
              <Text className="text-white text-sm font-semibold">
                {currentCoins} / {currentCoins + coinsNeeded} Riz
              </Text>
            </View>
            <View className="bg-[#2C2C2E] rounded-full h-2">
              <View 
                className="bg-gradient-to-r from-blue-400 to-purple-500 rounded-full h-2"
                style={{ 
                  width: `${Math.max(10, (currentCoins / (currentCoins + coinsNeeded)) * 100)}%` 
                }}
              />
            </View>
            <Text className="text-center text-gray-400 text-xs mt-2">
              {coinsNeeded} more Riz needed
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="space-y-3">
            <TouchableOpacity
              onPress={handleUpgradeNow}
              className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl py-4 px-6"
            >
              <Text className="text-white text-center text-lg font-bold">
                Upgrade Now
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleGetCoins}
              className="bg-[#2C2C2E] rounded-2xl py-4 px-6 border border-[#404040]"
            >
              <Text className="text-white text-center text-base font-semibold">
                Get Riz
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              className="py-3"
            >
              <Text className="text-gray-400 text-center text-base">
                Maybe Later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
};

export default ChannelAccessModal;
