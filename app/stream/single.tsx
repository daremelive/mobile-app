import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store';
import { useCreateStreamMutation } from '../../src/store/streamsApi';

export default function CreateSingleStream() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  const [createStream, { isLoading }] = useCreateStreamMutation();
  
  const { mode, channel, title } = params;

  useEffect(() => {
    // Auto-create the stream when this screen loads
    createSingleStream();
  }, []);

  const createSingleStream = async () => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'Please log in to create a stream');
      router.back();
      return;
    }

    try {
      console.log('Creating single stream with params:', { mode, channel, title });
      
      const response = await createStream({
        title: title as string || 'Live Stream',
        mode: 'single',
        channel: (channel as 'video' | 'game' | 'truth-or-dare' | 'banter') || 'video',
        max_seats: 1,
      }).unwrap();

      console.log('Stream created successfully:', response);

      // Navigate directly to dedicated host single stream screen
      router.replace({
        pathname: '/stream/host-single',
        params: {
          id: response.id,
          title: title as string || 'Live Stream'
        }
      });

    } catch (error) {
      console.error('Failed to create stream:', error);
      Alert.alert('Error', 'Failed to create stream. Please try again.');
      router.back();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black justify-center items-center">
      <View className="items-center">
        <ActivityIndicator size="large" color="#C42720" />
        <Text className="text-white text-lg mt-4">Creating your stream...</Text>
        <Text className="text-gray-400 text-sm mt-2">Please wait</Text>
      </View>
    </SafeAreaView>
  );
}
