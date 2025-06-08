import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import CancelIcon from '../assets/icons/cancel.svg';

const EditUsernameScreen = () => {
  const router = useRouter();
  const [username, setUsername] = useState('joedo123');

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      <View className="flex-row items-center justify-between px-4 pt-3 pb-3 mb-4">
        <TouchableOpacity onPress={() => router.back()}>
          <View className="w-10 h-10 bg-[#1A1A1A] rounded-full justify-center items-center">
            <ArrowLeftIcon width={24} height={24} fill="white" />
          </View>
        </TouchableOpacity>
        <Text className="text-white text-[20px] font-semibold">Username</Text>
        <TouchableOpacity>
          <Text className="text-[#C42720] text-lg font-semibold">Save</Text>
        </TouchableOpacity>
      </View>

      <View className="px-4 mt-8">
        <Text className="text-white text-sm mb-2">Username</Text>
        <View className="flex-row items-center bg-[#1A1A1A] rounded-full border border-[#2A2A2A] px-4">
          <TextInput
            className="flex-1 text-white py-3 text-base"
            value={username}
            onChangeText={setUsername}
          />
          <TouchableOpacity onPress={() => setUsername('')}>
            <CancelIcon width={20} height={20} fill="#666" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default EditUsernameScreen; 