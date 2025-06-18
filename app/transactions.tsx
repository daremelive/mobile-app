import React from 'react';
import { View, Text, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import ChartIncreaseIcon from '../assets/icons/chart-increase.svg';
import ChartDecreaseIcon from '../assets/icons/chart-decrease.svg';

type Transaction = {
  id: string;
  type: 'withdrawal' | 'gift_received' | 'gifted' | 'wallet_funded';
  amount: string;
  date: string;
  time: string;
  recipient?: string;
};

const transactions: Transaction[] = [
  { id: '1', type: 'withdrawal', amount: 'N20,000', date: '13/08/2023', time: '20:24:12' },
  { id: '2', type: 'gift_received', amount: 'N20,000', date: '13/08/2023', time: '20:24:12' },
  { id: '3', type: 'withdrawal', amount: 'N20,000', date: '13/08/2023', time: '20:24:12' },
  { id: '4', type: 'gifted', amount: 'N20,000', date: '13/08/2023', time: '20:24:12', recipient: 'Modesta01' },
  { id: '5', type: 'wallet_funded', amount: 'N20,000', date: '13/08/2023', time: '20:24:12' },
  { id: '6', type: 'gifted', amount: 'N20,000', date: '13/08/2023', time: '20:24:12', recipient: 'sammy8' },
  { id: '7', type: 'withdrawal', amount: 'N20,000', date: '13/08/2023', time: '20:24:12' },
  { id: '8', type: 'gift_received', amount: 'N20,000', date: '13/08/2023', time: '20:24:12' },
  { id: '9', type: 'gift_received', amount: 'N20,000', date: '13/08/2023', time: '20:24:12' },
];

const TransactionScreen = () => {
  const router = useRouter();

  const getTransactionLabel = (type: Transaction['type'], recipient?: string) => {
    switch (type) {
      case 'withdrawal':
        return 'Withdrawal';
      case 'gift_received':
        return 'Gift Received';
      case 'gifted':
        return `Gifted ~${recipient}`;
      case 'wallet_funded':
        return 'Wallet Funded';
      default:
        return '';
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isOutgoing = item.type === 'withdrawal' || item.type === 'gifted';
    const Icon = isOutgoing ? ChartDecreaseIcon : ChartIncreaseIcon;

    return (
      <View className="flex-row items-center justify-between py-4">
        <View className="flex-row items-center">
          <View className="w-12 h-12 rounded-full justify-center items-center bg-[#121313]">
            <Icon width={20} height={20} />
          </View>
          <View className="ml-3">
            <Text className="text-white text-base">{getTransactionLabel(item.type, item.recipient)}</Text>
            <Text className="text-[#666] text-sm">{`${item.date}   ${item.time}`}</Text>
          </View>
        </View>
        <Text className="text-white text-base">{item.amount}</Text>
      </View>
    ); 
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
          <Text className="text-white text-[20px] font-semibold">Transactions</Text>
        </View>
      </View>

      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

export default TransactionScreen; 