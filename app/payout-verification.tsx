import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import ArrowLeft from '../assets/icons/arrow-left.svg';
import Mail from '../assets/icons/mail.svg';
import BankDetailsAddedModal from '../components/modals/BankDetailsAddedModal';

export default function PayoutVerificationScreen() {
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const [isModalVisible, setModalVisible] = useState(false);

  const handleVerify = () => {
    // Add OTP verification logic here
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    router.push('/(tabs)/profile'); // Navigate to a relevant screen
  };

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      value = value[value.length - 1];
    }
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input if value is entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      
      <View className="px-6 pt-4">
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="w-14 h-14 rounded-full bg-[#1E1E1E] items-center justify-center self-start"
        >
          <ArrowLeft width={24} height={24} />
        </TouchableOpacity>
      </View>


      <View className="flex-1 px-6 items-center pt-12">
        <View className="w-16 h-16 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] items-center justify-center mb-6">
          <Mail width={32} height={32} />
        </View>

        <Text className="text-white text-2xl font-bold mb-3">
          Verification Code
        </Text>
        <Text className="text-gray-400 text-base text-center mb-12">
          Enter the 6-digit code sent to your@email.com to confirm your payout details.
        </Text>

        <View className="flex-row justify-between mb-12 w-full">
          {Array.from({ length: 6 }).map((_, index) => (
            <View 
              key={index} 
              className="w-[48px] h-[56px] rounded-xl bg-[#1C1C1E] border border-[#2C2C2E] items-center justify-center relative"
            >
              {otp[index] === '' && (
                <View className="w-4 h-[2px] bg-[#6B7280]" />
              )}
              <TextInput
                ref={el => {
                  if (inputRefs.current) {
                    inputRefs.current[index] = el;
                  }
                }}
                value={otp[index]}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                className="absolute inset-0 w-full h-full text-center text-white text-xl font-medium bg-transparent"
                selectionColor="#FF0000"
              />
            </View>
          ))}
        </View>

        <View className="w-full h-[52px] rounded-full overflow-hidden mb-8">
          <LinearGradient
            colors={['#FF0000', '#330000']}
            locations={[0, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="w-full h-full"
          >
            <TouchableOpacity 
              className="w-full h-full items-center justify-center"
              onPress={handleVerify}
            >
              <Text className="text-white text-[17px] font-semibold">Verify</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <View className="flex-row justify-center">
          <Text className="text-gray-400">Didn't get OTP? </Text>
          <TouchableOpacity>
            <Text className="text-[#CC0000] font-medium">Resend Code</Text>
          </TouchableOpacity>
        </View>
      </View>
      <BankDetailsAddedModal
        visible={isModalVisible}
        onClose={handleCloseModal}
      />
    </SafeAreaView>
  );
} 