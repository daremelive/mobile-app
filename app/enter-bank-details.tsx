import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import ChevronDownIcon from '../assets/icons/chevron-down.svg';
import { LinearGradient } from 'expo-linear-gradient';

const EnterBankDetailsScreen = () => {
  const router = useRouter();

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
            <Text className="text-white text-2xl font-bold">Enter Bank Details</Text>
            <Text className="text-gray-400 mt-2 text-center">Provide the necessary information to process the withdrawal.</Text>
          </View>

          <View className="mb-6">
            <Text className="text-white mb-2">Bank Name</Text>
            <TouchableOpacity className="bg-[#1C1C1E] rounded-full border border-[#333333] px-5 w-full h-14 flex-row justify-between items-center">
              <Text className="text-gray-500">Select Bank</Text>
              <ChevronDownIcon width={20} height={20} stroke="#8A8A8E" />
            </TouchableOpacity>
          </View>

          <View className="mb-6">
            <Text className="text-white mb-2">Account Number</Text>
            <TextInput
              placeholder="Enter your 11 digit number"
              placeholderTextColor="#8A8A8E"
              className="bg-[#1C1C1E] text-white rounded-full border border-[#333333] px-5 w-full h-14"
              keyboardType="number-pad"
              maxLength={11}
            />
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
              onPress={() => router.push('/confirm-bank-details')}
            >
              <Text className="text-white text-[17px] font-semibold">Proceed</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EnterBankDetailsScreen; 