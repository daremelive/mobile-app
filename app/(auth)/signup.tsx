import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      <View className="flex-1 px-6 pt-16">
        {/* Header */}
        <View className="mb-12">
          <Text className="text-white text-2xl font-bold mb-3">
            Create your Account
          </Text>
          <Text className="text-gray-400 text-base leading-6">
            Unlock live streaming, virtual gifts, and real-time interactions with just a few steps.
          </Text>
        </View>

        {/* Form */}
        <View className="space-y-6">
          {/* Email Field */}
          <View className="mb-6">
            <Text className="text-white text-sm mb-2">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="e.g joedoe@gmail.com"
              placeholderTextColor="#6B7280"
              className="bg-[#090909] text-white px-4 py-4 rounded-full border border-[#2C2C2E]"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password Field */}
          <View className="mb-6">
            <Text className="text-white text-sm mb-2">Password</Text>
            <View className="relative">
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#6B7280"
                className="bg-[#090909] text-white px-4 py-4 rounded-full border border-[#2C2C2E] pr-12"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-4"
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Field */}
          <View className="mb-6">
            <Text className="text-white text-sm mb-2">Confirm Password</Text>
            <View className="relative">
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor="#6B7280"
                className="bg-[#090909] text-white px-4 py-4 rounded-full border border-[#2C2C2E] pr-12"
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-4"
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Terms & Conditions */}
        <View className=" mb-10">
          <Text className="text-gray-400 text-sm">
            By signing up, you agree to our{' '}
            <Text className="text-red-500">Terms & Conditions</Text> and{' '}
            <Text className="text-red-500">Privacy Policy</Text>
          </Text>
        </View>

        {/* Sign Up Button */}
        <View className="w-full h-[52px] rounded-full overflow-hidden mb-6">
          <LinearGradient
            colors={['#FF0000', '#330000']}
            locations={[0, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="w-full h-full"
          >
            <TouchableOpacity className="w-full h-full items-center justify-center">
              <Text className="text-white text-[17px] font-semibold">Sign Up</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
        
        {/* Or Divider */}
        <View className="flex-row items-center mb-6">
          <View className="flex-1 h-[1px] bg-[#2C2C2E]" />
          <Text className="text-gray-400 px-4">or</Text>
          <View className="flex-1 h-[1px] bg-[#2C2C2E]" />
        </View>

        {/* Google Sign Up Button */}
        <TouchableOpacity className="w-full h-[52px] bg-[#090909] border border-[#2C2C2E] rounded-full flex-row items-center justify-center mb-8">
          <Image 
            source={require('../../assets/icons/google.png')} 
            className="w-8 h-8 mr-3"
          />
          <Text className="text-white text-[17px] font-medium ml-3">Sign Up with Google</Text>
        </TouchableOpacity>

        {/* Sign In Link */}
        <View className="flex-row justify-center mt-auto mb-8">
          <Text className="text-gray-400 text-base">
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/signin')}>
            <Text className="text-red-500 text-base font-medium">Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
} 