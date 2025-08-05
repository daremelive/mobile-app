import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSelector, useDispatch } from 'react-redux';
import { selectPendingEmail, clearPendingEmail } from '../src/store/authSlice';
import { usePasswordResetConfirmMutation } from '../src/store/authApi';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import LockPasswordIcon from '../assets/icons/lock-password.svg';
import EyeOffIcon from '../assets/icons/eye-off.svg';
import { LinearGradient } from 'expo-linear-gradient';
import CheckIcon from '../assets/icons/check.svg';

const ResetPasswordScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const pendingEmail = useSelector(selectPendingEmail);
  const [passwordResetConfirm, { isLoading }] = usePasswordResetConfirmMutation();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!pendingEmail) {
      router.replace('/forgot-password');
    }
  }, [pendingEmail]);

  const handleReset = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }

    if (!confirmPassword.trim()) {
      Alert.alert('Error', 'Please confirm your password');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    if (!pendingEmail) {
      Alert.alert('Error', 'Session expired. Please start over.');
      router.replace('/forgot-password');
      return;
    }

    try {
      await passwordResetConfirm({
        email: pendingEmail,
        otp: '123456', // Using placeholder OTP as requested
        new_password: newPassword,
        new_password_confirm: confirmPassword,
      }).unwrap();

      setShowSuccess(true);
      dispatch(clearPendingEmail());
      
      // Navigate to signin after showing success
      setTimeout(() => {
        router.replace('/(auth)/signin');
      }, 2000);
    } catch (error: any) {
      console.error('Password reset error:', error);
      if (error.data?.new_password?.[0]) {
        Alert.alert('Error', error.data.new_password[0]);
      } else if (error.data?.non_field_errors?.[0]) {
        Alert.alert('Error', error.data.non_field_errors[0]);
      } else {
        Alert.alert('Error', 'Failed to reset password. Please try again.');
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
        {showSuccess && (
          <View className="bg-[#0A2A1A] border border-[#00DE4E] rounded-xl p-4 flex-row items-center mb-8">
            <View className="w-6 h-6 rounded-full bg-[#00DE4E] items-center justify-center mr-3">
              <CheckIcon width={16} height={16} stroke="#FFFFFF" strokeWidth={2}/>
            </View>
            <View>
              <Text className="text-white font-bold">Password Reset Successfully!</Text>
              <Text className="text-gray-300/40">You can now sign in with your new password.</Text>
            </View>
          </View>
        )}

        <View className="w-16 h-16 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] items-center justify-center mb-6">
          <LockPasswordIcon width={32} height={32} />
        </View>

        <Text className="text-white text-3xl font-bold mb-3">Reset Password</Text>
        <Text className="text-gray-400 text-base mb-10">
          Your new password must be different from your previous one. Make sure it's strong and secure!
        </Text>

        <View className="mb-6">
          <Text className="text-white mb-2">New Password</Text>
          <View className="relative">
            <TextInput
              placeholder="********"
              placeholderTextColor="#8A8A8E"
              className="bg-[#1C1C1E] text-white rounded-full border border-[#333333] px-5 w-full h-14"
              secureTextEntry={!newPasswordVisible}
              value={newPassword}
              onChangeText={setNewPassword}
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setNewPasswordVisible(!newPasswordVisible)}
              className="absolute right-5 top-1/2 -translate-y-3"
            >
              <EyeOffIcon width={24} height={24} stroke="#8A8A8E" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-white mb-2">Confirm Password</Text>
          <View className="relative">
            <TextInput
              placeholder="********"
              placeholderTextColor="#8A8A8E"
              className="bg-[#1C1C1E] text-white rounded-full border border-[#333333] px-5 w-full h-14"
              secureTextEntry={!confirmPasswordVisible}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
              className="absolute right-5 top-1/2 -translate-y-3"
            >
              <EyeOffIcon width={24} height={24} stroke="#8A8A8E" />
            </TouchableOpacity>
          </View>
        </View>
        <View className="w-full h-[52px] rounded-full overflow-hidden mb-6 mt-4">
          <LinearGradient
            colors={isLoading ? ['#666666', '#333333'] : ['#FF0000', '#330000']}
            locations={[0, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="w-full rounded-full"
          >
            <TouchableOpacity
              className="w-full h-[52px] items-center justify-center"
              onPress={handleReset}
              disabled={isLoading}
            >
              <Text className="text-white text-[17px] font-semibold">
                {isLoading ? 'Resetting...' : 'Reset'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ResetPasswordScreen; 