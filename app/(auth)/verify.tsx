import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import Mail from '../../assets/icons/mail.svg';

export default function VerifyScreen() {
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<Array<TextInput | null>>([]);

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
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      
      {/* Back Button */}
      <TouchableOpacity 
        onPress={() => router.back()} 
        className="w-10 h-10 rounded-full bg-[#1C1C1E] items-center justify-center ml-6 mt-2"
      >
        <ArrowLeft width={24} height={24} />
      </TouchableOpacity>

      <View className="flex-1 px-6 pt-12">
        {/* Email Icon */}
        <View className="w-16 h-16 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] items-center justify-center mb-6">
          <Mail width={32} height={32} />
        </View>

        {/* Header */}
        <Text className="text-white text-2xl font-bold mb-3">
          Check Your Email
        </Text>
        <Text className="text-gray-400 text-base mb-12">
          Enter the 6-digit code sent to your@email.com to reset your password.
        </Text>

        {/* OTP Input */}
        <View className="flex-row justify-between mb-12">
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

        {/* Verify Button */}
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
              onPress={() => router.push('/(auth)/signup-two')}
            >
              <Text className="text-white text-[17px] font-semibold">Verify</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Resend Code */}
        <View className="flex-row justify-center">
          <Text className="text-gray-400">Didn't get OTP? </Text>
          <TouchableOpacity>
            <Text className="text-[#CC0000] font-medium">Resend Code</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
} 