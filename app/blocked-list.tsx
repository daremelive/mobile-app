import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Image, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import SearchIcon from '../assets/icons/search-icon.svg';
import { 
  useGetBlockedUsersQuery,
  useGetBlockedUsersCountQuery,
  useUnblockUserMutation,
} from '../src/api/blockedApi';

const BlockedListScreen = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // RTK Query hooks
  const { data: blockedUsers, isLoading: blockedUsersLoading, refetch } = useGetBlockedUsersQuery(debouncedSearch || undefined);
  const { data: countData } = useGetBlockedUsersCountQuery();
  const [unblockUser] = useUnblockUserMutation();

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
        <View className="flex-row items-center bg-[#1C1C1E] rounded-full p-3 border border-[#333333]">
          <SearchIcon width={20} height={20} className="mr-2" />
          <TextInput
            placeholder="Search"
            placeholderTextColor="#8A8A8E"
            className="text-white flex-1"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView className="flex-1 px-4 mt-6">
        {blockedUsers && blockedUsers.length > 0 ? (
          blockedUsers.map(blockedUser => (
            <View key={blockedUser.id} className="flex-row justify-between items-center mb-6">
              <View className="flex-row items-center">
                <Image 
                  source={{ 
                    uri: `https://randomuser.me/api/portraits/men/${30 + (blockedUser.blocked_user.id % 10)}.jpg` 
                  }} 
                  className="w-14 h-14 rounded-full mr-4 border-2 border-white" 
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