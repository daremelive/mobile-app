import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND_GRADIENT } from '@/constants/Gradients';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import { useUpdateProfileMutation } from '../../src/store/authApi';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, selectCurrentUser } from '../../src/store/authSlice';
import { markAccountCreated } from '../../src/hooks/useAuthRouting';
import { logger } from '../../src/utils/logger';

const INTERESTS = [
  'Education', 'Art & Creativity', 'Sports', 'Health', 'DIY',
  'Fashion & Beauty', 'Travel', 'Music', 'Comedy', 'Movie',
  'Tech & Gadgets', 'Food', 'Gaming'
];

export default function SignupThreeScreen() {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();

  // Log authentication status for debugging
  React.useEffect(() => {
  }, []);

  // Don't redirect automatically - let user manually go back if needed
  // If user reached this screen, they should be authenticated

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(item => item !== interest)
        : [...prev, interest]
    );
  };

    const handleSaveInterests = async () => {
    try {
      // Convert array to comma-separated string as backend expects
      const interestsString = selectedInterests.join(', ');


      const result = await updateProfile({
        interests: interestsString,
      }).unwrap();


      // Update user data in store
      dispatch(setUser(result));

      // MARK ACCOUNT CREATION COMPLETE
      await markAccountCreated();

      // Navigate to home with a clean slate
      router.dismissAll();
      router.replace('/(tabs)/home');
    } catch (error: any) {
      logger.error('Failed to save interests:', error);
      Alert.alert('Error', 'Failed to save interests. Please try again.');
    }
  };

  const handleSkip = () => {

    // MARK ACCOUNT CREATION COMPLETE (even when skipping)
    markAccountCreated();

    // Navigate to home with a clean slate
    router.dismissAll();
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      <ScrollView
        contentContainerClassName="flex-grow justify-between pb-10 pt-3"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6">
            <TouchableOpacity
              onPress={() => {
                router.replace('/(auth)/signup-two');
              }}
              className="w-14 h-14 rounded-full bg-[#1C1C1E] items-center justify-center mb-6 self-start"
            >
              <ArrowLeft width={24} height={24} fill="#FFF" />
            </TouchableOpacity>

            <Text className="text-white text-2xl font-bold mb-2">
              Personalize Your Experience
            </Text>
            <Text className="text-gray-400 text-base mb-10">
              Select your interests to discover streams and content you’ll love!
            </Text>

            <View className="flex-row flex-wrap justify-start mb-10">
                {INTERESTS.map(interest => {
                const isSelected = selectedInterests.includes(interest);
                return (
                    <TouchableOpacity
                    key={interest}
                    onPress={() => toggleInterest(interest)}
                    className={`flex-row items-center border rounded-xl px-3 py-2.5 mr-2.5 mb-3 h-[46px]
                                ${isSelected
                                  ? 'bg-[#C4272033] border-[#C42720]'
                                  : 'bg-[#1C1C1E] border-[#2C2C2E]'}`}
                    >
                    <Feather name="search" size={18} color='#FFFFFF' />
                    <Text className={`ml-2 text-sm font-semibold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                        {interest}
                    </Text>
                    </TouchableOpacity>
                );
                })}
            </View>

            {/* Skip option */}
            <TouchableOpacity
              onPress={handleSkip}
              className="items-center mb-6"
              disabled={isLoading}
            >
              <Text className="text-gray-400 text-base">Skip for now</Text>
            </TouchableOpacity>
        </View>

        <View className="px-6 w-full mb-4">
            <View className="w-full h-[52px] rounded-full overflow-hidden">
                <LinearGradient
                colors={isLoading ? ['#666666', '#333333'] : BRAND_GRADIENT}
                locations={[0, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="w-full h-full"
                >
                <TouchableOpacity
                    onPress={handleSaveInterests}
                    className="w-full h-full items-center justify-center"
                    disabled={isLoading}
                >
                    <Text className="text-white text-[17px] font-semibold">
                      {isLoading ? 'Saving...' : 'Proceed'}
                    </Text>
                </TouchableOpacity>
                </LinearGradient>
            </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
