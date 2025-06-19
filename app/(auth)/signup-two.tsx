import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import CountryPicker, { CountryCode, Country, DARK_THEME, getCallingCode } from 'react-native-country-picker-modal';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import RadioChecked from '../../assets/icons/radio-checked.svg'; // Assuming you have a radio-checked icon
import RadioUnchecked from '../../assets/icons/radio-unchecked.svg'; // Assuming you have a radio-unchecked icon

export default function SignupTwoScreen() { // Renamed function
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState('Female'); // Default to Female as per image
  const [address, setAddress] = useState('');

  // State for Phone Number Country Picker
  const [phoneCountry, setPhoneCountry] = useState<Country | null>(null);
  const [phonePickerVisible, setPhonePickerVisible] = useState(false);

  // State for Country of Residence Picker
  const [residenceCountry, setResidenceCountry] = useState<Country | null>(null);
  const [residencePickerVisible, setResidencePickerVisible] = useState(false);

  const onSelectPhoneCountry = async (country: Country) => {
    setPhoneCountry(country);
    setPhonePickerVisible(false);
  };

  const onSelectResidenceCountry = (country: Country) => {
    setResidenceCountry(country);
    setResidencePickerVisible(false);
  };

  // Helper to get calling code, as country.callingCode can be an array
  const getCurrentCallingCode = () => {
    if (phoneCountry && phoneCountry.callingCode && phoneCountry.callingCode.length > 0) {
      return phoneCountry.callingCode[0];
    }
    return '234'; // Default fallback if needed, though NG should provide one
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      <ScrollView contentContainerClassName="flex-grow pb-10" keyboardShouldPersistTaps="handled">
        {/* Back Button */}
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="w-14 h-14 rounded-full bg-[#1C1C1E] items-center justify-center ml-6 mt-2 mb-6 self-start"
        >
          <ArrowLeft width={24} height={24} fill="#FFF" />
        </TouchableOpacity>

        <View className="px-6">
          {/* Header */}
          <Text className="text-white text-2xl font-bold mb-2">
            Tell Us More About Yourself
          </Text>
          <Text className="text-gray-400 text-base mb-10">
            Let's set up your profile. Tell us a bit about who you are.
          </Text>

          {/* Username */}
          <View className="mb-6">
            <Text className="text-white text-sm mb-2">Username</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="e.g joedo123"
              placeholderTextColor="#6B7280"
              className="bg-[#1C1C1E] text-white px-4 py-3.5 rounded-full border border-[#2C2C2E] h-[52px]"
            />
          </View>

          {/* Phone Number */}
          <View className="mb-6">
            <Text className="text-white text-sm mb-2">Phone Number</Text>
            <View className="flex-row items-center bg-[#1C1C1E] rounded-full border border-[#2C2C2E] h-[52px]">
              <TouchableOpacity 
                onPress={() => setPhonePickerVisible(true)}
                className="flex-row items-center px-4 h-full"
              >
                {/* No flag displayed here, only calling code and chevron */}
                <Text className="text-white mr-1">+{getCurrentCallingCode()}</Text>
                <View className="w-2 h-2 border-b-2 border-r-2 border-gray-400 rotate-45" />
              </TouchableOpacity>
              <CountryPicker
                countryCode={phoneCountry ? phoneCountry.cca2 : 'NG'} // Use NG as initial default
                withFilter
                withAlphaFilter
                onSelect={onSelectPhoneCountry}
                visible={phonePickerVisible}
                onClose={() => setPhonePickerVisible(false)}
                theme={DARK_THEME}
                withFlag={false} // Explicitly set withFlag to false for the modal if no flags desired *at all* for phone part
                withCallingCode={false} // Also false if we only want to pick country then show our code
                renderFlagButton={() => null} // Ensures picker itself doesn't render a button
              />
              <View className="w-[1px] h-6 bg-[#2C2C2E]" />
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Phone Number"
                placeholderTextColor="#6B7280"
                className="flex-1 bg-transparent text-white px-4 h-full"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Gender */}
          <View className="mb-6">
            <Text className="text-white text-sm mb-2">Gender</Text>
            <View className="flex-row justify-start">
              <TouchableOpacity 
                onPress={() => setGender('Male')} 
                className={`flex-row items-center px-6 py-3.5 rounded-full h-[52px] border ${gender === 'Male' ? 'bg-[#1C1C1E] border-[#C42720]' : 'bg-[#1C1C1E] border-[#2C2C2E]'}`}
              >
                {gender === 'Male' ? <RadioChecked width={20} height={20} fill="#C42720" /> : <RadioUnchecked width={20} height={20} fill="#6B7280" />}
                <Text className={`ml-2 ${gender === 'Male' ? 'text-white' : 'text-gray-400'}`}>Male</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setGender('Female')} 
                className={`flex-row items-center px-6 py-3.5 rounded-full h-[52px] border ml-3 ${gender === 'Female' ? 'bg-[#1C1C1E] border-[#C42720]' : 'bg-[#1C1C1E] border-[#2C2C2E]'}`}
              >
                 {gender === 'Female' ? <RadioChecked width={20} height={20} fill="#FFFFFF" /> : <RadioUnchecked width={20} height={20} fill="#6B7280" />}
                <Text className={`ml-2 ${gender === 'Female' ? 'text-white' : 'text-gray-400'}`}>Female</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Address (Optional) */}
          <View className="mb-6">
            <Text className="text-white text-sm mb-2">Address <Text className="text-gray-500">(Optional)</Text></Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Enter your address"
              placeholderTextColor="#6B7280"
              className="bg-[#1C1C1E] text-white px-4 py-3.5 rounded-full border border-[#2C2C2E] h-[52px]"
            />
          </View>

          {/* Country of Residence */}
          <View className="mb-10">
            <Text className="text-white text-sm mb-2">Country of Residence</Text>
            <TouchableOpacity 
              onPress={() => setResidencePickerVisible(true)}
              className="flex-row items-center justify-between bg-[#1C1C1E] px-4 rounded-full border border-[#2C2C2E] h-[52px]"
            >
              <Text className={residenceCountry ? 'text-white' : 'text-gray-400'}>
                {residenceCountry ? (typeof residenceCountry.name === 'string' ? residenceCountry.name : residenceCountry.name.common) : 'Select Country'}
              </Text>
              <View className="w-2 h-2 border-b-2 border-r-2 border-gray-400 rotate-45" />
            </TouchableOpacity>
            <CountryPicker
              countryCode={residenceCountry ? residenceCountry.cca2 : 'NG'}
              withFlag={false} // Explicitly set to false to hide flags in the residence picker MODAL LIST
              withFilter
              withAlphaFilter
              onSelect={onSelectResidenceCountry}
              visible={residencePickerVisible}
              onClose={() => setResidencePickerVisible(false)}
              theme={DARK_THEME}
              renderFlagButton={() => null} // Add this to prevent default rendering outside modal
            />
          </View>

          {/* Proceed Button */}
          <View className="w-full h-[52px] rounded-full overflow-hidden">
            <LinearGradient
              colors={['#FF0000', '#330000']}
              locations={[0, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="w-full h-full"
            >
              <TouchableOpacity 
                onPress={() => router.push('/(auth)/signup-three')}
                className="w-full h-full items-center justify-center"
              >
                <Text className="text-white text-[17px] font-semibold">Proceed</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 