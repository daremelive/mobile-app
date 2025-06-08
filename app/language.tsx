import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import CheckIcon from '../assets/icons/check.svg';
import SearchIcon from '../assets/icons/search.svg';

const LANGUAGES = [
  'English', 'Dutch', 'Spanish', 'Italian', 'Hindi', 'Japanese', 
  'Chinese', 'Russian', 'Korean', 'French', 'Portuguese'
];

const LanguageScreen = () => {
  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLanguages = LANGUAGES.filter(lang => 
    lang.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <Text className="text-white text-[20px] font-semibold">Select Language</Text>
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
            onPress={() => setSelectedLanguage(item)}
          >
            <Text className="text-white text-base">{item}</Text>
            {selectedLanguage === item && <CheckIcon width={20} height={20} fill="#C42720" />}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};

export default LanguageScreen; 