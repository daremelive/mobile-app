import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useDispatch } from 'react-redux';
import { setPendingEmail } from '../src/store/authSlice';
import { usePasswordResetRequestMutation } from '../src/store/authApi';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import LockPasswordIcon from '../assets/icons/lock-password.svg';
import { LinearGradient } from 'expo-linear-gradient';

const ForgotPasswordScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [passwordResetRequest, { isLoading }] = usePasswordResetRequestMutation();

  const handleSendResetCode = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      await passwordResetRequest({ email: email.trim() }).unwrap();
      dispatch(setPendingEmail(email.trim()));
      Alert.alert('Success', 'Reset code sent to your email');
      router.push('/(auth)/verify-forgot-password');
    } catch (error: any) {
      console.error('Password reset request error:', error);
      if (error.data?.email?.[0]) {
        Alert.alert('Error', error.data.email[0]);
      } else {
        Alert.alert('Error', 'Failed to send reset code. Please try again.');
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      <View className="px-6 pt-4">
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="w-14 h-14 rounded-full bg-[#1E1E1E] items-center justify-center"
        >
          <ArrowLeftIcon width={24} height={24} />
        </TouchableOpacity>
      </View>

      <View className="flex-1 px-6 pt-12">
        <View className="w-16 h-16 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] items-center justify-center mb-6">
          <LockPasswordIcon width={32} height={32} />
        </View>
        
        <Text className="text-white text-3xl font-bold mb-3">Forgot Password</Text>
        <Text className="text-gray-400 text-base mb-10">
          Enter your email address, and we'll send you a code to reset your password.
        </Text>

        <View className="mb-6">
          <Text className="text-white mb-2">Email</Text>
          <TextInput
            placeholder="Enter your email address"
            placeholderTextColor="#8A8A8E"
            className="bg-[#1C1C1E] text-white rounded-full border border-[#333333] px-5 w-full h-14"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!isLoading}
          />
        </View>

        {/* <View className="mt-auto mb-8">
            <LinearGradient
                colors={['#FF0000', '#330000']}
                locations={[0, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="w-full rounded-full"
            >
                <TouchableOpacity 
                    className="w-full h-[52px] items-center justify-center"
                    onPress={() => router.push('/(auth)/verify')}
                >
                    <Text className="text-white text-[17px] font-semibold">Send Reset Code</Text>
                </TouchableOpacity>
            </LinearGradient>
        </View> */}
        <View className="w-full h-[52px] rounded-full overflow-hidden mb-6 mt-4">
          <LinearGradient
            colors={isLoading ? ['#666666', '#333333'] : ['#FF0000', '#330000']}
            locations={[0, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="w-full h-full"
          >
            <TouchableOpacity 
              className="w-full h-full items-center justify-center"
              onPress={handleSendResetCode}
              disabled={isLoading}
            >
              <Text className="text-white text-[17px] font-semibold">
                {isLoading ? 'Sending...' : 'Send Reset Code'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen; 