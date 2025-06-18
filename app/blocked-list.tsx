import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import SearchIcon from '../assets/icons/search-icon.svg';

const BlockedListScreen = () => {
  const router = useRouter();
  const blockedCount = 20;

  const blockedUsers = Array.from({ length: 7 }, (_, i) => ({
    id: `${i + 1}`,
    name: 'Desmond Elliot',
    followers: '12k followers',
    image: `https://randomuser.me/api/portraits/men/3${i + 2}.jpg`,
  }));

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      <View className="flex-row items-center relative px-4 pt-3 pb-3">
        <TouchableOpacity onPress={() => router.back()} className="absolute left-4 z-10 bg-[#1E1E1E] w-14 h-14 rounded-full justify-center items-center">
          <ArrowLeftIcon width={24} height={24} />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-white text-xl font-semibold">Blocked List ({blockedCount})</Text>
        </View>
      </View>

      <View className="px-4 mt-6">
        <View className="flex-row items-center bg-[#1C1C1E] rounded-full p-3 border border-[#333333]">
          <SearchIcon width={20} height={20} className="mr-2" />
          <TextInput
            placeholder="Search"
            placeholderTextColor="#8A8A8E"
            className="text-white flex-1"
          />
        </View>
      </View>

      <ScrollView className="flex-1 px-4 mt-6">
        {blockedUsers.map(user => (
          <View key={user.id} className="flex-row justify-between items-center mb-6">
            <View className="flex-row items-center">
              <Image source={{ uri: user.image }} className="w-14 h-14 rounded-full mr-4 border-2 border-white" />
              <View>
                <Text className="text-white font-semibold text-base">{user.name}</Text>
                <Text className="text-gray-400">{user.followers}</Text>
              </View>
            </View>
            <TouchableOpacity className="bg-[#C42720] px-6 py-2 rounded-full">
              <Text className="text-white font-semibold">Unblock</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default BlockedListScreen; 