import { SafeAreaView } from 'react-native-safe-area-context';
import { getErrorMessage } from '../src/utils/errorMessage';
import React, { useState} from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image, ActivityIndicator, Alert } from 'react-native';
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
import { buildProfilePictureURL, buildAvatarFallbackURL } from '../src/config/env';

const BlockedListScreen = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

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
              Alert.alert('Error', getErrorMessage(error));
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
                    uri: blockedUser.blocked_user.profile_picture 
                      ? buildProfilePictureURL(blockedUser.blocked_user.profile_picture) 
                      : buildAvatarFallbackURL(blockedUser.blocked_user.full_name || blockedUser.blocked_user.username)
                  }} 
                  className="w-14 h-14 rounded-full mr-4 border-2 border-white" 
                  onError={() => {
                    // Silent failure for avatar images
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