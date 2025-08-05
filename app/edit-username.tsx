import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser, setUser } from '../src/store/authSlice';
import { useUpdateProfileMutation } from '../src/store/authApi';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import CancelIcon from '../assets/icons/cancel.svg';

const EditUsernameScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();
  
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.username || '');
    }
  }, [currentUser]);

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    try {
      const result = await updateProfile({
        username: username.trim(),
      }).unwrap();

      dispatch(setUser(result));
      Alert.alert('Success', 'Username updated successfully');
      router.back();
    } catch (error: any) {
      console.error('Failed to update username:', error);
      if (error.data?.username?.[0]) {
        Alert.alert('Error', error.data.username[0]);
      } else {
        Alert.alert('Error', 'Failed to update username. Please try again.');
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      <View className="flex-row items-center justify-between px-4 pt-3 pb-3 mb-4">
        <TouchableOpacity onPress={() => router.back()}>
          <View className="w-14 h-14 bg-[#1A1A1A] rounded-full justify-center items-center">
            <ArrowLeftIcon width={24} height={24} />
          </View>
        </TouchableOpacity>
        <Text className="text-white text-[20px] font-semibold">Username</Text>
        <TouchableOpacity onPress={handleSave} disabled={isLoading}>
          <Text className={`text-lg font-semibold ${isLoading ? 'text-gray-500' : 'text-[#C42720]'}`}>
            {isLoading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="px-4 mt-8">
        <Text className="text-white text-sm mb-2">Username</Text>
        <View className="flex-row items-center bg-[#1A1A1A] rounded-full border border-[#2A2A2A] px-4">
          <TextInput
            className="flex-1 text-white py-3 text-base"
            value={username}
            onChangeText={setUsername}
          />
          <TouchableOpacity onPress={() => setUsername('')}>
            <CancelIcon width={20} height={20} fill="#666" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default EditUsernameScreen; 