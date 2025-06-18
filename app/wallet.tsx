import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import WalletIcon from '../assets/icons/wallet.svg';
import CoinsIcon from '../assets/icons/coins.svg';
import WithdrawIcon from '../assets/icons/withdraw.svg';
import TransactionIcon from '../assets/icons/transaction.svg';
import VerifiedIcon from '../assets/icons/verified.svg';
import IdentityIcon from '../assets/icons/identity.svg';
import ChevronDownIcon from '../assets/icons/chevron-down.svg';
import { LinearGradient } from 'expo-linear-gradient';

const WalletScreen = () => {
  const router = useRouter();
  const screenWidth = Dimensions.get('window').width;

  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      data: [100, 400, 250, 750, 300, 800],
    }]
  };

  const chartConfig = {
    backgroundGradientFrom: '#090909',
    backgroundGradientTo: '#090909',
    color: (opacity = 1) => `rgba(255, 0, 0, ${opacity})`,
    strokeWidth: 2,
    decimalPlaces: 0,
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      <View className="flex-row items-center relative px-4 pt-3 pb-3 mb-6">
        <TouchableOpacity onPress={() => router.back()} className="absolute left-4 z-10">
          <View className="w-14 h-14 bg-[#1A1A1A] rounded-full justify-center items-center">
            <ArrowLeftIcon width={24} height={24}/>
          </View>
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-white text-[20px] font-semibold">Wallet</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4">
        <View className="rounded-xl overflow-hidden mb-6">
          <LinearGradient
            colors={['#FF0000', '#330000']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View className="p-6">
              <Text className="text-white text-sm mb-1">Wallet Balance</Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-white text-3xl font-bold">N200,000.48</Text>
                <WalletIcon width={50} height={50} className="ml-2" />
              </View>
              <Text className="text-white/70 text-sm mt-1">~ 300 coins</Text>
            </View>
          </LinearGradient>
        </View>

        <Text className="text-white text-xl font-semibold mb-4">Actions</Text>
        <View className="flex-row flex-wrap justify-between">
          <TouchableOpacity 
            className="bg-[#262626] rounded-2xl p-4 w-[48%] mb-4"
            onPress={() => router.push('/get-coins')}
          >
            <View className="gap-1">
              <View className="w-14 h-14 bg-[#3D3E3F] rounded-full justify-center items-center mb-2">
                <CoinsIcon width={24} height={24} className="ml-2 bg-gray-600 rounded-full p-1" />
              </View>
              <Text className="text-white text-base font-semibold">Get more coins</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="bg-[#262626] rounded-2xl p-4 w-[48%] mb-4"
            onPress={() => router.push('/withdraw-money')}
          >
            <View className="gap-1">
              <View className="w-14 h-14 bg-[#3D3E3F] rounded-full justify-center items-center mb-2">
                <WithdrawIcon width={24} height={24} />
              </View>
              <Text className="text-white text-base font-semibold">Withdraw Money</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            className="bg-[#262626] rounded-2xl p-4 w-[48%]"
            onPress={() => router.push('/transactions')}
          >
            <View className="gap-1">
              <View className="w-14 h-14 bg-[#3D3E3F] rounded-full justify-center items-center mb-2">
                <TransactionIcon width={24} height={24} />
              </View>
              <Text className="text-white text-base font-semibold">View transactions</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity className="bg-[#262626] rounded-2xl p-4 w-[48%]">
            <View className="gap-1">
              <View className="flex-row items-center gap-1 justify-between">
                <View className="w-14 h-14 bg-[#3D3E3F] rounded-full justify-center items-center mb-2">
                  <IdentityIcon width={24} height={24} />
                </View>
                <View className="bg-[#FF0000] rounded-full px-4 py-1 mt-1">
                  <Text className="text-white text-base">Verified</Text>
                </View>
              </View>
              <Text className="text-white text-base font-semibold">Identity Verification</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View className="mt-8">
          <View className="flex-row justify-between items-center mb-8">
            <View>
              <Text className="text-white text-xl font-semibold">Analytics</Text>
              <Text className="text-gray-500 text-base">An overview of earnings/rewards</Text>
            </View>
            <TouchableOpacity className="bg-white rounded-lg px-4 py-2 flex-row items-center gap-2">
              <Text className="text-gray-800 text-base">This Year</Text>
              <ChevronDownIcon />
            </TouchableOpacity>
          </View>
          <View className="mb-4">
            <View className="flex-row justify-between mb-4">
              <View className="bg-[#1A1A1A] rounded-2xl p-5 w-[48%]">
                <Text className="text-gray-500 text-sm text-center">Total rewards</Text>
                <Text className="text-white text-xl font-bold text-center">N200,000.48</Text>
              </View>
              <View className="bg-[#1A1A1A] rounded-2xl p-5 w-[48%]">
                <Text className="text-gray-500 text-sm text-center">This year's rewards</Text>
                <Text className="text-white text-xl font-bold text-center">N200,000.48</Text>
              </View>
            </View>
            <LineChart
              data={chartData}
              width={screenWidth - 0}
              height={220}
              chartConfig={chartConfig}
              bezier
              withVerticalLines={false}
              withHorizontalLines={true}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default WalletScreen; 