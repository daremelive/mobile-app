import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, Image, Alert, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSignupMutation, useGoogleAuthMutation } from '../../src/store/authApi';
import { useDispatch } from 'react-redux';
import { setPendingEmail, setError, setCredentials } from '../../src/store/authSlice';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri, exchangeCodeAsync, TokenResponse, ResponseType } from 'expo-auth-session';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const dispatch = useDispatch();
  const [signup, { isLoading }] = useSignupMutation();
  const [googleAuth, { isLoading: isGoogleLoading }] = useGoogleAuthMutation();

  // Google Auth for signup (same as signin)
  WebBrowser.maybeCompleteAuthSession();
  useEffect(() => {
    WebBrowser.warmUpAsync();
    return () => {
      WebBrowser.coolDownAsync();
    };
  }, []);
  const extra = (Constants?.expoConfig as any)?.extra || (Constants?.manifest as any)?.extra || {};
  const googleClientId = extra?.GOOGLE_CLIENT_ID || extra?.googleClientId || undefined;
  const iosClientId = extra?.GOOGLE_IOS_CLIENT_ID || extra?.googleIosClientId || undefined;
  const androidClientId = extra?.GOOGLE_ANDROID_CLIENT_ID || extra?.googleAndroidClientId || undefined;

  // Build the native redirect URI required by Google on iOS/Android
  const toNativeRedirect = (cid?: string) =>
    cid ? `com.googleusercontent.apps.${cid.replace('.apps.googleusercontent.com', '')}:/oauthredirect` : undefined;
  const nativeRedirect = Platform.select({
    ios: toNativeRedirect(iosClientId),
    android: toNativeRedirect(androidClientId),
    default: undefined,
  });
  const appScheme = Array.isArray((Constants as any)?.expoConfig?.scheme)
    ? (Constants as any)?.expoConfig?.scheme?.[0]
    : (Constants as any)?.expoConfig?.scheme || 'mobile';
  const redirectUri = makeRedirectUri({
    native: nativeRedirect,
    scheme: appScheme,
  });

  // Debug logging for production troubleshooting
  console.log('Google Auth Config (Signup):', {
    googleClientId: googleClientId ? `${googleClientId.substring(0, 10)}...` : 'undefined',
    iosClientId: iosClientId ? `${iosClientId.substring(0, 10)}...` : 'undefined',
    nativeRedirect,
    redirectUri,
    platform: Platform.OS,
  });

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: Platform.OS === 'ios' ? iosClientId : Platform.OS === 'android' ? androidClientId : googleClientId,
    iosClientId,
    androidClientId,
    scopes: ['openid', 'profile', 'email'],
    responseType: ResponseType.Code,
    usePKCE: true,
    redirectUri,
    extraParams: {
      include_granted_scopes: 'true',
    },
  });

  useEffect(() => {
    const handleResponse = async () => {
      if (response?.type === 'success') {
        try {
          let idToken = (response as any)?.params?.id_token || (response as any)?.authentication?.idToken;
          const code = (response as any)?.params?.code;

          if (!idToken && code) {
            const clientIdToUse = Platform.OS === 'ios' ? iosClientId : Platform.OS === 'android' ? androidClientId : googleClientId;
            const tokenRes: TokenResponse = await exchangeCodeAsync(
              {
                clientId: clientIdToUse!,
                code,
                redirectUri,
                extraParams: { code_verifier: (request as any)?.codeVerifier || '' },
              },
              { tokenEndpoint: 'https://oauth2.googleapis.com/token' }
            );
            idToken = (tokenRes as any)?.idToken || (tokenRes as any)?.id_token;
          }

          if (!idToken) {
            Alert.alert('Google Sign-In', 'Failed to retrieve ID token');
            return;
          }

          const result = await googleAuth({ id_token: idToken } as any).unwrap();
          dispatch(setCredentials(result));
          if (!result.user.profile_completed) {
            router.replace('/(auth)/signup-two');
          } else {
            router.replace('/(tabs)/home');
          }
        } catch (e: any) {
          console.error('Google signup error:', e);
          const msg = e?.data?.message || e?.data?.error || 'Google authentication failed';
          Alert.alert('Google Sign-In', msg);
        }
      }
    };
    handleResponse();
  }, [response]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 8;
  };

  const handleSignup = async () => {
    // Clear previous errors
    setEmailError('');
    setPasswordError('');
    dispatch(setError(null));

    // Validate inputs
    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (!password) {
      setPasswordError('Password is required');
      return;
    }

    if (!validatePassword(password)) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    try {
      const result = await signup({
        email: email.trim().toLowerCase(),
        password,
        confirm_password: confirmPassword,
      }).unwrap();

      // Store email for OTP verification
      dispatch(setPendingEmail(email.trim().toLowerCase()));
      
      // Navigate to verification screen
      router.push('/verify');
    } catch (error: any) {
      console.error('Signup error:', error);
      if (error.data?.email?.[0]) {
        setEmailError(error.data.email[0]);
      } else if (error.data?.password?.[0]) {
        setPasswordError(error.data.password[0]);
      } else if (error.data?.non_field_errors?.[0]) {
        Alert.alert('Error', error.data.non_field_errors[0]);
      } else {
        Alert.alert('Error', 'Failed to create account. Please try again.');
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 pt-16 pb-8">
          {/* Header */}
          <View className="mb-12">
            <Text className="text-white text-2xl font-bold mb-3">
              Create your Account
            </Text>
            <Text className="text-gray-400 text-base leading-6">
              Unlock live streaming, virtual gifts, and real-time interactions with just a few steps.
            </Text>
          </View>

        {/* Form */}
        <View className="space-y-6">
          {/* Email Field */}
          <View className="mb-6">
            <Text className="text-white text-sm mb-2">Email</Text>
            <TextInput
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError('');
              }}
              placeholder="e.g joedoe@gmail.com"
              placeholderTextColor="#6B7280"
              className={`bg-[#1C1C1E] text-white px-4 py-4 rounded-full border ${
                emailError ? 'border-red-500' : 'border-[#2C2C2E]'
              }`}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />
            {emailError ? (
              <Text className="text-red-500 text-sm mt-1 ml-4">{emailError}</Text>
            ) : null}
          </View>

          {/* Password Field */}
          <View className="mb-6">
            <Text className="text-white text-sm mb-2">Password</Text>
            <View className="relative">
              <TextInput
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="••••••••"
                placeholderTextColor="#6B7280"
                className={`bg-[#1C1C1E] text-white px-4 py-4 rounded-full border pr-12 ${
                  passwordError ? 'border-red-500' : 'border-[#2C2C2E]'
                }`}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-4"
                disabled={isLoading}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
            {passwordError ? (
              <Text className="text-red-500 text-sm mt-1 ml-4">{passwordError}</Text>
            ) : null}
          </View>

          {/* Confirm Password Field */}
          <View className="mb-6">
            <Text className="text-white text-sm mb-2">Confirm Password</Text>
            <View className="relative">
              <TextInput
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="••••••••"
                placeholderTextColor="#6B7280"
                className={`bg-[#1C1C1E] text-white px-4 py-4 rounded-full border pr-12 ${
                  passwordError ? 'border-red-500' : 'border-[#2C2C2E]'
                }`}
                secureTextEntry={!showConfirmPassword}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-4"
                disabled={isLoading}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Terms & Conditions */}
        <View className=" mb-10">
          <Text className="text-gray-400 text-sm">
            By signing up, you agree to our{' '}
            <Text className="text-red-500">Terms & Conditions</Text> and{' '}
            <Text className="text-red-500">Privacy Policy</Text>
          </Text>
        </View>

        {/* Sign Up Button */}
        <View className="w-full h-[52px] rounded-full overflow-hidden mb-6">
          <LinearGradient
            colors={isLoading ? ['#666666', '#333333'] : ['#FF0000', '#330000']}
            locations={[0, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="w-full h-full"
          >
            <TouchableOpacity 
              className="w-full h-full items-center justify-center"
              onPress={handleSignup}
              disabled={isLoading}
            >
              <Text className="text-white text-[17px] font-semibold">
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
        
        {/* Or Divider */}
        <View className="flex-row items-center mb-6">
          <View className="flex-1 h-[1px] bg-[#2C2C2E]" />
          <Text className="text-gray-400 px-4">or</Text>
          <View className="flex-1 h-[1px] bg-[#2C2C2E]" />
        </View>

        {/* Google Continue Button */}
        <TouchableOpacity
          className="w-full h-[52px] bg-[#1C1C1E] border border-[#2C2C2E] rounded-full flex-row items-center justify-center mb-8"
          onPress={async () => {
            if (!iosClientId && !androidClientId && !googleClientId) {
              Alert.alert('Google Sign-In', 'Google client IDs are not configured.');
              return;
            }
            setTimeout(() => {
              promptAsync();
            }, 100);
          }}
          disabled={isGoogleLoading || !request}
        >
          <Image 
            source={require('../../assets/icons/google.png')} 
            className="w-8 h-8 mr-3"
          />
          <Text className="text-white text-[17px] font-medium ml-3">{isGoogleLoading ? 'Signing in...' : 'Continue with Google'}</Text>
        </TouchableOpacity>

        {/* Sign In Link */}
        <View className="flex-row justify-center mt-8 mb-8">
          <Text className="text-gray-400 text-base">
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/signin')}>
            <Text className="text-red-500 text-base font-medium">Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}