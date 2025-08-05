import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import { useUpdateProfileMutation } from '../../src/store/authApi';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, selectCurrentUser } from '../../src/store/authSlice';

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
    console.log('🔍 Signup-three mounted:', {
      currentUser: !!currentUser,
      email: currentUser?.email,
      username: currentUser?.username,
      profileCompleted: currentUser?.profile_completed,
      vipLevel: currentUser?.vip_level
    });
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
      
      console.log('🎯 Saving interests:', selectedInterests);
      console.log('🎯 Interests string:', interestsString);
      console.log('🎯 Current user before save:', {
        email: currentUser?.email,
        username: currentUser?.username,
        id: currentUser?.id,
        profile_completed: currentUser?.profile_completed,
        interests: currentUser?.interests
      });
      
      const result = await updateProfile({
        interests: interestsString,
      }).unwrap();

      console.log('✅ Interests saved successfully:', result);
      console.log('🎯 Updated user profile_completed:', result.profile_completed);

      // Update user data in store
      dispatch(setUser(result));

      console.log('🏠 Navigating to home screen');
      // Navigate to home with a clean slate
      router.dismissAll();
      router.replace('/(tabs)/home');
    } catch (error: any) {
      console.error('❌ Failed to save interests:', error);
      Alert.alert('Error', 'Failed to save interests. Please try again.');
    }
  };

  const handleSkip = () => {
    console.log('⏭️ Skipping interests selection');
    console.log('🎯 Current user before skip:', {
      email: currentUser?.email,
      username: currentUser?.username,
      profile_completed: currentUser?.profile_completed,
      interests: currentUser?.interests
    });
    console.log('🏠 Navigating to home screen (skip)');
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
                console.log('🔙 Back button pressed from signup-three');
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
              Select your interests to discover streams and content you'll love!
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
                colors={isLoading ? ['#666666', '#333333'] : ['#FF0000', '#330000']}
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