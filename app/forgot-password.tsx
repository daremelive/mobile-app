import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import LockPasswordIcon from '../assets/icons/lock-password.svg';
import { LinearGradient } from 'expo-linear-gradient';

const ForgotPasswordScreen = () => {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      <View className="px-6 pt-4">
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="w-14 h-14 rounded-full bg-[#1E1E1E] items-center justify-center"
        >
          <ArrowLeftIcon width={24} height={24} />
        </TouchableOpacity>
      </View>

      <View className="flex-1 px-6 pt-12">
        <View className="w-16 h-16 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] items-center justify-center mb-6">
          <LockPasswordIcon width={32} height={32} />
        </View>
        
        <Text className="text-white text-3xl font-bold mb-3">Forgot Password</Text>
        <Text className="text-gray-400 text-base mb-10">
          Enter your email address, and we'll send you a code to reset your password.
        </Text>

        <View className="mb-6">
          <Text className="text-white mb-2">Email</Text>
          <TextInput
            placeholder="Search"
            placeholderTextColor="#8A8A8E"
            className="bg-[#1C1C1E] text-white rounded-full border border-[#333333] px-5 w-full h-14"
            keyboardType="email-address"
          />
        </View>

        {/* <View className="mt-auto mb-8">
            <LinearGradient
                colors={['#FF0000', '#330000']}
                locations={[0, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="w-full rounded-full"
            >
                <TouchableOpacity 
                    className="w-full h-[52px] items-center justify-center"
                    onPress={() => router.push('/(auth)/verify')}
                >
                    <Text className="text-white text-[17px] font-semibold">Send Reset Code</Text>
                </TouchableOpacity>
            </LinearGradient>
        </View> */}
        <View className="w-full h-[52px] rounded-full overflow-hidden mb-6 mt-4">
          <LinearGradient
            colors={['#FF0000', '#330000']}
            locations={[0, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="w-full h-full"
          >
            <TouchableOpacity 
              className="w-full h-full items-center justify-center"
              onPress={() => router.push('/(auth)/verify')}
            >
              <Text className="text-white text-[17px] font-semibold">Send Reset Code</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen; 