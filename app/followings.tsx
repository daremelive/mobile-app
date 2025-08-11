import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import SearchIcon from '../assets/icons/search-icon.svg';
import CheckIcon from '../assets/icons/check.svg';
import { useGetFollowingQuery, useFollowUserMutation, useUnfollowUserMutation } from '../src/store/followApi';
import ipDetector from '../src/utils/ipDetector';

// Sent icon SVG
const sentIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M14.0318 2.03561C12.5798 0.4719 1.65764 4.30246 1.66666 5.70099C1.67689 7.28692 5.93205 7.77479 7.11146 8.10572C7.82072 8.30466 8.01066 8.50866 8.17419 9.25239C8.91486 12.6207 9.28672 14.296 10.1343 14.3334C11.4852 14.3931 15.4489 3.56166 14.0318 2.03561Z" stroke="#EDEEF9" stroke-width="1.5"/>
<path d="M7.66666 8.33333L9.99999 6" stroke="#EDEEF9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export default function FollowingsScreen() {
  const [search, setSearch] = useState('');
  const [baseURL, setBaseURL] = useState<string>('');
  
  // Initialize base URL with IP detection
  useEffect(() => {
    const initializeBaseURL = async () => {
      try {
        const detection = await ipDetector.detectIP();
        let url;
        // Check if it's production domain or local IP
        if (detection.ip === 'daremelive.pythonanywhere.com') {
          url = `https://${detection.ip}`;
        } else {
          url = `http://${detection.ip}:8000`;
        }
        setBaseURL(url);
        console.log('🔗 Followings Base URL initialized:', url);
      } catch (error) {
        console.error('❌ Failed to detect IP in followings:', error);
        setBaseURL('https://daremelive.pythonanywhere.com'); // Production fallback
      }
    };
    
    initializeBaseURL();
  }, []);
  
  // RTK Query hooks with aggressive refresh to ensure data is current
  const { data: followingUsers = [], isLoading, error, refetch } = useGetFollowingQuery(
    { search }, 
    {
      // Force refresh every time component mounts or when args change
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
      refetchOnReconnect: true
    }
  );
  const [followUser, { isLoading: isFollowing }] = useFollowUserMutation();
  const [unfollowUser, { isLoading: isUnfollowing }] = useUnfollowUserMutation();

  // Add refresh function to handle data refresh
  const handleRefresh = () => {
    refetch();
  };

  // Add useFocusEffect to refresh when screen comes into focus
  const useFocusEffect = require('@react-navigation/native').useFocusEffect;
  
  useFocusEffect(
    React.useCallback(() => {
      // console.log('📱 Followings screen focused - refreshing data');
      refetch();
    }, [refetch])
  );

  const toggleFollow = async (userId: number, isCurrentlyFollowing: boolean) => {
    try {
      if (isCurrentlyFollowing) {
        await unfollowUser({ user_id: userId }).unwrap();
      } else {
        await followUser({ user_id: userId }).unwrap();
      }
      // Refetch the data to update the UI
      refetch();
    } catch (error: any) {
      console.error('Follow/Unfollow error:', error);
      Alert.alert('Error', error.data?.message || 'Failed to update follow status');
    }
  };

  const navigateToProfile = (userId: number) => {
    router.push({
      pathname: '/user-profile',
      params: { userId: userId.toString() }
    });
  };

  const handleShareUser = (user: any) => {
    Alert.alert('Share Profile', `Share ${user.full_name || user.username}'s profile?`, [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Share', 
        onPress: () => {
          // TODO: Implement share functionality
          Alert.alert('Shared', 'Profile link copied to clipboard');
        }
      }
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-row items-center px-4 pt-3 pb-3">
          <TouchableOpacity onPress={() => router.back()} className="absolute left-4 z-10 bg-[#1E1E1E] w-14 h-14 rounded-full justify-center items-center">
            <ArrowLeftIcon width={24} height={24} />
          </TouchableOpacity>
          <View className="flex-1 items-center">
            <Text className="text-white text-xl font-semibold">Following</Text>
          </View>
        </View>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#C42720" />
          <Text className="text-white mt-4">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-row items-center px-4 pt-3 pb-3">
          <TouchableOpacity onPress={() => router.back()} className="absolute left-4 z-10 bg-[#1E1E1E] w-14 h-14 rounded-full justify-center items-center">
            <ArrowLeftIcon width={24} height={24} />
          </TouchableOpacity>
          <View className="flex-1 items-center">
            <Text className="text-white text-xl font-semibold">Following</Text>
          </View>
        </View>
        <View className="flex-1 justify-center items-center px-4">
          <Text className="text-white text-center">Failed to load users list</Text>
          <TouchableOpacity onPress={() => refetch()} className="mt-4 bg-[#C42720] px-6 py-2 rounded-full">
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-row items-center px-4 pt-3 pb-3">
        <TouchableOpacity onPress={() => router.back()} className="absolute left-4 z-10 bg-[#1E1E1E] w-14 h-14 rounded-full justify-center items-center">
          <ArrowLeftIcon width={24} height={24} />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-white text-xl font-semibold">All Users</Text>
        </View>
      </View>

      <View className="px-4 mt-6">
        <View className="flex-row items-center rounded-full p-3 border border-[#333333]">
          <SearchIcon width={20} height={20} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search"
            placeholderTextColor="#8A8A8E"
            className="flex-1 text-white text-base ml-3"
          />
        </View>
      </View>

      <ScrollView 
        className="px-4 mt-6"
        refreshControl={
          <RefreshControl 
            refreshing={isLoading} 
            onRefresh={handleRefresh}
            tintColor="#C42720"
            colors={['#C42720']}
          />
        }
      >
        {followingUsers.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-white text-lg mb-2">No users found</Text>
            <Text className="text-gray-400 text-center">
              {search ? 'Try adjusting your search terms' : 'No users available'}
            </Text>
          </View>
        ) : (
          followingUsers.map((user) => (
            <View key={user.id} className="flex-row items-center justify-between mb-6">
              <TouchableOpacity 
                className="flex-row items-center flex-1"
                onPress={() => navigateToProfile(user.id)}
              >
                <View className="relative mr-4">
                  {user.profile_picture_url ? (
                    <Image 
                      source={{ 
                        uri: user.profile_picture_url.startsWith('http') 
                          ? user.profile_picture_url 
                          : baseURL ? `${baseURL}${user.profile_picture_url}` : `https://daremelive.pythonanywhere.com${user.profile_picture_url}`
                      }} 
                      className={`w-14 h-14 rounded-full ${user.is_live ? 'border-2 border-[#C42720]' : 'border-2 border-transparent'}`}
                    />
                  ) : (
                    <View 
                      className={`w-14 h-14 rounded-full bg-gray-600 justify-center items-center ${user.is_live ? 'border-2 border-[#C42720]' : 'border-2 border-transparent'}`}
                    >
                      <Text className="text-white font-bold text-lg">
                        {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {user.is_live && (
                    <View className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#C42720] px-2 py-0.5 rounded-md">
                      <Text className="text-white text-[10px] font-semibold">Live</Text>
                    </View>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-white text-base font-semibold">
                    {user.full_name || user.username}
                  </Text>
                  <Text className="text-[#B0B0B0] text-sm">{user.followers_count} followers</Text>
                </View>
              </TouchableOpacity>
              
              <View className="flex-row items-center gap-2">

                {/* Follow Button */}
                <TouchableOpacity
                  onPress={() => toggleFollow(user.id, user.is_following)}
                  disabled={isFollowing || isUnfollowing}
                  className={`py-2 rounded-full flex-row items-center justify-center px-4 gap-2 ${user.is_following ? 'bg-[#2E1616]' : 'bg-[#C42720]'}`}
                  style={{ minWidth: 110, height: 36 }}
                >
                  {(isFollowing || isUnfollowing) ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : user.is_following ? (
                    <>
                      <CheckIcon width={12} height={12} stroke="#C42720" strokeWidth={2} className="mr-2"/>
                      <Text className="text-sm text-white font-semibold">Following</Text>
                    </>
                  ) : (
                    <>
                      <SvgXml xml={sentIcon} width={12} height={12} />
                      <Text className="text-sm text-white font-semibold">Follow</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
} 