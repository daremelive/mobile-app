import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Image, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import SearchInput from '../components/SearchInput';
import { 
  useSearchBlockedUsersQuery,
  useGetAllBlockedUsersQuery,
  useGetBlockedUsersCountQuery,
  useUnblockUserMutation,
} from '../src/api/blockedApi';
import ipDetector from '../src/utils/ipDetector';

const BlockedListScreen = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [baseURL, setBaseURL] = useState<string>('');

  // Initialize base URL with IP detection
  useEffect(() => {
    const initializeBaseURL = async () => {
      try {
        const detection = await ipDetector.detectIP();
        const url = `http://${detection.ip}:8000`;
        setBaseURL(url);
        console.log('🔗 Blocked List Base URL initialized:', url);
      } catch (error) {
        console.error('❌ Failed to detect IP in blocked list:', error);
        setBaseURL('https://daremelive.pythonanywhere.com'); // Production fallback
      }
    };
    
    initializeBaseURL();
  }, []);

  // RTK Query hooks - conditional based on search
  const { data: allBlockedUsers, isLoading: allLoading, refetch: refetchAll, error: allError } = useGetAllBlockedUsersQuery(undefined, {
    skip: !!searchQuery
  });
  const { data: searchResults, isLoading: searchLoading, refetch: refetchSearch, error: searchError } = useSearchBlockedUsersQuery(searchQuery || '', {
    skip: !searchQuery
  });
  
  // Use search results when searching, otherwise use all results
  const blockedUsers = searchQuery ? searchResults : allBlockedUsers;
  const blockedUsersLoading = searchQuery ? searchLoading : allLoading;
  const refetch = searchQuery ? refetchSearch : refetchAll;
  const error = searchQuery ? searchError : allError;
  const { data: countData } = useGetBlockedUsersCountQuery();
  const [unblockUser] = useUnblockUserMutation();

  // Add logging to debug
  useEffect(() => {
    console.log('🔍 BlockedList Debug:', {
      blockedUsers: blockedUsers?.length || 0,
      isLoading: blockedUsersLoading,
      error: error,
      countData: countData
    });
  }, [blockedUsers, blockedUsersLoading, error, countData]);

  const handleUnblock = async (userId: number, username: string) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${username}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: async () => {
            try {
              await unblockUser({ user_id: userId }).unwrap();
              refetch(); // Refresh the list
            } catch (error) {
              console.error('Failed to unblock user:', error);
              Alert.alert('Error', 'Failed to unblock user. Please try again.');
            }
          },
        },
      ]
    );
  };

  const blockedCount = countData?.count || 0;

  // Helper function to get profile image URL
  const getProfileImageUrl = (user: any) => {
    if (user.profile_picture_url) {
      // If URL starts with http, it's already absolute, otherwise prepend baseURL
      return user.profile_picture_url.startsWith('http') 
        ? user.profile_picture_url 
        : `${baseURL}${user.profile_picture_url}`;
    }
    // Fallback to UI Avatars for initials
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username)}&background=C42720&color=fff&size=100`;
  };

  if (blockedUsersLoading && !blockedUsers) {
    return (
      <SafeAreaView className="flex-1 bg-black justify-center items-center">
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#A40000" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      <View className="flex-row items-center relative px-4 pt-3 pb-3">
        <TouchableOpacity onPress={() => router.back()} className="absolute left-4 z-10 bg-[#1E1E1E] w-14 h-14 rounded-full justify-center items-center">
          <ArrowLeftIcon width={24} height={24} />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-white text-xl font-semibold">Blocked List ({blockedCount})</Text>
        </View>
      </View>

      <View className="px-4 mt-6">
        <SearchInput
          placeholder="Search blocked users..."
          showSuggestions={false}
          onSearchChange={setSearchQuery}
          enableRealtimeSearch={false}
        />
      </View>

      <ScrollView className="flex-1 px-4 mt-6">
        {blockedUsers && blockedUsers.length > 0 ? (
          blockedUsers?.map((blockedUser: any) => (
            <View key={blockedUser.id} className="flex-row justify-between items-center mb-6">
              <View className="flex-row items-center">
                <Image 
                  source={{ 
                    uri: getProfileImageUrl(blockedUser.blocked_user)
                  }} 
                  className="w-14 h-14 rounded-full mr-4 border-2 border-white" 
                  onError={(error) => {
                    console.log('❌ Profile image load error for blocked user:', {
                      userId: blockedUser.blocked_user.id,
                      username: blockedUser.blocked_user.username,
                      error: error.nativeEvent
                    });
                  }}
                />
                <View>
                  <Text className="text-white font-semibold text-base">
                    {blockedUser.blocked_user.full_name || blockedUser.blocked_user.username}
                  </Text>
                  <Text className="text-gray-400">
                    {blockedUser.blocked_user.followers_count} followers
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                className="bg-[#C42720] px-6 py-2 rounded-full"
                onPress={() => handleUnblock(blockedUser.blocked_user.id, blockedUser.blocked_user.username)}
              >
                <Text className="text-white font-semibold">Unblock</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-gray-400 text-center">
              {searchQuery ? 'No blocked users found matching your search.' : 'You haven\'t blocked anyone yet.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default BlockedListScreen; 