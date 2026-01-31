import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl, Platform } from 'react-native';
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
import { useIAP } from '../src/hooks/useIAP';
import { IAPProduct } from '../src/services/iapService';

const GetCoinsScreen = () => {
  const router = useRouter();
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [selectedIAPProduct, setSelectedIAPProduct] = useState<IAPProduct | null>(null);
  const [isSuccessModalVisible, setSuccessModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Apple IAP Hook (only active on iOS)
  const { 
    isInitialized: iapInitialized,
    isLoading: iapLoading,
    isPurchasing: iapPurchasing,
    products: iapProducts,
    purchaseProduct,
    restorePurchases,
    refreshProducts,
    isIOS,
    isAvailable: iapAvailable,
  } = useIAP();

  // RTK Query hooks (used for non-iOS or fallback)
  const { data: coinPackages, isLoading: packagesLoading, error: packagesError, refetch: refetchPackages } = useGetCoinPackagesQuery();
  const { data: walletSummary, isLoading: walletLoading, error: walletError, refetch: refetchWallet } = useGetWalletSummaryQuery();
  const { data: exchangeRate, isLoading: exchangeLoading, error: exchangeError, refetch: refetchExchangeRate } = useGetCoinExchangeRateQuery();
  const [purchaseCoins, { isLoading: purchasing }] = usePurchaseCoinsMutation();

  // Determine if we should use IAP (iOS with available products)
  const useAppleIAP = isIOS && iapAvailable && iapProducts.length > 0;

  // Function to calculate Riz equivalent of coins
  const calculateRizEquivalent = (coins: number) => {
    if (!exchangeRate) return 'N/A';
    const rizValue = (coins * exchangeRate.rate_per_coin);
    return `${Math.round(rizValue)} Riz`;
  };

  // Function to format package price without decimals
  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `₦${Math.round(numPrice).toLocaleString('en-NG')}`;
  };

  // Pull-to-refresh function
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const refreshPromises = [
        refetchPackages(),
        refetchWallet(),
        refetchExchangeRate()
      ];
      
      // Also refresh IAP products on iOS
      if (isIOS && iapInitialized) {
        refreshPromises.push(refreshProducts());
      }
      
      await Promise.all(refreshPromises);
    } catch (error) {
      // Silent refresh failure
    } finally {
      setRefreshing(false);
    }
  };

  // Handle Apple IAP purchase
  const handleIAPPurchase = async () => {
    if (!selectedIAPProduct) {
      Alert.alert('Error', 'Please select a package');
      return;
    }

    try {
      const result = await purchaseProduct(selectedIAPProduct.productId);
      
      if (result.success) {
        setSuccessModalVisible(true);
        setSelectedIAPProduct(null);
      }
      // Error handling is done in the hook
    } catch (error: any) {
      // Already handled in hook
    }
  };

  // Handle legacy/fallback purchase (Paystack)
  const handleLegacyPurchase = async () => {
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

  // Unified purchase handler
  const handlePurchase = async () => {
    if (useAppleIAP) {
      await handleIAPPurchase();
    } else {
      await handleLegacyPurchase();
    }
  };

  // Handle restore purchases (iOS only)
  const handleRestorePurchases = async () => {
    if (isIOS && iapInitialized) {
      await restorePurchases();
    }
  };

  // Handle authentication errors
  const isAuthError = (error: any) => {
    return error?.status === 401 || error?.data?.detail?.includes('Authentication');
  };

  // Combined loading state
  const isLoading = packagesLoading || walletLoading || (isIOS && iapLoading);
  const isPurchasingAny = purchasing || iapPurchasing;

  if (isLoading) {
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

  // Determine which products to display
  const displayProducts = useAppleIAP ? iapProducts : coinPackages;

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
          {/* IAP Products (iOS) */}
          {useAppleIAP && (
            <View className="flex-row flex-wrap justify-between">
              {iapProducts.map((product, index) => (
                <TouchableOpacity
                  key={product.productId}
                  onPress={() => {
                    setSelectedIAPProduct(product);
                    setSelectedPackage(null);
                  }}
                  className={`w-[31%] mb-4 bg-[#1A1A1A] rounded-2xl p-4 ${selectedIAPProduct?.productId === product.productId ? 'border-2 border-[#FF0000] bg-[#3D1F1F]' : ''}`}
                >
                  <View className="items-center">
                    <DiamondIcon width={32} height={32} />
                    <Text className="text-white text-lg font-semibold mt-2">{product.rizAmount.toLocaleString()}</Text>
                    <Text className="text-white text-base bg-[#414141] rounded-lg px-2 py-1 mt-2">{product.price}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Legacy Packages (non-iOS or fallback) */}
          {!useAppleIAP && (
            <View className="flex-row flex-wrap justify-between">
              {coinPackages && coinPackages.map((pkg, index) => (
                <TouchableOpacity
                  key={pkg.id}
                  onPress={() => {
                    setSelectedPackage(index);
                    setSelectedIAPProduct(null);
                  }}
                  className={`w-[31%] mb-4 bg-[#1A1A1A] rounded-2xl p-4 ${selectedPackage === index ? 'border-2 border-[#FF0000] bg-[#3D1F1F]' : ''}`}
                >
                  <View className="items-center">
                    <DiamondIcon width={32} height={32} />
                    <Text className="text-white text-lg font-semibold mt-2">{pkg.total_coins.toLocaleString()}</Text>
                    <Text className="text-white text-base bg-[#414141] rounded-lg px-2 py-1 mt-2">{calculateRizEquivalent(pkg.total_coins)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View className="mb-24 mt-6">
            <TouchableOpacity 
              className={`rounded-full py-4 ${isPurchasingAny ? 'bg-gray-500' : 'bg-white'}`}
              onPress={handlePurchase}
              disabled={isPurchasingAny || (useAppleIAP ? !selectedIAPProduct : selectedPackage === null)}
            >
              {isPurchasingAny ? (
                <View className="flex-row justify-center items-center">
                  <ActivityIndicator size="small" color="#090909" />
                  <Text className="text-gray-800 text-center text-base font-semibold ml-2">
                    Processing...
                  </Text>
                </View>
              ) : (
                <Text className="text-gray-800 text-center text-base font-semibold">
                  {useAppleIAP 
                    ? (selectedIAPProduct ? `Get ${selectedIAPProduct.rizAmount.toLocaleString()} Riz Now` : 'Select a package')
                    : (selectedPackage !== null ? `Get ${coinPackages?.[selectedPackage]?.total_coins?.toLocaleString()} Riz Now` : 'Select a package')
                  }
                </Text>
              )}
            </TouchableOpacity>

            {/* Restore Purchases Button (iOS only) */}
            {isIOS && iapInitialized && (
              <TouchableOpacity 
                className="mt-4 py-3"
                onPress={handleRestorePurchases}
                disabled={iapLoading}
              >
                <Text className="text-gray-400 text-center text-sm underline">
                  Restore Purchases
                </Text>
              </TouchableOpacity>
            )}
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