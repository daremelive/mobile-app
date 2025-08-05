import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser, setUser } from '../src/store/authSlice';
import { useUpdateProfileMutation } from '../src/store/authApi';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';

const EditNameScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    if (currentUser) {
      setFirstName(currentUser.first_name || '');
      setLastName(currentUser.last_name || '');
    }
  }, [currentUser]);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'Please enter both first and last name');
      return;
    }

    try {
      const result = await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      }).unwrap();

      dispatch(setUser(result));
      Alert.alert('Success', 'Name updated successfully');
      router.back();
    } catch (error: any) {
      console.error('Failed to update name:', error);
      Alert.alert('Error', 'Failed to update name. Please try again.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      <View className="flex-row items-center justify-between px-4 pt-3 pb-3 mb-4">
        <TouchableOpacity onPress={() => router.back()}>
          <View className="w-14 h-14 bg-[#1A1A1A] rounded-full justify-center items-center">
            <ArrowLeftIcon width={24} height={24}/>
          </View>
        </TouchableOpacity>
        <Text className="text-white text-[20px] font-semibold">Full Name</Text>
        <TouchableOpacity onPress={handleSave} disabled={isLoading}>
          <Text className={`text-lg font-semibold ${isLoading ? 'text-gray-500' : 'text-[#C42720]'}`}>
            {isLoading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="px-4 mt-8">
        <View className="mb-6">
          <Text className="text-white text-sm mb-2">First Name</Text>
          <TextInput
            className="bg-[#1A1A1A] text-white rounded-full border border-[#2A2A2A] px-4 py-3 text-base"
            value={firstName}
            onChangeText={setFirstName}
          />
        </View>
        <View>
          <Text className="text-white text-sm mb-2">Last Name</Text>
          <TextInput
            className="bg-[#1A1A1A] text-white rounded-full border border-[#2A2A2A] px-4 py-3 text-base"
            value={lastName}
            onChangeText={setLastName}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default EditNameScreen; 