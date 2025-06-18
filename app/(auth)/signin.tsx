import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import EyeOffIcon from '../../assets/icons/eye-off.svg';

export default function SigninScreen() {
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      <View className="flex-1 justify-center px-6">
        <Text className="text-white text-3xl font-bold mb-2">Welcome Back</Text>
        <Text className="text-gray-400 text-base mb-10">
          Log in to stream, connect, and engage with your audience in real time.
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

        <View className="mb-4">
          <Text className="text-white mb-2">Password</Text>
          <View className="relative">
            <TextInput
              placeholder="Search"
              placeholderTextColor="#8A8A8E"
              className="bg-[#1C1C1E] text-white rounded-full border border-[#333333] px-5 w-full h-14"
              secureTextEntry={!passwordVisible}
            />
            <TouchableOpacity
              onPress={() => setPasswordVisible(!passwordVisible)}
              className="absolute right-5 top-1/2 -translate-y-3"
            >
              <EyeOffIcon width={24} height={24} stroke="#8A8A8E" />
            </TouchableOpacity>
          </View>
        </View>
        
        <TouchableOpacity 
          className="self-end mb-8"
          onPress={() => router.push('/forgot-password')}
        >
          <Text className="text-[#C40000] font-semibold">Forgot Password?</Text>
        </TouchableOpacity>

        {/* <LinearGradient
          colors={['#C40000', '#6F0000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="w-full rounded-full mb-6"
        >
          <TouchableOpacity
            className="w-full h-14 items-center justify-center"
            onPress={() => router.replace('/(tabs)/home')}
          >
            <Text className="text-white text-lg font-semibold">Sign In</Text>
          </TouchableOpacity>
        </LinearGradient> */}

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
              onPress={() => router.replace('/(tabs)/home')}
            >
              <Text className="text-white text-[17px] font-semibold">Sign In</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>       

        <View className="flex-row items-center my-4">
          <View className="flex-1 h-px bg-gray-600" />
          <Text className="text-gray-400 mx-4">or</Text>
          <View className="flex-1 h-px bg-gray-600" />
        </View>

        <TouchableOpacity className="w-full h-14 bg-[#1C1C1E] border border-[#333333] rounded-full flex-row items-center justify-center mb-8">
          <Image source={require('../../assets/icons/google.png')} className="w-6 h-6 mr-3" />
          <Text className="text-white text-lg font-semibold">Sign Up with Google</Text>
        </TouchableOpacity>

        <View className="flex-row justify-center">
          <Text className="text-gray-400">Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/signup')}>
            <Text className="text-[#C40000] font-semibold">Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
} 