import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';

export default function SignupScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <View className="flex-1 bg-black px-6 pt-12">
      {/* Header */}
      <Text className="text-white text-3xl font-bold mb-2">
        Create your Account
      </Text>
      <Text className="text-gray-400 text-base mb-8">
        Unlock live streaming, virtual gifts, and real-time interactions with just a few steps.
      </Text>

      {/* Form */}
      <View className="space-y-4">
        {/* Email Input */}
        <View>
          <Text className="text-white mb-2">Email</Text>
          <TextInput
            placeholder="e.g joedoe@gmail.com"
            placeholderTextColor="#666"
            className="w-full h-14 rounded-xl bg-[#1C1C1E] px-4 text-white"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Password Input */}
        <View>
          <Text className="text-white mb-2">Password</Text>
          <View className="relative">
            <TextInput
              placeholder="********"
              placeholderTextColor="#666"
              className="w-full h-14 rounded-xl bg-[#1C1C1E] px-4 text-white pr-12"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable 
              onPress={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-4"
            >
              <Image
                source={require('../../assets/icons/eye.png')}
                className="w-6 h-6"
                tintColor="#666"
              />
            </Pressable>
          </View>
        </View>

        {/* Confirm Password Input */}
        <View>
          <Text className="text-white mb-2">Confirm Password</Text>
          <View className="relative">
            <TextInput
              placeholder="********"
              placeholderTextColor="#666"
              className="w-full h-14 rounded-xl bg-[#1C1C1E] px-4 text-white pr-12"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <Pressable 
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-4"
            >
              <Image
                source={require('../../assets/icons/eye.png')}
                className="w-6 h-6"
                tintColor="#666"
              />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Terms and Conditions */}
      <Text className="text-gray-400 mt-6">
        By signing up, you agree to our{' '}
        <Text className="text-red-500">Terms & Conditions</Text>
        {' '}and{' '}
        <Text className="text-red-500">Privacy Policy</Text>
      </Text>

      {/* Sign Up Button */}
      <TouchableOpacity 
        className="mt-6 overflow-hidden rounded-xl"
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#FF0000', '#330000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="w-full h-14 items-center justify-center"
        >
          <Text className="text-white text-lg font-semibold">
            Sign Up
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Divider */}
      <View className="flex-row items-center justify-center mt-6">
        <View className="flex-1 h-[1px] bg-gray-800" />
        <Text className="text-gray-400 mx-4">or</Text>
        <View className="flex-1 h-[1px] bg-gray-800" />
      </View>

      {/* Google Sign Up Button */}
      <TouchableOpacity 
        className="mt-6 h-14 rounded-xl border border-gray-800 flex-row items-center justify-center space-x-2"
        activeOpacity={0.8}
      >
        <Image
          source={require('../../assets/icons/google.png')}
          className="w-5 h-5"
        />
        <Text className="text-white text-base">
          Sign Up with Google
        </Text>
      </TouchableOpacity>

      {/* Sign In Link */}
      <View className="flex-row justify-center mt-6">
        <Text className="text-gray-400">Already have an account? </Text>
        <Link href="/(auth)/signin" asChild>
          <Text className="text-red-500">Sign In</Text>
        </Link>
      </View>
    </View>
  );
} 