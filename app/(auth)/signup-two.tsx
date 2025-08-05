import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import CountryPicker, { CountryCode, Country, DARK_THEME, getCallingCode } from 'react-native-country-picker-modal';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import RadioChecked from '../../assets/icons/radio-checked.svg';
import RadioUnchecked from '../../assets/icons/radio-unchecked.svg';
import { useCompleteProfileMutation } from '../../src/store/authApi';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, selectCurrentUser } from '../../src/store/authSlice';

export default function SignupTwoScreen() {
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('female');
  const [address, setAddress] = useState('');
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState({
    username: '',
    phoneNumber: '',
    country: '',
    terms: '',
  });
  
  // Refs for managing input focus
  const scrollViewRef = useRef<ScrollView>(null);
  const usernameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const [completeProfile, { isLoading }] = useCompleteProfileMutation();

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!currentUser) {
      router.replace('/(auth)/signin');
    }
  }, [currentUser]);

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

  const validateInputs = () => {
    const newErrors = {
      username: '',
      phoneNumber: '',
      country: '',
      terms: '',
    };

    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-z0-9]+$/.test(username)) {
      newErrors.username = 'Username must contain only lowercase letters and numbers';
    }

    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    }

    if (!residenceCountry) {
      newErrors.country = 'Please select your country of residence';
    }

    if (!hasAcceptedTerms) {
      newErrors.terms = 'You must accept the terms and conditions';
    }

    setErrors(newErrors);
    return Object.values(newErrors).every(error => error === '');
  };

  const handleCompleteProfile = async () => {
    if (!validateInputs()) {
      return;
    }

    try {
      const fullPhoneNumber = `+${getCurrentCallingCode()}${phoneNumber}`;
      
      const result = await completeProfile({
        username: username.trim(),
        phone_number: fullPhoneNumber,
        gender, // Already lowercase
        country: residenceCountry?.cca2 || '',
        has_accepted_terms: hasAcceptedTerms,
      }).unwrap();

      // Update user data in store
      dispatch(setUser(result.user));

      // Navigate to interests selection or main app
      router.replace('/(auth)/signup-three');
    } catch (error: any) {
      console.error('Profile completion error:', error);
      if (error.data?.username?.[0]) {
        setErrors(prev => ({ ...prev, username: error.data.username[0] }));
      } else if (error.data?.phone_number?.[0]) {
        setErrors(prev => ({ ...prev, phoneNumber: error.data.phone_number[0] }));
      } else if (error.data?.non_field_errors?.[0]) {
        Alert.alert('Error', error.data.non_field_errors[0]);
      } else {
        Alert.alert('Error', 'Failed to complete profile. Please try again.');
      }
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const scrollToInput = (inputRef: React.RefObject<TextInput | null>) => {
    setTimeout(() => {
      if (inputRef.current && scrollViewRef.current) {
        inputRef.current.measureInWindow((x, y, width, height) => {
          const scrollY = y - 100; // Offset to ensure input is visible above keyboard
          scrollViewRef.current?.scrollTo({ y: Math.max(0, scrollY), animated: true });
        });
      }
    }, 100);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      <KeyboardAvoidingView 
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <ScrollView 
            ref={scrollViewRef}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
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
                ref={usernameRef}
                value={username}
                onChangeText={(text) => {
                  // Convert to lowercase and remove any uppercase letters or special characters
                  const lowercaseText = text.toLowerCase().replace(/[^a-z0-9]/g, '');
                  setUsername(lowercaseText);
                  if (errors.username) setErrors(prev => ({ ...prev, username: '' }));
                }}
                onFocus={() => scrollToInput(usernameRef)}
                placeholder="e.g joedo123"
                placeholderTextColor="#6B7280"
                className={`bg-[#1C1C1E] text-white px-4 py-3.5 rounded-full border h-[52px] ${
                  errors.username ? 'border-red-500' : 'border-[#2C2C2E]'
                }`}
                editable={!isLoading}
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
                blurOnSubmit={false}
              />
              {errors.username ? (
                <Text className="text-red-500 text-sm mt-1 ml-4">{errors.username}</Text>
              ) : null}
            </View>

          {/* Phone Number */}
          <View className="mb-6">
            <Text className="text-white text-sm mb-2">Phone Number</Text>
            <View className={`flex-row items-center bg-[#1C1C1E] rounded-full border h-[52px] ${
              errors.phoneNumber ? 'border-red-500' : 'border-[#2C2C2E]'
            }`}>
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
                ref={phoneRef}
                value={phoneNumber}
                onChangeText={(text) => {
                  setPhoneNumber(text);
                  if (errors.phoneNumber) setErrors(prev => ({ ...prev, phoneNumber: '' }));
                }}
                onFocus={() => scrollToInput(phoneRef)}
                placeholder="Phone Number"
                placeholderTextColor="#6B7280"
                className="flex-1 bg-transparent text-white px-4 h-full"
                keyboardType="phone-pad"
                editable={!isLoading}
                returnKeyType="next"
                onSubmitEditing={() => addressRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            {errors.phoneNumber ? (
              <Text className="text-red-500 text-sm mt-1 ml-4">{errors.phoneNumber}</Text>
            ) : null}
          </View>

          {/* Gender */}
          <View className="mb-6">
            <Text className="text-white text-sm mb-2">Gender</Text>
            <View className="flex-row justify-start">
              <TouchableOpacity 
                onPress={() => setGender('male')} 
                className={`flex-row items-center px-6 py-3.5 rounded-full h-[52px] border ${gender === 'male' ? 'bg-[#1C1C1E] border-[#C42720]' : 'bg-[#1C1C1E] border-[#2C2C2E]'}`}
              >
                {gender === 'male' ? <RadioChecked width={20} height={20} fill="#C42720" /> : <RadioUnchecked width={20} height={20} fill="#6B7280" />}
                <Text className={`ml-2 ${gender === 'male' ? 'text-white' : 'text-gray-400'}`}>Male</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setGender('female')} 
                className={`flex-row items-center px-6 py-3.5 rounded-full h-[52px] border ml-3 ${gender === 'female' ? 'bg-[#1C1C1E] border-[#C42720]' : 'bg-[#1C1C1E] border-[#2C2C2E]'}`}
              >
                 {gender === 'female' ? <RadioChecked width={20} height={20} fill="#FFFFFF" /> : <RadioUnchecked width={20} height={20} fill="#6B7280" />}
                <Text className={`ml-2 ${gender === 'female' ? 'text-white' : 'text-gray-400'}`}>Female</Text>
              </TouchableOpacity>
            </View>
          </View>

            {/* Address (Optional) */}
            <View className="mb-6">
              <Text className="text-white text-sm mb-2">Address <Text className="text-gray-500">(Optional)</Text></Text>
              <TextInput
                ref={addressRef}
                value={address}
                onChangeText={setAddress}
                onFocus={() => scrollToInput(addressRef)}
                placeholder="Enter your address"
                placeholderTextColor="#6B7280"
                className="bg-[#1C1C1E] text-white px-4 py-3.5 rounded-full border border-[#2C2C2E] h-[52px]"
                returnKeyType="done"
                onSubmitEditing={dismissKeyboard}
              />
            </View>

          {/* Country of Residence */}
          <View className="mb-6">
            <Text className="text-white text-sm mb-2">Country of Residence</Text>
            <TouchableOpacity 
              onPress={() => setResidencePickerVisible(true)}
              className={`flex-row items-center justify-between bg-[#1C1C1E] px-4 rounded-full border h-[52px] ${
                errors.country ? 'border-red-500' : 'border-[#2C2C2E]'
              }`}
              disabled={isLoading}
            >
              <Text className={residenceCountry ? 'text-white' : 'text-gray-400'}>
                {residenceCountry ? (typeof residenceCountry.name === 'string' ? residenceCountry.name : residenceCountry.name.common) : 'Select Country'}
              </Text>
              <View className="w-2 h-2 border-b-2 border-r-2 border-gray-400 rotate-45" />
            </TouchableOpacity>
            <CountryPicker
              countryCode={residenceCountry ? residenceCountry.cca2 : 'NG'}
              withFlag={false}
              withFilter
              withAlphaFilter
              onSelect={(country) => {
                onSelectResidenceCountry(country);
                if (errors.country) setErrors(prev => ({ ...prev, country: '' }));
              }}
              visible={residencePickerVisible}
              onClose={() => setResidencePickerVisible(false)}
              theme={DARK_THEME}
              renderFlagButton={() => null}
            />
            {errors.country ? (
              <Text className="text-red-500 text-sm mt-1 ml-4">{errors.country}</Text>
            ) : null}
          </View>

          {/* Terms and Conditions */}
          <View className="mb-10">
            <TouchableOpacity 
              onPress={() => {
                setHasAcceptedTerms(!hasAcceptedTerms);
                if (errors.terms) setErrors(prev => ({ ...prev, terms: '' }));
              }}
              className="flex-row items-center"
              disabled={isLoading}
            >
              {hasAcceptedTerms ? (
                <RadioChecked width={20} height={20} fill="#C42720" />
              ) : (
                <RadioUnchecked width={20} height={20} fill="#6B7280" />
              )}
              <Text className="text-gray-400 text-sm ml-3 flex-1">
                I agree to the{' '}
                <Text className="text-red-500">Terms & Conditions</Text> and{' '}
                <Text className="text-red-500">Privacy Policy</Text>
              </Text>
            </TouchableOpacity>
            {errors.terms ? (
              <Text className="text-red-500 text-sm mt-1 ml-7">{errors.terms}</Text>
            ) : null}
          </View>

          {/* Proceed Button */}
          <View className="w-full h-[52px] rounded-full overflow-hidden">
            <LinearGradient
              colors={isLoading ? ['#666666', '#333333'] : ['#FF0000', '#330000']}
              locations={[0, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="w-full h-full"
            >
              <TouchableOpacity 
                onPress={handleCompleteProfile}
                className="w-full h-full items-center justify-center"
                disabled={isLoading}
              >
                <Text className="text-white text-[17px] font-semibold">
                  {isLoading ? 'Completing Profile...' : 'Proceed'}
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 