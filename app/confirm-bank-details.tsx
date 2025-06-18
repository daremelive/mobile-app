import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import { LinearGradient } from 'expo-linear-gradient';

const ConfirmBankDetailsScreen = () => {
  const router = useRouter();

  const bankDetails = {
    accountName: 'Modesta Ekeh Chioma',
    accountNo: '0123456789',
    bankName: 'GT BANK',
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      <View className="flex-row items-center px-4 pt-3 pb-3">
        <TouchableOpacity onPress={() => router.back()} className="bg-[#1E1E1E] w-14 h-14 rounded-full justify-center items-center">
          <ArrowLeftIcon width={24} height={24} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16 }}>
        <View className="mb-6">
          <View className="items-center mt-10 mb-10">
            <Text className="text-white text-2xl font-bold">Confirm Your Bank Details</Text>
            <Text className="text-gray-400 mt-2 text-center">Please review your bank information to ensure it's accurate.</Text>
          </View>

          <View className="bg-[#1C1C1E] rounded-2xl p-6 border border-[#333333]">
            <View className="pb-4 border-b border-[#333333]">
              <Text className="text-gray-400 mb-1">Account Name</Text>
              <Text className="text-white text-lg font-semibold">{bankDetails.accountName}</Text>
            </View>
            <View className="py-4 border-b border-[#333333]">
              <Text className="text-gray-400 mb-1">Account No</Text>
              <Text className="text-white text-lg font-semibold">{bankDetails.accountNo}</Text>
            </View>
            <View className="pt-4 flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-green-800 justify-center items-center mr-3 border border-green-500">
                <Text className="text-white font-bold text-lg">G</Text>
              </View>
              <View>
                <Text className="text-gray-400 mb-1">Bank Name</Text>
                <Text className="text-white text-lg font-semibold">{bankDetails.bankName}</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="w-full h-[52px] rounded-full overflow-hidden mb-6">
          <LinearGradient
            colors={['#FF0000', '#330000']}
            locations={[0, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="w-full h-full"
          >
            <TouchableOpacity
              className="w-full h-full items-center justify-center"
              onPress={() => router.push('/payout-verification')}
            >
              <Text className="text-white text-[17px] font-semibold">Proceed</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ConfirmBankDetailsScreen; 