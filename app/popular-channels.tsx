import React from 'react';
import { View, Text, SafeAreaView, ScrollView, TextInput, Image, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { BlurView } from 'expo-blur';
import { fonts } from '../constants/Fonts';
import { StatusBar } from 'expo-status-bar';
import ArrowLeft from '../assets/icons/arrow-left.svg';

const popularChannels = [
  { id: 1, title: 'Marriage Sacrifices', username: '@judennam', viewers: '8.9k', image: 'https://picsum.photos/400/501' },
  { id: 2, title: 'Marriage Sacrifices', username: '@judennam', viewers: '8.9k', image: 'https://picsum.photos/400/502' },
  { id: 3, title: 'Marriage Sacrifices', username: '@judennam', viewers: '8.9k', image: 'https://picsum.photos/400/503' },
  { id: 4, title: 'Marriage Sacrifices', username: '@judennam', viewers: '8.9k', image: 'https://picsum.photos/400/504' },
  { id: 5, title: 'Marriage Sacrifices', username: '@judennam', viewers: '8.9k', image: 'https://picsum.photos/400/505' },
  { id: 6, title: 'Marriage Sacrifices', username: '@judennam', viewers: '8.9k', image: 'https://picsum.photos/400/506' },
];

export default function PopularChannelsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      <View className="px-4 pt-8">
        {/* Header */}
        <View className="flex-row items-center mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-14 h-14 rounded-full bg-[#1C1C1E] justify-center items-center"
          >
            <ArrowLeft width={24} height={24} />
          </TouchableOpacity>
          <Text
            style={{ fontFamily: fonts.bold }}
            className="text-white text-xl text-center flex-1 -ml-10"
          >
            Popular Channels
          </Text>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center rounded-full border border-[#353638] px-3 mb-6 h-11">
          <HugeiconsIcon icon={Search01Icon} size={20} color="#FFFFFF" />
          <TextInput
            placeholder="Search"
            placeholderTextColor="#666666"
            className="flex-1 text-white ml-2 text-base"
            style={{ fontFamily: fonts.regular }}
          />
        </View>
      </View>

      <ScrollView contentContainerClassName="px-4 pb-24">
        <View className="flex-row flex-wrap justify-between">
          {popularChannels.map((channel) => (
            <View
              key={channel.id}
              className="w-[48%] h-[250px] rounded-xl overflow-hidden bg-[#1C1C1E] mb-4"
            >
              <View className="relative flex-1">
                <Image
                  source={{ uri: channel.image }}
                  className="w-full h-full"
                />
                <View className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded-full flex-row items-center">
                  
                  <Text style={{fontFamily: fonts.regular}} className="text-white text-xs">{channel.viewers}</Text>
                </View>
                <BlurView intensity={30} tint="dark" className="absolute bottom-0 left-0 right-0 p-3 bg-black/30">
                  <Text style={{fontFamily: fonts.semiBold}} className="text-white text-base mb-1">{channel.title}</Text>
                  <Text style={{fontFamily: fonts.regular}} className="text-gray-400 text-sm">{channel.username}</Text>
                </BlurView>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 