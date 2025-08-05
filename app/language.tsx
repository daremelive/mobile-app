import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, FlatList, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../src/store/authSlice';
import { useGetProfileQuery, useUpdateProfileMutation } from '../src/store/authApi';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import CheckIcon from '../assets/icons/check.svg';
import SearchIcon from '../assets/icons/search.svg';

const LANGUAGES = [
  'English', 'Dutch', 'Spanish', 'Italian', 'Hindi', 'Japanese', 
  'Chinese', 'Russian', 'Korean', 'French', 'Portuguese'
];

const LanguageScreen = () => {
  const router = useRouter();
  const currentUser = useSelector(selectCurrentUser);
  const { data: profileData } = useGetProfileQuery();
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();
  
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize selected language from user data
  useEffect(() => {
    const userLanguage = profileData?.language || currentUser?.language;
    if (userLanguage) {
      setSelectedLanguage(userLanguage);
    }
  }, [profileData, currentUser]);

  const filteredLanguages = LANGUAGES.filter(lang => 
    lang.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLanguageSelect = async (language: string) => {
    setSelectedLanguage(language);
    
    try {
      await updateProfile({ language }).unwrap();
      Alert.alert('Success', `Language changed to ${language}`);
      router.back();
    } catch (error: any) {
      console.error('Language update error:', error);
      Alert.alert('Error', 'Failed to update language. Please try again.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      <View className="flex-row items-center relative px-4 pt-3 mb-6 pb-3 mb-3">
        <TouchableOpacity onPress={() => router.back()} className="absolute left-4 z-10">
          <View className="w-14 h-14 bg-[#1A1A1A] rounded-full justify-center items-center">
            <ArrowLeftIcon width={24} height={24}/>
          </View>
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-white text-[20px] font-semibold">
            {isLoading ? 'Saving...' : 'Select Language'}
          </Text>
        </View>
      </View>

      <View className="px-4 mb-4">
        <View className="flex-row items-center bg-[#1A1A1A] rounded-full px-4 h-12 border border-[#2A2A2A]">
          <TextInput
            className="flex-1 text-white ml-3 text-base"
            placeholder="Search"
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <FlatList
        data={filteredLanguages}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity 
            className="flex-row items-center justify-between px-4 py-4"
            onPress={() => handleLanguageSelect(item)}
            disabled={isLoading}
          >
            <Text className={`text-base ${isLoading ? 'text-gray-500' : 'text-white'}`}>{item}</Text>
            {selectedLanguage === item && <CheckIcon width={20} height={20} fill="#C42720" />}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};

export default LanguageScreen; 