import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import Mail from '../../assets/icons/mail.svg';
import { useVerifyOTPMutation, useResendOTPMutation } from '../../src/store/authApi';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials, clearPendingEmail, selectPendingEmail } from '../../src/store/authSlice';

export default function VerifyScreen() {
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const [otpError, setOtpError] = useState('');
  
  const dispatch = useDispatch();
  const pendingEmail = useSelector(selectPendingEmail);
  const [verifyOTP, { isLoading: isVerifying }] = useVerifyOTPMutation();
  const [resendOTP, { isLoading: isResending }] = useResendOTPMutation();

  // Redirect if no pending email on initial load
  React.useEffect(() => {
    if (!pendingEmail) {
      router.replace('/(auth)/signup');
    }
  }, []); // Only run on mount, not when pendingEmail changes

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      value = value[value.length - 1];
    }
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Clear error when user starts typing
    if (otpError) setOtpError('');

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

  const handleVerifyOTP = async () => {
    if (!pendingEmail) {
      Alert.alert('Error', 'No email found for verification');
      return;
    }

    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setOtpError('Please enter all 6 digits');
      return;
    }

    try {
      const result = await verifyOTP({
        email: pendingEmail,
        otp: otpCode,
        purpose: 'signup',
      }).unwrap();

      console.log('🔥 OTP Verification Result:', result);
      console.log('🔥 User profile_completed:', result.user?.profile_completed);

      // Store authentication data
      dispatch(setCredentials(result));
      dispatch(clearPendingEmail());

      // Always redirect to signup-two for profile completion after successful OTP verification
      console.log('🔥 Redirecting to signup-two');
      router.replace('/(auth)/signup-two');
      
    } catch (error: any) {
      console.error('OTP verification error:', error);
      if (error.data?.otp?.[0]) {
        setOtpError(error.data.otp[0]);
      } else if (error.data?.non_field_errors?.[0]) {
        setOtpError(error.data.non_field_errors[0]);
      } else {
        setOtpError('Invalid OTP. Please try again.');
      }
    }
  };

  const handleResendOTP = async () => {
    if (!pendingEmail) {
      Alert.alert('Error', 'No email found for resending OTP');
      return;
    }

    try {
      await resendOTP({ email: pendingEmail, purpose: 'signup' }).unwrap();
      Alert.alert('Success', 'OTP sent successfully to your email');
      // Clear current OTP
      setOtp(['', '', '', '', '', '']);
      setOtpError('');
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      Alert.alert('Error', 'Failed to resend OTP. Please try again.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      
      {/* Back Button */}
      <TouchableOpacity 
        onPress={() => router.back()} 
        className="w-14 h-14 rounded-full bg-[#1C1C1E] items-center justify-center ml-6 mt-2"
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
          Enter the 6-digit code sent to {pendingEmail || 'your email'} to verify your account.
        </Text>

        {/* OTP Input */}
        <View className="flex-row justify-between mb-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <View 
              key={index} 
              className={`w-[48px] h-[56px] rounded-xl bg-[#1C1C1E] border items-center justify-center relative ${
                otpError ? 'border-red-500' : 'border-[#2C2C2E]'
              }`}
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
                editable={!isVerifying}
              />
            </View>
          ))}
        </View>
        
        {/* Error Message */}
        {otpError ? (
          <Text className="text-red-500 text-sm text-center mb-8">{otpError}</Text>
        ) : (
          <View className="mb-8" />
        )}

        {/* Verify Button */}
        <View className="w-full h-[52px] rounded-full overflow-hidden mb-8">
          <LinearGradient
            colors={isVerifying ? ['#666666', '#333333'] : ['#FF0000', '#330000']}
            locations={[0, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="w-full h-full"
          >
            <TouchableOpacity 
              className="w-full h-full items-center justify-center"
              onPress={handleVerifyOTP}
              disabled={isVerifying}
            >
              <Text className="text-white text-[17px] font-semibold">
                {isVerifying ? 'Verifying...' : 'Verify'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Resend Code */}
        <View className="flex-row justify-center">
          <Text className="text-gray-400">Didn't get OTP? </Text>
          <TouchableOpacity onPress={handleResendOTP} disabled={isResending}>
            <Text className={`font-medium ${isResending ? 'text-gray-500' : 'text-[#CC0000]'}`}>
              {isResending ? 'Sending...' : 'Resend Code'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
} 