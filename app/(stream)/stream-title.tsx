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
import IPDetector from '../../src/utils/ipDetector';

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
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  
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
      // Navigate based on stream mode
      if (streamMode === 'single') {
        // Navigate to single.tsx with stream parameters
        router.push({
          pathname: '/stream/single',
          params: {
            mode: streamMode,
            channel: streamChannel,
            title: title.trim(),
            // Add a flag to indicate this came from the title screen
            fromTitleScreen: 'true'
          }
        });
      } else {
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
      }
    });
  };

  // Handle back action
  const handleBack = () => {
    router.back();
  };

  // Entrance animation
  useEffect(() => {
    // Get the dynamic API base URL
    IPDetector.getAPIBaseURL().then(url => {
      // console.log('Stream title - IP detector result:', url);
      setApiBaseUrl(url);
    }).catch(error => {
      console.error('Stream title - IP detector error:', error);
    });

    // Debug current user profile picture data
    // console.log('Stream title - Current user profile data:', {
    //   hasUser: !!currentUser,
    //   profilePictureUrl: currentUser?.profile_picture_url,
    //   profilePicture: currentUser?.profile_picture,
    //   username: currentUser?.username
    // });

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

  // Debug effect to track changes
  useEffect(() => {
    // console.log('Stream title - State change detected:', {
    //   apiBaseUrl,
    //   currentUser: currentUser ? {
    //     id: currentUser.id,
    //     username: currentUser.username,
    //     profile_picture_url: currentUser.profile_picture_url,
    //     profile_picture: currentUser.profile_picture
    //   } : null
    // });
  }, [apiBaseUrl, currentUser]);

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-black" 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />
      
      <SafeAreaView className="flex-1 px-6">
        {/* Main Content */}
        <Animated.View 
          className="pt-8"
          style={{
            opacity: fadeInAnimation,
            transform: [{ translateY: slideUpAnimation }]
          }}
        >
          {/* Stream Title Card */}
          <View className="bg-[#1C1C1E] rounded-2xl p-6 mb-8 relative">
            {/* Cancel Button - Top Right */}
            <TouchableOpacity 
              onPress={handleBack} 
              className="absolute top-4 right-4 z-10"
            >
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            
            {/* Card Header - Left Aligned */}
            <Text className="text-white text-xl font-semibold mb-6">
              Stream Title
            </Text>
            
            {/* Profile Picture and Input Row */}
            <View className="flex-row items-center space-x-3 gap-2">
              {/* Profile Picture */}
              <View className="w-12 h-12 rounded-full overflow-hidden bg-gray-600">
                {(() => {
                  const hasProfilePic = !!(currentUser?.profile_picture_url || currentUser?.profile_picture);
                  const hasApiUrl = !!apiBaseUrl;
                  const shouldShow = hasProfilePic && hasApiUrl;
                  
                  // console.log('Stream title render check:', {
                  //   hasProfilePic,
                  //   hasApiUrl,
                  //   shouldShow,
                  //   profileUrl: currentUser?.profile_picture_url,
                  //   profilePic: currentUser?.profile_picture,
                  //   apiBaseUrl
                  // });
                  
                  return shouldShow;
                })() ? (
                  (() => {
                    const profileUrl = currentUser?.profile_picture_url || currentUser?.profile_picture;
                    const baseUrl = apiBaseUrl?.replace('/api/', '') || '';
                    
                    // More robust URL validation and construction
                    let finalUrl = '';
                    
                    if (profileUrl && typeof profileUrl === 'string') {
                      if (profileUrl.startsWith('http')) {
                        finalUrl = profileUrl;
                      } else {
                        // Ensure proper path joining
                        const cleanPath = profileUrl.startsWith('/') ? profileUrl : `/${profileUrl}`;
                        finalUrl = baseUrl + cleanPath;
                      }
                    }
                    
                    // console.log('Stream title final URL construction:', {
                    //   profileUrl,
                    //   baseUrl,
                    //   finalUrl,
                    //   isValidUrl: !!(finalUrl && finalUrl !== baseUrl && finalUrl.includes('http'))
                    // });
                    
                    // Only render if we have a valid, complete HTTP URL
                    const isValidUrl = finalUrl && finalUrl !== baseUrl && finalUrl.includes('http');
                    
                    return isValidUrl ? (
                      <Image 
                        source={{ uri: finalUrl }}
                        className="w-full h-full"
                        resizeMode="cover"
                        onError={(e) => {
                          // console.log('Stream title profile picture error:', {
                          //   finalUrl,
                          //   apiBaseUrl,
                          //   baseServerUrl: apiBaseUrl?.replace('/api/', ''),
                          //   originalUrl: currentUser?.profile_picture_url || currentUser?.profile_picture,
                          //   error: e.nativeEvent.error
                          // });
                        }}
                        onLoad={() => {
                          // console.log('Stream title profile picture loaded successfully');
                        }}
                      />
                    ) : (
                      <View className="w-full h-full bg-gray-600 items-center justify-center">
                        <Text className="text-white text-lg font-semibold">
                          {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                      </View>
                    );
                  })()
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
                  className="text-white text-lg"
                  autoCorrect={false}
                  maxLength={100}
                  multiline={false}
                />
              </View>
            </View>
          </View>
        </Animated.View>
        
        {/* Spacer to push button to bottom */}
        <View className="flex-1" />
        
        {/* Proceed Button */}
        <View className="pb-8">
          <TouchableOpacity
            onPress={handleProceed}
            disabled={!title.trim()}
            className={`w-full py-4 rounded-full items-center ${
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
