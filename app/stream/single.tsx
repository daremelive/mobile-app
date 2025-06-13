import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, TextInput, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import CancelIcon from '../../assets/icons/cancel.svg';
import MagicWandIcon from '../../assets/icons/magic-wand.svg';
import DareMeLiveIcon from '../../assets/icons/daremelive.svg';

export default function SingleStreamScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [title, setTitle] = useState('');

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      
      {/* Header */}
      <View className="px-4 pt-3">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-white text-xl font-semibold">Stream Info</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <CancelIcon width={24} height={24} />
          </TouchableOpacity>
        </View>

        {/* Title Input */}
        <View className="flex-row items-center bg-[#1A1A1A] rounded-xl p-3">
          <Image 
            source={{ uri: 'https://picsum.photos/200' }}
            className="w-8 h-8 rounded-full mr-3"
          />
          <TextInput
            placeholder="Add a title to chat"
            placeholderTextColor="#666"
            value={title}
            onChangeText={setTitle}
            className="flex-1 text-white text-base"
          />
        </View>
      </View>

      {/* Bottom Actions */}
      <View className="absolute bottom-8 left-0 right-0 px-4">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity 
            className="w-12 h-12 rounded-full bg-[#1A1A1A] items-center justify-center"
          >
            <MagicWandIcon width={24} height={24} />
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-1 h-12 bg-[#C42720] rounded-full items-center justify-center ml-4 flex-row"
          >
            <Text className="text-white text-base font-semibold mr-2">Start Live Now</Text>
            <View className="w-2 h-2 border-t-2 border-r-2 border-white rotate-45" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
} 