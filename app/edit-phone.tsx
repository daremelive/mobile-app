import React, { useState, useRef, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser, setUser } from '../src/store/authSlice';
import { useUpdateProfileMutation } from '../src/store/authApi';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import ChevronDownIcon from '../assets/icons/chevron-down.svg';
import CountryPicker, { Country, CountryCode } from 'react-native-country-picker-modal';
import PhoneIcon from '../assets/icons/phone.svg';
import CancelIcon from '../assets/icons/cancel.svg';

const EditPhoneScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();
  
  const [countryCode, setCountryCode] = useState<CountryCode>('NG');
  const [callingCode, setCallingCode] = useState('234');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);
  const [isPickerVisible, setPickerVisible] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.phone_number) {
      // Parse existing phone number if it exists
      const phone = currentUser.phone_number;
      if (phone.startsWith('+')) {
        // Extract country code and phone number
        const phoneWithoutPlus = phone.substring(1);
        // For now, assume Nigerian numbers, but this could be enhanced
        if (phoneWithoutPlus.startsWith('234')) {
          setCallingCode('234');
          setCountryCode('NG');
          setPhoneNumber(phoneWithoutPlus.substring(3));
        } else {
          setPhoneNumber(phoneWithoutPlus);
        }
      } else {
        setPhoneNumber(phone);
      }
    }
  }, [currentUser]);

  const onSelect = (country: Country) => {
    setCountryCode(country.cca2);
    setCallingCode(country.callingCode[0]);
    setPickerVisible(false);
  };

  const handleSave = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    const fullPhoneNumber = `+${callingCode}${phoneNumber}`;

    try {
      const result = await updateProfile({
        phone_number: fullPhoneNumber,
      }).unwrap();

      dispatch(setUser(result));
      Alert.alert('Success', 'Phone number updated successfully');
      router.back();
    } catch (error: any) {
      console.error('Failed to update phone number:', error);
      if (error.data?.phone_number?.[0]) {
        Alert.alert('Error', error.data.phone_number[0]);
      } else {
        Alert.alert('Error', 'Failed to update phone number. Please try again.');
      }
    }
  };

  const handleProceed = () => {
    setModalVisible(false);
    handleSave();
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
        <Text className="text-white text-[20px] font-semibold">Edit Phone Number</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} disabled={isLoading}>
          <Text className={`text-lg font-semibold ${isLoading ? 'text-gray-500' : 'text-[#C42720]'}`}>
            {isLoading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="px-4 mt-8">
        <Text className="text-white text-sm mb-2">Phone Number</Text>
        <View className="flex-row items-center bg-[#1A1A1A] rounded-full border border-[#2A2A2A] px-4 h-14">
          <CountryPicker
            countryCode={countryCode}
            onSelect={onSelect}
            onClose={() => setPickerVisible(false)}
            visible={isPickerVisible}
            withFilter
            withFlag
            withCallingCode
          />
          <TouchableOpacity 
            className="flex-row items-center pr-2"
            onPress={() => setPickerVisible(true)}
          >
            <Text className="text-white text-base mx-1">+{callingCode}</Text>
            <ChevronDownIcon width={16} height={16} fill="white" />
          </TouchableOpacity>
          <TextInput
            className="flex-1 text-white text-base"
            placeholder="Phone Number"
            placeholderTextColor="#666"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/60 px-8">
          <View className="bg-[#1C1C1E] rounded-2xl p-6 w-full items-center">
            <TouchableOpacity
              className="absolute top-4 right-4"
              onPress={() => setModalVisible(false)}
            >
              <View className="w-12 h-12 bg-[#2A2A2A] rounded-full justify-center items-center">
                <Text className="text-white text-lg font-semibold">X</Text>
              </View>
            </TouchableOpacity>

            <View className="w-16 h-16 bg-[#2A2A2A] rounded-full justify-center items-center mb-4">
              <PhoneIcon width={32} height={32} />
            </View>

            <Text className="text-white text-xl font-bold mb-2">Change Phone Number</Text>
            
            <Text className="text-[#A0A0A0] text-center mb-6">
              This will update your account's verified contact information. Confirm to proceed.
            </Text>

            <TouchableOpacity
              className="bg-[#2A2A2A] w-full py-3 rounded-full"
              onPress={handleProceed}
              disabled={isLoading}
            >
              <Text className="text-white text-center text-lg font-semibold">
                {isLoading ? 'Updating...' : 'Proceed'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default EditPhoneScreen; 