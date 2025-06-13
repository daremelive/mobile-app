import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, TextInput, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import CancelIcon from '../../assets/icons/cancel.svg';
import MagicWandIcon from '../../assets/icons/magic-wand.svg';
import DareMeLiveIcon from '../../assets/icons/daremelive.svg';

export default function StreamInfoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [title, setTitle] = useState('');

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      
      {/* Content Container */}
      <View className="px-4 pt-3">
        <View className="bg-[#1A1A1A] rounded-2xl p-4">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-white text-xl font-semibold">Stream Info</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <CancelIcon width={24} height={24} />
            </TouchableOpacity>
          </View>

          {/* Title Input */}
          <View className="flex-row items-center">
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
      </View>

      {/* Bottom Actions */}
      <View className="absolute bottom-8 left-0 right-0 px-4">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity 
            className="w-14 h-14 rounded-full bg-[#1A1A1A] items-center justify-center"
          >
            <MagicWandIcon width={24} height={24} />
          </TouchableOpacity>
          <View className="w-[82%] h-[52px] rounded-full overflow-hidden">
            <LinearGradient
              colors={['#FF0000', '#330000']}
              locations={[0, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="w-full h-full"
            >
              <TouchableOpacity 
                className="w-full h-full items-center justify-center flex-row gap-2"
                // onPress={() => router.push('/(auth)/verify')}
              >
                <Text className="text-white text-[17px] font-semibold">Start Live Now</Text>
               <View>
               <DareMeLiveIcon width={18} height={18} />
               </View>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
} 