import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import CancelIcon from '../../../assets/icons/cancel.svg';
import DiamondSvg from '../../../assets/icons/diamond-2.svg';

interface CoinPackage {
  id: number;
  name: string;
  coins: number;
  price: number;
  currency: string;
  bonus_coins: number;
  total_coins: number;
  formatted_price: string;
  display_order: number;
  is_active: boolean;
}

interface CoinPurchaseModalProps {
  visible: boolean;
  onClose: () => void;
  coinPackages: CoinPackage[];
  onPurchase: (packageData: CoinPackage) => void;
  walletBalance: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  isPurchasing: boolean;
}

// Diamond icon component
const DiamondIcon = ({ size = 40, color = "#60A5FA" }: { size?: number; color?: string }) => (
  <View 
    style={{ 
      width: size, 
      height: size, 
      transform: [{ rotate: '45deg' }],
      backgroundColor: color,
      borderRadius: 8,
    }} 
  />
);

export const CoinPurchaseModal = ({
  visible,
  onClose,
  coinPackages,
  onPurchase,
  walletBalance,
  isRefreshing,
  onRefresh,
  isPurchasing
}: CoinPurchaseModalProps) => {
  const [selectedPackage, setSelectedPackage] = React.useState<CoinPackage | null>(null);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-[#1A1A1A]/80 rounded-t-3xl" style={{ height: '70%' }}>
          {/* Header */}
          <View className="items-center py-6">
            <View className="w-12 h-1 bg-gray-600 rounded-full mb-4" />
            
            {/* Close Button */}
            <TouchableOpacity
              onPress={onClose}
              className="absolute top-4 right-4 w-12 h-12 rounded-full bg-gray-500 items-center justify-center"
            >
              <CancelIcon width={20} height={20} />
            </TouchableOpacity>
            
            {/* Diamond Icon */}
            <View className="mb-2">
              <DiamondSvg width={40} height={36} />
            </View>
            
            {/* Title */}
            <Text className="text-white text-xl font-bold mb-2">Get more Riz</Text>
            
            {/* Total Balance */}
            <View className="flex-row items-center">
              <Text className="text-gray-400 text-base mr-2">Total Balance:</Text>
              <Ionicons name="diamond" size={16} color="#60A5FA" />
              <Text className="text-yellow-400 font-semibold ml-1 text-base">{walletBalance}</Text>
            </View>
          </View>

          {/* Riz Packages Grid */}
          <ScrollView
            className="flex-1 px-6"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor="#fff"
              />
            }
          >
            <View className="flex-row flex-wrap justify-between pb-8" style={{ gap: 12 }}>
              {coinPackages.map((coinPackage, index) => (
                <TouchableOpacity
                  key={coinPackage.id}
                  onPress={() => setSelectedPackage(coinPackage)}
                  style={{ width: '22%' }}
                  activeOpacity={0.7}
                >
                  <View className={`rounded-xl p-3 items-center h-28 justify-between ${
                    selectedPackage?.id === coinPackage.id 
                      ? 'bg-red-900/40 border-2 border-red-500' 
                      : 'bg-gray-800/80 border border-gray-600'
                  }`}>
                    {/* Diamond Icon */}
                    <DiamondSvg width={24} height={22} />
                    
                    {/* Riz Amount - Use total_coins which includes bonus */}
                    <Text className="text-white text-base font-semibold">
                      {coinPackage.total_coins?.toLocaleString() || coinPackage.coins?.toLocaleString()}
                    </Text>
                    
                    {/* Price - Use formatted_price if available */}
                    <View className="bg-gray-900/90 rounded-md px-2 py-1 w-full">
                      <Text className="text-gray-300 text-xs font-medium text-center">
                        {coinPackage.formatted_price || `${coinPackage.currency}${coinPackage.price}`}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Recharge Button */}
          <View className="px-6 pb-8">
            <View className="w-full h-[52px] rounded-full overflow-hidden">
              <LinearGradient
                colors={selectedPackage && !isPurchasing ? ['#FF0000', '#330000'] : ['#6B7280', '#374151']}
                locations={[0, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="w-full h-full"
              >
                <TouchableOpacity
                  className="w-full h-full items-center justify-center"
                  disabled={!selectedPackage || isPurchasing}
                  activeOpacity={0.8}
                  onPress={() => selectedPackage && onPurchase(selectedPackage)}
                >
                  {isPurchasing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-white text-lg font-bold">
                      {selectedPackage 
                        ? `Recharge ${selectedPackage.formatted_price || `${selectedPackage.currency}${selectedPackage.price}`}` 
                        : 'Recharge'
                      }
                    </Text>
                  )}
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
