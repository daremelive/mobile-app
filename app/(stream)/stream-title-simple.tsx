import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  Animated,
  Image,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../src/store/authSlice';
import { Ionicons } from '@expo/vector-icons';

export default function StreamTitleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const currentUser = useSelector(selectCurrentUser) as any;
  
  // Get stream configuration from params with proper null checks
  const streamMode = (params.mode as string) || 'multi';
  const streamChannel = (params.channel as string) || 'video';
  const maxSeats = parseInt((params.seats as string) || '2') || 2;
  
  // State management
  const [title, setTitle] = useState('');
  
  // Animation references
  const fadeInAnimation = useRef(new Animated.Value(0)).current;
  const slideUpAnimation = useRef(new Animated.Value(50)).current;
  
  // Handle proceed action
  const handleProceed = () => {
    if (!title.trim()) {
      return;
    }

    // Animate out and navigate
    Animated.parallel([
      Animated.timing(fadeInAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnimation, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Navigate to multi.tsx with stream parameters
      router.push({
        pathname: '/stream/multi',
        params: {
          mode: streamMode,
          channel: streamChannel,
          seats: maxSeats.toString(),
          title: title.trim(),
          // Add a flag to indicate this came from the title screen
          fromTitleScreen: 'true'
        }
      });
    });
  };

  // Handle back action
  const handleBack = () => {
    router.back();
  };

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeInAnimation, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnimation, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-black" 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />
      
      <SafeAreaView className="flex-1 px-6">
        {/* Header with back button */}
        <View className="flex-row items-center justify-between pt-4 pb-8">
          <TouchableOpacity onPress={handleBack} className="p-2">
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        {/* Main Content */}
        <Animated.View 
          className="flex-1 justify-center"
          style={{
            opacity: fadeInAnimation,
            transform: [{ translateY: slideUpAnimation }]
          }}
        >
          {/* Stream Title Card */}
          <View className="bg-[#1C1C1E] rounded-2xl p-6 mb-8">
            {/* Card Header */}
            <Text className="text-white text-lg font-semibold text-center mb-6">
              Stream Title
            </Text>
            
            {/* Profile Picture and Input Row */}
            <View className="flex-row items-center space-x-3">
              {/* Profile Picture */}
              <View className="w-12 h-12 rounded-full overflow-hidden bg-gray-600">
                {currentUser?.profile_picture_url || currentUser?.profile_picture ? (
                  <Image 
                    source={{ 
                      uri: currentUser.profile_picture_url?.startsWith('http')
                        ? currentUser.profile_picture_url
                        : `http://192.168.1.117:8000${currentUser.profile_picture_url || currentUser.profile_picture}`
                    }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-full h-full bg-gray-600 items-center justify-center">
                    <Text className="text-white text-lg font-semibold">
                      {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Text Input */}
              <View className="flex-1">
                <TextInput
                  placeholder="Add a title to chat"
                  placeholderTextColor="#666"
                  value={title}
                  onChangeText={setTitle}
                  className="text-white text-base"
                  autoCorrect={false}
                  maxLength={100}
                  multiline={false}
                />
              </View>
            </View>
          </View>
        </Animated.View>
        
        {/* Proceed Button */}
        <View className="pb-8">
          <TouchableOpacity
            onPress={handleProceed}
            disabled={!title.trim()}
            className={`w-full py-4 rounded-xl items-center ${
              title.trim() ? 'bg-white' : 'bg-gray-600'
            }`}
          >
            <Text className={`font-semibold text-base ${
              title.trim() ? 'text-black' : 'text-gray-400'
            }`}>
              Proceed
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
