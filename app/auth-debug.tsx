import React from 'react';
import { View, Text, TouchableOpacity, Alert, SafeAreaView, ScrollView } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser, selectIsAuthenticated, logout } from '../src/store/authSlice';
import { clearAuthHistory, getAuthState } from '../src/hooks/useAuthRouting';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';

/**
 * 🔧 DEVELOPER AUTH DEBUG SCREEN
 * 
 * This screen helps test and debug the new authentication routing system.
 * It shows current auth state and provides utilities to reset the flow.
 * 
 * Access this screen by navigating to /auth-debug
 */

export default function AuthDebugScreen() {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [authState, setAuthState] = React.useState<any>(null);

  React.useEffect(() => {
    const loadAuthState = async () => {
      const state = await getAuthState();
      setAuthState(state);
    };
    loadAuthState();
  }, []);

  const handleClearAuthHistory = async () => {
    Alert.alert(
      'Clear Auth History',
      'This will reset the app to first-time user state. The app will treat the user as completely new.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearAuthHistory();
            setAuthState({ hasSeenOnboarding: false, hasCreatedAccount: false });
            Alert.alert('Success', 'Auth history cleared. User will see onboarding on next app launch.');
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'This will log out the current user but keep their account history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: () => {
            dispatch(logout());
            Alert.alert('Success', 'User logged out. On next app launch, they will go to login screen.');
          }
        }
      ]
    );
  };

  const handleGoToOnboarding = () => {
    router.replace('/');
  };

  const handleGoToLogin = () => {
    router.replace('/(auth)/signin');
  };

  const handleGoToSignup = () => {
    router.replace('/(auth)/signup');
  };

  const handleGoToHome = () => {
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      
      {/* Header */}
      <View className="flex-row items-center px-4 pt-3 pb-3 mb-6">
        <TouchableOpacity onPress={() => router.back()} className="bg-[#1E1E1E] w-14 h-14 rounded-full justify-center items-center">
          <ArrowLeftIcon width={24} height={24} />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-white text-lg font-bold">Auth Debug</Text>
        </View>
        <View className="w-14" />
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Current State */}
        <View className="bg-[#1C1C1E] rounded-xl p-4 mb-6">
          <Text className="text-white text-lg font-bold mb-3">Current State</Text>
          <View className="space-y-2">
            <Text className="text-gray-400">Is Authenticated: <Text className="text-white">{isAuthenticated ? 'Yes' : 'No'}</Text></Text>
            <Text className="text-gray-400">User ID: <Text className="text-white">{currentUser?.id || 'None'}</Text></Text>
            <Text className="text-gray-400">Username: <Text className="text-white">{currentUser?.username || 'None'}</Text></Text>
            <Text className="text-gray-400">Email: <Text className="text-white">{currentUser?.email || 'None'}</Text></Text>
            <Text className="text-gray-400">Profile Complete: <Text className="text-white">{currentUser?.profile_completed ? 'Yes' : 'No'}</Text></Text>
          </View>
        </View>

        {/* Storage State */}
        <View className="bg-[#1C1C1E] rounded-xl p-4 mb-6">
          <Text className="text-white text-lg font-bold mb-3">Storage State</Text>
          <View className="space-y-2">
            <Text className="text-gray-400">Has Seen Onboarding: <Text className="text-white">{authState?.hasSeenOnboarding ? 'Yes' : 'No'}</Text></Text>
            <Text className="text-gray-400">Has Created Account: <Text className="text-white">{authState?.hasCreatedAccount ? 'Yes' : 'No'}</Text></Text>
          </View>
        </View>

        {/* Expected Routing */}
        <View className="bg-[#1C1C1E] rounded-xl p-4 mb-6">
          <Text className="text-white text-lg font-bold mb-3">Expected Routing</Text>
          <Text className="text-gray-400 text-sm leading-5">
            {isAuthenticated && currentUser
              ? '✅ Should go to: Home Screen'
              : authState?.hasCreatedAccount
                ? '🔄 Should go to: Login Screen'
                : authState?.hasSeenOnboarding
                  ? '📝 Should go to: Signup Screen'
                  : '🆕 Should go to: Onboarding Screen'
            }
          </Text>
        </View>

        {/* Actions */}
        <View className="bg-[#1C1C1E] rounded-xl p-4 mb-6">
          <Text className="text-white text-lg font-bold mb-4">Actions</Text>
          
          <TouchableOpacity 
            onPress={handleClearAuthHistory}
            className="bg-red-600 rounded-lg p-3 mb-3"
          >
            <Text className="text-white text-center font-semibold">Clear Auth History</Text>
            <Text className="text-red-200 text-center text-xs mt-1">Reset to first-time user</Text>
          </TouchableOpacity>

          {isAuthenticated && (
            <TouchableOpacity 
              onPress={handleLogout}
              className="bg-orange-600 rounded-lg p-3 mb-3"
            >
              <Text className="text-white text-center font-semibold">Logout User</Text>
              <Text className="text-orange-200 text-center text-xs mt-1">Keep account history</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Navigation Test */}
        <View className="bg-[#1C1C1E] rounded-xl p-4 mb-8">
          <Text className="text-white text-lg font-bold mb-4">Test Navigation</Text>
          
          <TouchableOpacity 
            onPress={handleGoToOnboarding}
            className="bg-gray-600 rounded-lg p-3 mb-2"
          >
            <Text className="text-white text-center font-semibold">Go to Onboarding</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleGoToSignup}
            className="bg-gray-600 rounded-lg p-3 mb-2"
          >
            <Text className="text-white text-center font-semibold">Go to Signup</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleGoToLogin}
            className="bg-gray-600 rounded-lg p-3 mb-2"
          >
            <Text className="text-white text-center font-semibold">Go to Login</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleGoToHome}
            className="bg-gray-600 rounded-lg p-3"
          >
            <Text className="text-white text-center font-semibold">Go to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
