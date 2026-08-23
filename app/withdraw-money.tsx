import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import WalletIcon from '../assets/icons/wallet.svg';
import Checkbox from '../components/Checkbox';
import { useGetWalletSummaryQuery, useWithdrawMoneyMutation } from '../src/api/walletApi';
import { useTranslation } from '../src/hooks/useTranslation';
import { logger } from '../src/utils/logger';

const WithdrawMoneyScreen = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);

  // API hooks
  const { data: walletData, isLoading: isLoadingWallet, error: walletError } = useGetWalletSummaryQuery();
  const [withdrawMoney, { isLoading: isWithdrawing }] = useWithdrawMoneyMutation();

  const handleWithdraw = async () => {
    if (!isConfirmed || !amount) {
      Alert.alert(t('common.error') as string, t('wallet.pleaseEnterAmountAndConfirm', 'Please enter an amount and confirm the action') as string);
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert(t('common.error') as string, t('wallet.pleaseEnterValidAmount', 'Please enter a valid amount') as string);
      return;
    }

    try {
      const result = await withdrawMoney({ amount: numericAmount }).unwrap();
      
      if (result.status === 'success') {
        Alert.alert(
          t('common.success') as string,
          result.message,
          [
            {
              text: t('common.ok') as string,
              onPress: () => {
                setAmount('');
                setIsConfirmed(false);
                router.back();
              }
            }
          ]
        );
      } else {
        Alert.alert(t('common.error') as string, result.message);
      }
    } catch (error: any) {
      logger.error('Withdrawal error:', error);
      const errorMessage = error.data?.message || t('wallet.withdrawalError') as string;
      Alert.alert(t('common.error') as string, errorMessage);
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
          <Text className="text-white text-[20px] font-semibold">{t('wallet.withdrawMoney') as string}</Text>
        </View>
      </View>

      <View className="px-4 mt-6">
        <View className="bg-[#FF0000] rounded-2xl p-6">
          <Text className="text-white text-sm mb-1">{t('wallet.balance') as string}</Text>
          <View className="flex-row items-center justify-between">
            {isLoadingWallet ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : walletError ? (
              <Text className="text-red-400 text-lg">{t('wallet.errorLoadingBalance', 'Error loading balance') as string}</Text>
            ) : (
              <Text className="text-white text-2xl font-bold">
                {walletData?.balance ? `${Number(walletData.balance).toFixed(0)} ${t('currency.riz') as string}` : `0 ${t('currency.riz') as string}`}
              </Text>
            )}
            <WalletIcon width={50} height={50} className="ml-2" />
          </View>
        </View>

        <View className="mt-8">
          <Text className="text-white text-base mb-2">{t('wallet.amount') as string}</Text>
          <TextInput
            placeholder={t('wallet.enterAmount') as string}
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
          <Text className="text-white text-base ml-2">{t('wallet.confirmAction', 'Confirm this action') as string}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className={`rounded-full py-4 mt-6 ${isConfirmed && amount && !isWithdrawing ? 'bg-[#FF0000]' : 'bg-[#333]'}`}
          onPress={handleWithdraw}
          disabled={!isConfirmed || !amount || isWithdrawing}
        >
          {isWithdrawing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white text-center text-base font-semibold">
              {t('wallet.withdrawMoney') as string}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default WithdrawMoneyScreen;
