import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BasicIcon from '../../assets/icons/basic.svg';
import PremiumIcon from '../../assets/icons/premium.svg';
import VIPIcon from '../../assets/icons/vip.svg';
import VVIPIcon from '../../assets/icons/vvip.svg';

export type TierLevel = 'basic' | 'premium' | 'vip' | 'vvip';

interface TierAccessModalProps {
  visible: boolean;
  onClose: () => void;
  userTier: TierLevel;
  requiredTier: TierLevel;
  hostName: string;
  streamTitle: string;
}

const TierAccessModal: React.FC<TierAccessModalProps> = ({
  visible,
  onClose,
  userTier,
  requiredTier,
  hostName,
  streamTitle
}) => {
  const handleUpgradeNow = () => {
    onClose();
    router.push('/unlock-level');
  };

  const handleUpgradeLater = () => {
    onClose();
  };

  const getTierIcon = (tier: TierLevel, size: number = 40) => {
    const iconProps = { width: size, height: size };
    switch (tier) {
      case 'basic': return <BasicIcon {...iconProps} />;
      case 'premium': return <PremiumIcon {...iconProps} />;
      case 'vip': return <VIPIcon {...iconProps} />;
      case 'vvip': return <VVIPIcon {...iconProps} />;
      default: return <BasicIcon {...iconProps} />;
    }
  };

  const getTierGradient = (tier: TierLevel): [string, string] => {
    switch (tier) {
      case 'basic': return ['#6B7280', '#4B5563'];
      case 'premium': return ['#3B82F6', '#1E40AF'];
      case 'vip': return ['#8B5CF6', '#6D28D9'];
      case 'vvip': return ['#DC2626', '#7F1D1D']; // Red brand color like EndStreamModal
      default: return ['#6B7280', '#4B5563'];
    }
  };

  const getTierName = (tier: TierLevel): string => {
    switch (tier) {
      case 'basic': return 'Basic';
      case 'premium': return 'Premium';
      case 'vip': return 'VIP';
      case 'vvip': return 'VVIP';
      default: return 'Basic';
    }
  };

  const requiredTierGradient = getTierGradient(requiredTier);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/70 items-center justify-center px-6">
        <View className="bg-gray-800/95 rounded-3xl p-8 w-full max-w-sm items-center">
          
          {/* Tier Icon */}
          <View className="w-20 h-20 rounded-full bg-gray-700 items-center justify-center mb-6">
            {getTierIcon(requiredTier)}
          </View>
          
          {/* Title */}
          <Text className="text-white text-2xl font-bold text-center mb-3">
            {getTierName(requiredTier)} Required
          </Text>
          
          {/* Description */}
          <Text className="text-gray-300 text-base text-center leading-6 mb-8">
            This stream requires {getTierName(requiredTier)} tier access. Upgrade your plan to continue watching.
          </Text>
          
          {/* Action Buttons */}
          <View className="w-full space-y-4">
            {/* Upgrade Now Button */}
            <View className="w-full h-[52px] rounded-full overflow-hidden mb-4">
              <LinearGradient
                colors={requiredTierGradient}
                locations={[0, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="w-full h-full"
              >
                <TouchableOpacity 
                  className="w-full h-full items-center justify-center"
                  onPress={handleUpgradeNow}
                >
                  <Text className="text-white text-[17px] font-semibold">
                    Upgrade to {getTierName(requiredTier)}
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
            
            {/* Maybe Later Button */}
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
                  onPress={handleUpgradeLater}
                >
                  <Text className="text-white text-[17px] font-semibold">
                    Maybe Later
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

export default TierAccessModal;
