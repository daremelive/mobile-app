import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';

export default function SigninScreen() {
  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-white text-2xl font-bold mb-4">Sign In</Text>
        <Text className="text-gray-400 text-base mb-8 text-center">
          Sign in screen coming soon...
        </Text>
        <TouchableOpacity 
          onPress={() => router.back()}
          className="bg-red-600 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
} 