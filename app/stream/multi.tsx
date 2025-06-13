import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams } from 'expo-router';

export default function MultiStreamScreen() {
  const params = useLocalSearchParams();
  const channel = params.channel;

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      <View className="flex-1 items-center justify-center">
        <Text className="text-white text-2xl font-medium">Multi Stream Setup</Text>
      </View>
    </SafeAreaView>
  );
} 