import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, Image, Alert, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import EyeOffIcon from '../../assets/icons/eye-off.svg';
import EyeIcon from '../../assets/icons/eye.svg';
import { useSigninMutation, useGoogleAuthMutation } from '../../src/store/authApi';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../src/store/authSlice';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri, exchangeCodeAsync, TokenResponse } from 'expo-auth-session';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export default function SigninScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const dispatch = useDispatch();
  const [signin, { isLoading }] = useSigninMutation();
  const [googleAuth, { isLoading: isGoogleLoading }] = useGoogleAuthMutation();

  // Prepare Google AuthSession
  WebBrowser.maybeCompleteAuthSession();
  useEffect(() => {
    // Work around iOS auth sheet interaction issues by warming up the browser
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
    // Use Google-required native redirect when available; fall back to app scheme
    native: nativeRedirect,
    scheme: appScheme,
  });

  // Debug logging
  console.log('Google Auth Debug:', {
    iosClientId,
    androidClientId,
    nativeRedirect,
    redirectUri,
    platform: Platform.OS,
  });

  // Use Authorization Code w/ PKCE (required for iOS native Google OAuth)
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: Platform.OS === 'ios' ? iosClientId : androidClientId || googleClientId,
    iosClientId,
    androidClientId,
    scopes: ['openid', 'profile', 'email'],
    responseType: 'code',
    redirectUri,
    usePKCE: true, // Explicitly enable PKCE
  });

  useEffect(() => {
    const handleResponse = async () => {
      if (response?.type === 'success') {
        try {
          let idToken = (response as any)?.params?.id_token;
          const code = (response as any)?.params?.code;

          // If no id_token provided directly (iOS native), exchange the code for tokens (PKCE)
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
          console.error('Google auth error:', e);
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

  const handleSignin = async () => {
    // Clear previous errors
    setEmailError('');
    setPasswordError('');
                      // no-op (leftover)
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

    try {
      const result = await signin({
        email: email.trim().toLowerCase(),
        password,
      }).unwrap();

      // Store authentication data
      dispatch(setCredentials(result));

      // Check if profile completion is required
      if (!result.user.profile_completed) {
        router.replace('/(auth)/signup-two');
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (error: any) {
      console.error('Signin error:', error);
      if (error.data?.email?.[0]) {
        setEmailError(error.data.email[0]);
      } else if (error.data?.password?.[0]) {
        setPasswordError(error.data.password[0]);
      } else if (error.data?.non_field_errors?.[0]) {
        Alert.alert('Error', error.data.non_field_errors[0]);
      } else if (error.status === 401) {
        Alert.alert('Error', 'Invalid email or password');
      } else {
        Alert.alert('Error', 'Failed to sign in. Please try again.');
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 py-8">
          <Text className="text-white text-3xl font-bold mb-2">Welcome Back</Text>
          <Text className="text-gray-400 text-base mb-10">
            Log in to stream, connect, and engage with your audience in real time.
          </Text>

        <View className="mb-6">
          <Text className="text-white mb-2">Email</Text>
          <TextInput
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (emailError) setEmailError('');
            }}
            placeholder="e.g joedoe@gmail.com"
            placeholderTextColor="#8A8A8E"
            className={`bg-[#1C1C1E] text-white rounded-full border px-5 w-full h-14 ${
              emailError ? 'border-red-500' : 'border-[#333333]'
            }`}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isLoading}
          />
          {emailError ? (
            <Text className="text-red-500 text-sm mt-1 ml-4">{emailError}</Text>
          ) : null}
        </View>

        <View className="mb-4">
          <Text className="text-white mb-2">Password</Text>
          <View className="relative">
            <TextInput
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (passwordError) setPasswordError('');
              }}
              placeholder="••••••••"
              placeholderTextColor="#8A8A8E"
              className={`bg-[#1C1C1E] text-white rounded-full border px-5 w-full h-14 ${
                passwordError ? 'border-red-500' : 'border-[#333333]'
              }`}
              secureTextEntry={!passwordVisible}
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setPasswordVisible(!passwordVisible)}
              className="absolute right-5 top-1/2 -translate-y-3"
              disabled={isLoading}
            >
              {passwordVisible ? (
                <EyeIcon width={24} height={24} stroke="#8A8A8E" />
              ) : (
                <EyeOffIcon width={24} height={24} stroke="#8A8A8E" />
              )}
            </TouchableOpacity>
          </View>
          {passwordError ? (
            <Text className="text-red-500 text-sm mt-1 ml-4">{passwordError}</Text>
          ) : null}
        </View>
        
        <TouchableOpacity 
          className="self-end mb-8"
          onPress={() => router.push('/forgot-password')}
        >
          <Text className="text-[#C40000] font-semibold">Forgot Password?</Text>
        </TouchableOpacity>

        {/* <LinearGradient
          colors={['#C40000', '#6F0000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="w-full rounded-full mb-6"
        >
          <TouchableOpacity
            className="w-full h-14 items-center justify-center"
            onPress={() => router.replace('/(tabs)/home')}
          >
            <Text className="text-white text-lg font-semibold">Sign In</Text>
          </TouchableOpacity>
        </LinearGradient> */}

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
              onPress={handleSignin}
              disabled={isLoading}
            >
              <Text className="text-white text-[17px] font-semibold">
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>       

        <View className="flex-row items-center my-4">
          <View className="flex-1 h-px bg-gray-600" />
          <Text className="text-gray-400 mx-4">or</Text>
          <View className="flex-1 h-px bg-gray-600" />
        </View>

        <TouchableOpacity
          className="w-full h-14 bg-[#1C1C1E] border border-[#333333] rounded-full flex-row items-center justify-center mb-8"
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
          <Image source={require('../../assets/icons/google.png')} className="w-6 h-6 mr-3" />
          <Text className="text-white text-lg font-semibold">{isGoogleLoading ? 'Signing in...' : 'Continue with Google'}</Text>
        </TouchableOpacity>

        <View className="flex-row justify-center">
          <Text className="text-gray-400">Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/signup')}>
            <Text className="text-[#C40000] font-semibold">Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}