import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';

const EditNameScreen = () => {
  const router = useRouter();
  const [firstName, setFirstName] = useState('joedo123');
  const [lastName, setLastName] = useState('joedo123');

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      <View className="flex-row items-center justify-between px-4 pt-3 pb-3 mb-4">
        <TouchableOpacity onPress={() => router.back()}>
          <View className="w-14 h-14 bg-[#1A1A1A] rounded-full justify-center items-center">
            <ArrowLeftIcon width={24} height={24}/>
          </View>
        </TouchableOpacity>
        <Text className="text-white text-[20px] font-semibold">Full Name</Text>
        <TouchableOpacity>
          <Text className="text-[#C42720] text-lg font-semibold">Save</Text>
        </TouchableOpacity>
      </View>

      <View className="px-4 mt-8">
        <View className="mb-6">
          <Text className="text-white text-sm mb-2">First Name</Text>
          <TextInput
            className="bg-[#1A1A1A] text-white rounded-full border border-[#2A2A2A] px-4 py-3 text-base"
            value={firstName}
            onChangeText={setFirstName}
          />
        </View>
        <View>
          <Text className="text-white text-sm mb-2">Last Name</Text>
          <TextInput
            className="bg-[#1A1A1A] text-white rounded-full border border-[#2A2A2A] px-4 py-3 text-base"
            value={lastName}
            onChangeText={setLastName}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default EditNameScreen; 