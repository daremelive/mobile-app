import React from 'react';
import { View, Text, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import ChartIncreaseIcon from '../assets/icons/chart-increase.svg';
import ChartDecreaseIcon from '../assets/icons/chart-decrease.svg';
import { useGetWalletTransactionsQuery } from '../src/api/walletApi';

const TransactionScreen = () => {
  const router = useRouter();

  // API hook to fetch real transactions
  const { data: transactions, isLoading, error, refetch } = useGetWalletTransactionsQuery();

  // Debug logging
  console.log('🔄 Transactions Debug:', {
    isLoading,
    error: error ? JSON.stringify(error) : null,
    dataExists: !!transactions,
    dataLength: transactions?.length || 0,
    sampleData: transactions?.[0]
  });

  const renderTransaction = ({ item }: { item: any }) => {
    const Icon = item.is_outgoing ? ChartDecreaseIcon : ChartIncreaseIcon;

    // Always display Riz amounts for all transactions to avoid multinational confusion
    const displayAmount = item.coins && item.coins !== 0 
      ? `${Math.abs(item.coins)} Riz`
      : item.formatted_amount; // Fallback to currency if no Riz amount available

    return (
      <View className="flex-row items-center justify-between py-4">
        <View className="flex-row items-center">
          <View className="w-12 h-12 rounded-full justify-center items-center bg-[#121313]">
            <Icon width={20} height={20} />
          </View>
          <View className="ml-3">
            <Text className="text-white text-base">{item.display_type}</Text>
            <Text className="text-[#666] text-sm">{`${item.formatted_date}   ${item.formatted_time}`}</Text>
          </View>
        </View>
        <Text className="text-white text-base">{displayAmount}</Text>
      </View>
    ); 
  };

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center px-4">
      <Text className="text-[#666] text-base text-center">No transactions found</Text>
      <TouchableOpacity 
        className="mt-4 bg-[#FF0000] px-6 py-3 rounded-full"
        onPress={() => refetch()}
      >
        <Text className="text-white text-base font-semibold">Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingState = () => (
    <View className="flex-1 justify-center items-center">
      <ActivityIndicator size="large" color="#FF0000" />
      <Text className="text-[#666] text-base mt-4">Loading transactions...</Text>
    </View>
  );

  const renderErrorState = () => (
    <View className="flex-1 justify-center items-center px-4">
      <Text className="text-red-400 text-base text-center mb-4">
        Failed to load transactions
      </Text>
      <TouchableOpacity 
        className="bg-[#FF0000] px-6 py-3 rounded-full"
        onPress={() => refetch()}
      >
        <Text className="text-white text-base font-semibold">Try Again</Text>
      </TouchableOpacity>
    </View>
  );

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
          <Text className="text-white text-[20px] font-semibold">Transactions</Text>
        </View>
      </View>

      {isLoading ? (
        renderLoadingState()
      ) : error ? (
        renderErrorState()
      ) : !transactions || transactions.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

export default TransactionScreen; 