import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import DiamondIcon from '../assets/icons/diamond.svg';
import DiamondIcon2 from '../assets/icons/diamond-2.svg';
import PurchaseSuccessModal from '../components/modals/PurchaseSuccessModal';

type CoinPackage = {
  coins: number;
  price: string;
  selected?: boolean;
};

const coinPackages: CoinPackage[] = Array(12).fill({
  coins: 2000,
  price: 'N2,000'
});

const GetCoinsScreen = () => {
  const router = useRouter();
  const [selectedPackage, setSelectedPackage] = useState<number | null>(0);
  const [isSuccessModalVisible, setSuccessModalVisible] = useState(false);

  const handlePurchase = () => {
    if (selectedPackage !== null) {
      // Handle coin purchase
      console.log('Purchasing coins:', coinPackages[selectedPackage]);
      setSuccessModalVisible(true);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      <View className="flex-row items-center relative px-4 pt-3 pb-3">
        <TouchableOpacity onPress={() => router.back()} className="absolute left-4 z-10">
          <View className="w-14 h-14 bg-[#1A1A1A] rounded-full justify-center items-center">
            <ArrowLeftIcon width={24} height={24}/>
          </View>
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-white text-[20px] font-semibold">Get Coins</Text>
        </View>
      </View>

      <View className="px-4 mt-6">
        <View className="rounded-xl overflow-hidden">
          <LinearGradient
            colors={['#FF0000', '#330000']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="p-6"
          >
            <View className="p-6">
            <Text className="text-[#EDEEF9] text-lg font-semibold">Coins Left</Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-white text-3xl font-bold">300</Text>
              <View className="flex-row items-center">
                <DiamondIcon2 width={60} height={60} />
              </View>
            </View>
            </View>
          </LinearGradient>
        </View>

        <ScrollView 
          className="mt-6" 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View className="flex-row flex-wrap justify-between">
            {coinPackages.map((pkg, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedPackage(index)}
                className={`w-[31%] mb-4 bg-[#1A1A1A] rounded-2xl p-4 ${selectedPackage === index ? 'border-2 border-[#FF0000] bg-[#3D1F1F]' : ''}`}
              >
                <View className="items-center">
                  <DiamondIcon width={32} height={32} />
                  <Text className="text-white text-lg font-semibold mt-2">{pkg.coins}</Text>
                  <Text className="text-white text-base bg-[#414141] rounded-lg px-2 py-1 mt-2">{pkg.price}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          <View className="mb-24 mt-6">
            <TouchableOpacity 
              className="bg-white rounded-full py-4"
              onPress={handlePurchase}
            >
              <Text className="text-gray-800 text-center text-base font-semibold">
                Get Coin Now
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      <PurchaseSuccessModal
        visible={isSuccessModalVisible}
        onClose={() => setSuccessModalVisible(false)}
      />
    </SafeAreaView>
  );
};

export default GetCoinsScreen; 