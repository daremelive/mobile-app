import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, TextInput, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser, setUser } from '../src/store/authSlice';
import { useUpdateProfileMutation } from '../src/store/authApi';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import CheckIcon from '../assets/icons/check.svg';
import SearchIcon from '../assets/icons/search.svg';

// This is a sample list of countries. In a real app, this would be more comprehensive
const countries = [
  'Nigeria',
  'Kiribati',
  'Guinea',
  'Viet Nam',
  'Israel',
  'Central African Republic',
  'Poland',
  'Saudi Arabia',
  'Brazil',
  'Saint Barthélemy',
  'Russian Federation',
  'Monaco',
  'Afghanistan',
  'Tajikistan',
];

export default function EditCountryScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('Nigeria'); // Default selected country

  useEffect(() => {
    if (currentUser && currentUser.country) {
      setSelectedCountry(currentUser.country);
    }
  }, [currentUser]);

  const filteredCountries = countries.filter(country =>
    country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveCountry = async (country: string) => {
    try {
      const result = await updateProfile({
        country: country,
      }).unwrap();

      dispatch(setUser(result));
      Alert.alert('Success', 'Country updated successfully');
      router.back();
    } catch (error: any) {
      console.error('Failed to update country:', error);
      Alert.alert('Error', 'Failed to update country. Please try again.');
    }
  };

  const renderCountry = ({ item }: { item: string }) => (
    <TouchableOpacity
      className="flex-row items-center justify-between px-4 py-3.5"
      onPress={() => {
        setSelectedCountry(item);
        handleSaveCountry(item);
      }}
      disabled={isLoading}
    >
      <Text className="text-white text-base">{item}</Text>
      {selectedCountry === item && (
        <CheckIcon width={24} height={24} fill="#C42720" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />

      {/* Header */}
      <View className="flex-row items-center px-4 pt-3 pb-4">
        <TouchableOpacity 
          className="w-14 h-14 bg-[#1A1A1A] rounded-full items-center justify-center"
          onPress={() => router.back()}
        >
          <ArrowLeftIcon width={20} height={20} fill="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-semibold ml-4">Select Country</Text>
      </View>

      {/* Search Bar */}
      <View className="px-4 mb-4 mt-3">
        <View className="flex-row items-center bg-[#1A1A1A] border border-[#2A2A2A] rounded-full px-4">
          <SearchIcon width={20} height={20} className="mr-2" />
          <TextInput
            className="flex-1 text-white py-3 text-base"
            placeholder="Search"
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Country List */}
      <FlatList
        data={filteredCountries}
        renderItem={renderCountry}
        keyExtractor={item => item}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
} 