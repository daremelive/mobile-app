import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import WalletIcon from '../assets/icons/wallet.svg';
import Checkbox from '../components/Checkbox';

const WithdrawMoneyScreen = () => {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleWithdraw = () => {
    if (isConfirmed && amount) {
      // Handle withdrawal logic here
      console.log('Withdrawing:', amount);
      router.back();
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
          <Text className="text-white text-[20px] font-semibold">Withdrawal</Text>
        </View>
      </View>

      <View className="px-4 mt-6">
        <View className="bg-[#FF0000] rounded-2xl p-6">
          <Text className="text-white text-sm mb-1">Wallet Balance</Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-white text-2xl font-bold">N200,000.48</Text>
            <WalletIcon width={50} height={50} className="ml-2" />
          </View>
          <Text className="text-white/70 text-sm mt-1">Access Bank: 12393940408</Text>
        </View>

        <View className="mt-8">
          <Text className="text-white text-base mb-2">Amount</Text>
          <TextInput
            placeholder="Enter amount"
            placeholderTextColor="#666"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            className="bg-[#1A1A1A] rounded-full border border-[#353638] px-4 py-4 text-white text-base"
          />
        </View>

        <TouchableOpacity 
          className="flex-row items-center mt-6"
          onPress={() => setIsConfirmed(!isConfirmed)}
        >
          <Checkbox
            checked={isConfirmed}
            onChange={setIsConfirmed}
          />
          <Text className="text-white text-base ml-2">Confirm this action</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className={`rounded-full py-4 mt-6 ${isConfirmed && amount ? 'bg-[#FF0000]' : 'bg-[#333]'}`}
          onPress={handleWithdraw}
          disabled={!isConfirmed || !amount}
        >
          <Text className="text-white text-center text-base font-semibold">
            Withdraw Money
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default WithdrawMoneyScreen; 