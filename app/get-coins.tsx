import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import DiamondIcon from '../assets/icons/diamond.svg';
import DiamondIcon2 from '../assets/icons/diamond-2.svg';
import PurchaseSuccessModal from '../components/modals/PurchaseSuccessModal';
import { 
  useGetCoinPackagesQuery,
  useGetWalletSummaryQuery,
  useGetCoinExchangeRateQuery,
  usePurchaseCoinsMutation 
} from '../src/api/walletApi';

const GetCoinsScreen = () => {
  const router = useRouter();
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [isSuccessModalVisible, setSuccessModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // RTK Query hooks
  const { data: coinPackages, isLoading: packagesLoading, error: packagesError, refetch: refetchPackages } = useGetCoinPackagesQuery();
  const { data: walletSummary, isLoading: walletLoading, error: walletError, refetch: refetchWallet } = useGetWalletSummaryQuery();
  const { data: exchangeRate, isLoading: exchangeLoading, error: exchangeError, refetch: refetchExchangeRate } = useGetCoinExchangeRateQuery();
  const [purchaseCoins, { isLoading: purchasing }] = usePurchaseCoinsMutation();

  // Function to calculate Naira equivalent of coins
  const calculateNairaEquivalent = (coins: number) => {
    if (!exchangeRate) return 'N/A';
    const nairaValue = (coins * exchangeRate.rate_per_coin);
    return `₦${Math.round(nairaValue).toLocaleString('en-NG')}`;
  };

  // Function to format package price without decimals
  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `₦${Math.round(numPrice).toLocaleString('en-NG')}`;
  };

  // Debug logging
  console.log('🔍 Get-Coins Debug Info:');
  console.log('  Packages Loading:', packagesLoading);
  console.log('  Packages Error:', packagesError);
  console.log('  Packages Data:', coinPackages ? `${coinPackages.length} packages` : coinPackages === undefined ? 'undefined packages' : 'No packages');
  console.log('  Wallet Loading:', walletLoading);
  console.log('  Wallet Error:', walletError);
  console.log('  Wallet Data:', walletSummary ? `${walletSummary.coins} coins` : 'No wallet data');
  console.log('  Exchange Rate Loading:', exchangeLoading);
  console.log('  Exchange Rate Error:', exchangeError);
  console.log('  Exchange Rate Data:', exchangeRate ? exchangeRate.formatted_rate : 'No exchange rate');
  console.log('  🔄 Full Exchange Rate Object:', exchangeRate);

  // Pull-to-refresh function
  const onRefresh = async () => {
    console.log('🔄 Pull-to-refresh triggered');
    setRefreshing(true);
    try {
      await Promise.all([
        refetchPackages(),
        refetchWallet(),
        refetchExchangeRate()
      ]);
    } catch (error) {
      console.error('❌ Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePurchase = async () => {
    if (selectedPackage !== null && coinPackages) {
      try {
        const result = await purchaseCoins({ 
          package_id: coinPackages[selectedPackage].id,
          payment_method: 'paystack'
        }).unwrap();
        
        Alert.alert(
          'Success!', 
          result.message || `Successfully purchased ${result.coins_added} Riz!`,
          [
            {
              text: 'OK',
              onPress: () => {
                setSuccessModalVisible(true);
                refetchWallet();
              }
            }
          ]
        );
      } catch (error: any) {
        const errorMessage = error?.data?.message || error?.data?.detail || 'Failed to purchase coins. Please try again.';
        Alert.alert('Purchase Failed', errorMessage);
      }
    }
  };

  // Handle authentication errors
  const isAuthError = (error: any) => {
    return error?.status === 401 || error?.data?.detail?.includes('Authentication');
  };

  if (packagesLoading || walletLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#090909] justify-center items-center">
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#FF0000" />
        <Text className="text-white mt-4">Loading coin packages...</Text>
      </SafeAreaView>
    );
  }

  // Handle authentication errors
  if (isAuthError(packagesError) || isAuthError(walletError)) {
    return (
      <SafeAreaView className="flex-1 bg-[#090909] justify-center items-center px-6">
        <StatusBar style="light" />
        <Text className="text-white text-xl font-semibold mb-4 text-center">Authentication Required</Text>
        <Text className="text-gray-400 text-center mb-6">
          Please log in to purchase coins.
        </Text>
        <TouchableOpacity 
          onPress={() => router.push('/(auth)/signin')}
          className="bg-[#FF0000] px-8 py-3 rounded-full"
        >
          <Text className="text-white font-semibold">Go to Login</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-gray-400">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

    // Show loading if any data is loading
  if (packagesLoading || walletLoading || exchangeLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#090909] justify-center items-center">
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#FF0000" />
        <Text className="text-white mt-4">Loading coin packages...</Text>
      </SafeAreaView>
    );
  }

  // Handle other errors or missing data
  if (packagesError || walletError || exchangeError) {
    return (
      <SafeAreaView className="flex-1 bg-[#090909] justify-center items-center px-6">
        <StatusBar style="light" />
        <Text className="text-white text-xl font-semibold mb-4 text-center">Unable to Load Coin Packages</Text>
        <Text className="text-gray-400 text-center mb-6">
          There was an error loading coin packages{exchangeError ? ' or exchange rate' : ''}. Please try again.
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-gray-400">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Show loading if data is not yet available (but no errors)
  if (!coinPackages || !walletSummary) {
    return (
      <SafeAreaView className="flex-1 bg-[#090909] justify-center items-center">
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#FF0000" />
        <Text className="text-white mt-4">Loading coin packages...</Text>
      </SafeAreaView>
    );
  }

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
          <Text className="text-white text-[20px] font-semibold">Get Riz</Text>
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
            <Text className="text-[#EDEEF9] text-lg font-semibold">Riz Left</Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-white text-3xl font-bold">{walletSummary.coins}</Text>
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FF0000"
              colors={["#FF0000"]}
              progressBackgroundColor="#1A1A1A"
            />
          }
        >
          <View className="flex-row flex-wrap justify-between">
            {coinPackages && coinPackages.map((pkg, index) => (
              <TouchableOpacity
                key={pkg.id}
                onPress={() => setSelectedPackage(index)}
                className={`w-[31%] mb-4 bg-[#1A1A1A] rounded-2xl p-4 ${selectedPackage === index ? 'border-2 border-[#FF0000] bg-[#3D1F1F]' : ''}`}
              >
                <View className="items-center">
                  <DiamondIcon width={32} height={32} />
                  <Text className="text-white text-lg font-semibold mt-2">{pkg.total_coins.toLocaleString()}</Text>
                  {/* {pkg.bonus_coins > 0 && (
                    <Text className="text-green-400 text-xs">+{pkg.bonus_coins} bonus</Text>
                  )} */}
                  <Text className="text-white text-base bg-[#414141] rounded-lg px-2 py-1 mt-2">{calculateNairaEquivalent(pkg.total_coins)}</Text>
                  {/* {exchangeRate && (
                    <Text className="text-gray-400 text-xs mt-1">
                      ≈ {calculateNairaEquivalent(pkg.total_coins)}
                    </Text>
                  )} */}
                </View>
              </TouchableOpacity>
            ))}
          </View>
          <View className="mb-24 mt-6">
            <TouchableOpacity 
              className={`rounded-full py-4 ${purchasing ? 'bg-gray-500' : 'bg-white'}`}
              onPress={handlePurchase}
              disabled={purchasing || selectedPackage === null}
            >
              {purchasing ? (
                <View className="flex-row justify-center items-center">
                  <ActivityIndicator size="small" color="#090909" />
                  <Text className="text-gray-800 text-center text-base font-semibold ml-2">
                    Processing...
                  </Text>
                </View>
              ) : (
                <Text className="text-gray-800 text-center text-base font-semibold">
                  {selectedPackage !== null ? `Get ${coinPackages?.[selectedPackage]?.total_coins?.toLocaleString()} Riz Now` : 'Select a package'}
                </Text>
              )}
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