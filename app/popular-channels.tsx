import React from 'react';
import { View, Text, SafeAreaView, ScrollView, TextInput, Image, TouchableOpacity, ImageBackground } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import SearchIcon from '../assets/icons/search-icon.svg';
import EyeIcon from '../assets/icons/eye.svg';

const popularChannels = [
  { id: 1, title: 'Marriage Sacrifices', username: '@judennam', viewers: '8.9k', image: 'https://picsum.photos/400/501' },
  { id: 2, title: 'How To Make Money', username: '@judennam', viewers: '8.9k', image: 'https://picsum.photos/400/502' },
  { id: 3, title: 'Marriage Sacrifices', username: '@judennam', viewers: '8.9k', image: 'https://picsum.photos/400/503' },
  { id: 4, title: 'Marriage Sacrifices', username: '@judennam', viewers: '8.9k', image: 'https://picsum.photos/400/504' },
  { id: 5, title: 'Marriage Sacrifices', username: '@judennam', viewers: '8.9k', image: 'https://picsum.photos/400/505' },
  { id: 6, title: 'Marriage Sacrifices', username: '@judennam', viewers: '8.9k', image: 'https://picsum.photos/400/506' },
];

export default function PopularChannelsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      <View className="flex-row items-center px-4 pt-3 pb-3">
        <TouchableOpacity onPress={() => router.back()} className="absolute left-4 z-10 bg-[#1E1E1E] w-14 h-14 rounded-full justify-center items-center">
          <ArrowLeftIcon width={24} height={24} />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-white text-xl font-semibold">Popular Channels</Text>
        </View>
      </View>

      <View className="px-4 mt-6">
        <View className="flex-row items-center gap-3 bg-[#1C1C1E] rounded-full p-3 border border-[#333333]">
          <SearchIcon width={20} height={20} className="mr-3" />
          <TextInput
            placeholder="Search"
            placeholderTextColor="#8A8A8E"
            className="flex-1 text-white text-base"
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 32 }}>
        <View className="flex-row flex-wrap justify-between">
          {popularChannels.map((channel) => (
            <TouchableOpacity key={channel.id} className="w-[48%] h-[250px] rounded-2xl overflow-hidden mb-4">
              <ImageBackground source={{ uri: channel.image }} className="w-full h-full justify-between">
                <View className="items-end p-2">
                  <View className="bg-black/60 px-3 py-1.5 rounded-full flex-row items-center gap-1">
                    <EyeIcon width={16} height={16} stroke="#FFFFFF" className="mr-1.5" />
                    <Text className="text-white text-xs font-semibold">{channel.viewers}</Text>
                  </View>
                </View>
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  className="p-3"
                >
                  <Text className="text-white text-base font-bold">{channel.title}</Text>
                  <Text className="text-gray-300 text-sm">{channel.username}</Text>
                </LinearGradient>
              </ImageBackground>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 