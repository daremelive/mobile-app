import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, SafeAreaView, TextInput, ScrollView, TouchableOpacity, Image, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { SvgXml } from 'react-native-svg';
import ArrowLeftIcon from '../../../assets/icons/arrow-left.svg';
import SearchIcon from '../../../assets/icons/search-icon.svg';
import { useGetFollowingQuery } from '../../../src/store/followApi';
import { useConversations, useUsers } from '../../../src/hooks/useMessages';
import { selectCurrentUser } from '../../../src/store/authSlice';
import { setUser } from '../../../src/store/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fonts } from '../../../constants/Fonts';
import ipDetector from '../../../src/utils/ipDetector';

// Chat icon SVG
const chatIcon = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M15.75 7.875C15.75 11.3617 12.7367 14.25 9 14.25C8.25 14.25 7.5 14.1 6.75 13.8L2.25 15.75L4.2 11.25C3.9 10.5 3.75 9.75 3.75 9C3.75 5.51328 6.76328 2.625 10.5 2.625" stroke="#EDEEF9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
</svg>`;

export default function MessagesScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Helper function to get server base URL for images
  const getServerBaseUrl = useCallback(async () => {
    const detection = await ipDetector.detectIP();
    return `http://${detection.ip}:8000`;
  }, []);

  // Helper function to build avatar URL
  const buildAvatarUrl = useCallback(async (user: any) => {
    if (!user) return `https://ui-avatars.com/api/?name=U&background=C42720&color=fff&size=100`;
    
    if (user.profile_picture_url) {
      if (user.profile_picture_url.startsWith('http')) {
        return user.profile_picture_url;
      } else {
        const serverBaseUrl = await getServerBaseUrl();
        return `${serverBaseUrl}${user.profile_picture_url}`;
      }
    }
    
    const name = encodeURIComponent(user.first_name || user.username || 'U');
    return `https://ui-avatars.com/api/?name=${name}&background=C42720&color=fff&size=100`;
  }, [getServerBaseUrl]);

  // State for dynamic avatar URLs
  const [avatarUrls, setAvatarUrls] = useState<{[key: string]: string}>({});
  
  // Update avatar URLs when data changes
  useEffect(() => {
    const updateAvatarUrls = async () => {
      const urls: {[key: string]: string} = {};
      
      // Update URLs for following users
      if (followingUsers) {
        for (const user of followingUsers) {
          urls[`following_${user.id}`] = await buildAvatarUrl(user);
        }
      }
      
      // Update URLs for conversation participants
      if (conversations) {
        for (const conversation of conversations) {
          const otherUser = conversation.participants?.find((p: any) => p.id !== currentUser?.id);
          if (otherUser) {
            urls[`conversation_${otherUser.id}`] = await buildAvatarUrl(otherUser);
          }
        }
      }
      
      // Update URLs for search results
      if (users) {
        for (const user of users) {
          urls[`user_${user.id}`] = await buildAvatarUrl(user);
        }
      }
      
      setAvatarUrls(urls);
    };
    
    updateAvatarUrls();
  }, [followingUsers, conversations, users, buildAvatarUrl, currentUser]);
  
  // Get following users for the top section
  const { data: followingUsers = [], isLoading: followingLoading } = useGetFollowingQuery({ search: '' });
  
  // Use hooks for conversations and users
  const { 
    conversations, 
    loading, 
    error, 
    refreshing, 
    refreshConversations, 
    searchConversations 
  } = useConversations();
  
  const { 
    users, 
    loading: usersLoading, 
    searchUsers,
    createConversation 
  } = useUsers();

  // Set a test token and user for debugging (remove this in production)
  useEffect(() => {
    const setTestData = async () => {
      // Using the token we generated earlier for user 'ted'
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzU0MTc3NTIwLCJpYXQiOjE3NTQwOTExMjAsImp0aSI6Ijc1NmQxMDgyNGNlZTRiODhhMjRjMzg4NjNkYWM2YjI4IiwidXNlcl9pZCI6Mzl9.OsoyP6MEydnlbqkZhQE8UeCK_-Hlq_TknT4tNzzRjKY';
      await AsyncStorage.setItem('access_token', testToken);
      
      // Set a mock user in Redux store if none exists
      if (!currentUser) {
        const mockUser = {
          id: 2,
          email: 'mailmrted@gmail.com',
          username: 'mailmrted',
          first_name: 'Thaddeaus',
          last_name: 'Orkaa',
          full_name: 'Thaddeaus Orkaa',
          short_name: 'Thaddeaus',
          phone_number: '+2348140631692',
          gender: 'male' as const,
          country: 'NG',
          interests: 'Art & Creativity, Sports, Fashion & Beauty, Movie, Gaming',
          language: 'English',
          profile_completed: true,
          is_email_verified: true,
          is_phone_verified: false,
          is_content_creator: false,
          has_accepted_terms: true,
          vip_level: 'basic' as const,
          profile_picture: '/media/profile_pictures/profile_mPoiBIN.jpg',
          profile_picture_url: '/media/profile_pictures/profile_mPoiBIN.jpg',
          followers_count: 0,
          following_count: 1,
          total_likes_count: 0,
          created_at: '2025-08-04T16:29:18.172707Z',
          updated_at: '2025-08-05T17:59:21.792584Z'
        };
        dispatch(setUser(mockUser));
      }
    };
    setTestData();
  }, [currentUser, dispatch]);

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchConversations(searchQuery);
        searchUsers(searchQuery);
      } else {
        searchConversations('');
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchConversations, searchUsers]);

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (messageDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getOtherParticipant = (conversation: any) => {
    if (!currentUser || !currentUser.id) return conversation.participant_2;
    
    if (conversation.participant_1?.id === currentUser.id) {
      return conversation.participant_2;
    } else {
      return conversation.participant_1;
    }
  };

  // Handle clicking on a following user to navigate to their profile or start conversation
  const handleFollowingUserPress = (user: any) => {
    if (user.is_live) {
      // If user is live, could navigate to their stream or profile
      router.push({
        pathname: '/user-profile',
        params: { userId: user.id.toString() }
      });
    } else {
      // Navigate to user profile
      router.push({
        pathname: '/user-profile',
        params: { userId: user.id.toString() }
      });
    }
  };

  // Handle clicking on a user to start a conversation
  const handleUserPress = async (userId: number) => {
    try {
      router.push(`/(tabs)/messages/new-${userId}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
      console.error('Error starting conversation:', error);
    }
  };

  // Handle clicking on existing conversation
  const handleConversationPress = (conversationId: number) => {
    router.push(`/(tabs)/messages/${conversationId}`);
  };

  // Transform conversations to match the UI data structure
  const displayConversations = useMemo(() => {
    if (!currentUser) return [];
    
    return conversations.map(conversation => {
      const otherUser = getOtherParticipant(conversation);
      return {
        id: conversation.id,
        name: otherUser?.first_name && otherUser?.last_name 
          ? `${otherUser.first_name} ${otherUser.last_name}`
          : otherUser?.username || 'Unknown User',
        message: conversation.last_message || 'No messages yet',
        time: conversation.last_message_time ? formatTime(conversation.last_message_time) : '',
        unread: conversation.unread_count || 0,
        avatar: avatarUrls[`conversation_${otherUser?.id}`] || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.first_name || otherUser?.username || 'U')}&background=C42720&color=fff&size=100`,
        isOnline: otherUser?.is_online || false
      };
    });
  }, [conversations, currentUser]);

  const filteredConversations = displayConversations.filter(conversation => 
    conversation.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      
      {/* Header */}
      <View className="flex-row items-center px-4 pt-3 pb-3">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="absolute left-4 z-10 bg-[#1E1E1E] w-14 h-14 rounded-full justify-center items-center"
        >
          <ArrowLeftIcon width={24} height={24} />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-xl">Messages</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View className="px-4 mb-6 mt-6">
        <View className="flex-row items-center rounded-full p-3 border border-[#333333]">
          <SearchIcon width={20} height={20} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search"
            placeholderTextColor="#8A8A8E"
            className="flex-1 text-white text-base ml-3"
          />
        </View>
      </View>

      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshConversations}
            tintColor="#C42720"
          />
        }
      >
        {/* Following Section - Exact replica from home screen */}
        <View className="mb-8 px-4">
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={{ paddingRight: 16 }}
            className="gap-4"
          >
            {followingLoading ? (
              // Loading state
              Array.from({ length: 5 }).map((_, index) => (
                <View key={index} className="relative mr-4">
                  <View className="w-16 h-16 rounded-full bg-gray-600 border-2 border-[#C42720]" />
                </View>
              ))
            ) : followingUsers.length === 0 ? (
              // Empty state
              <View className="flex-1 items-center justify-center py-4">
                <Text className="text-gray-400 text-sm">
                  Follow some users to see them here!
                </Text>
              </View>
            ) : (
              // Following users data
              followingUsers.slice(0, 10).map((user) => (
                <TouchableOpacity 
                  key={user.id} 
                  className="relative mr-4"
                  onPress={() => handleFollowingUserPress(user)}
                >
                  <Image
                    source={{ 
                      uri: avatarUrls[`following_${user.id}`] || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username)}&background=C42720&color=fff&size=100`
                    }}
                    className="w-16 h-16 rounded-full border-2 border-[#C42720]"
                  />
                  {user.is_live && (
                    <View className="absolute bottom-[-4px] self-center bg-[#C42720] px-2 py-0.5 rounded-lg">
                      <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-[10px]">
                        Live
                      </Text>
                    </View>
                  )}
                  {user.is_online && !user.is_live && (
                    <View className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-black" />
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

        {/* Conversations Section */}
        <View className="flex-1">
          {/* Show any errors */}
          {error && (
            <View className="p-4 bg-red-500/20 border border-red-500 rounded-lg mx-4 mb-4">
              <Text className="text-red-400 text-sm">Error: {error}</Text>
            </View>
          )}
          
          {loading && conversations.length === 0 ? (
            <View className="flex-1 justify-center items-center py-20">
              <ActivityIndicator size="large" color="#C42720" />
              <Text className="text-gray-400 text-base mt-4">Loading conversations...</Text>
            </View>
          ) : (
            <>
              {/* Existing Conversations */}
              {filteredConversations.length === 0 && !searchQuery ? (
                <View className="flex-1 items-center justify-center py-20 px-4">
                  <SvgXml xml={chatIcon} width={48} height={48} />
                  <Text className="text-white text-lg font-semibold mt-4 text-center">
                    No conversations yet
                  </Text>
                  <Text className="text-gray-400 text-center mt-2">
                    Start a conversation with someone from your following list above
                  </Text>
                </View>
              ) : (
                filteredConversations.map((conversation) => (
                  <TouchableOpacity 
                    key={`conversation-${conversation.id}`}
                    className="flex-row items-center px-4 py-4 border-b border-[#1A1A1A]"
                    onPress={() => handleConversationPress(conversation.id)}
                  >
                    <View className="relative mr-4">
                      <Image
                        source={{ uri: conversation.avatar }}
                        className="w-14 h-14 rounded-full"
                      />
                      {conversation.isOnline && (
                        <View className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-black" />
                      )}
                    </View>
                    
                    <View className="flex-1">
                      <View className="flex-row justify-between items-center mb-1">
                        <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-base">
                          {conversation.name}
                        </Text>
                        <Text style={{ fontFamily: fonts.regular }} className="text-gray-400 text-xs">
                          {conversation.time}
                        </Text>
                      </View>
                      
                      <View className="flex-row items-center justify-between">
                        <Text 
                          style={{ fontFamily: fonts.regular }} 
                          className="flex-1 text-gray-400 text-sm mr-2" 
                          numberOfLines={1}
                        >
                          {conversation.message}
                        </Text>
                        {conversation.unread > 0 && (
                          <View className="bg-[#C42720] min-w-[20px] h-5 rounded-full justify-center items-center px-1">
                            <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-xs">
                              {conversation.unread > 99 ? '99+' : conversation.unread}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}

              {/* Show users when searching */}
              {searchQuery.trim() && (
                <>
                  <View className="px-4 py-3 bg-[#1A1A1A] mt-4">
                    <Text style={{ fontFamily: fonts.semiBold }} className="text-gray-400 text-sm uppercase tracking-wider">
                      People ({users.length})
                    </Text>
                  </View>
                  {usersLoading ? (
                    <View className="flex-row items-center justify-center py-4">
                      <ActivityIndicator size="small" color="#C42720" />
                      <Text className="text-gray-400 text-sm ml-2">Searching...</Text>
                    </View>
                  ) : users.length === 0 ? (
                    <View className="p-4">
                      <Text className="text-gray-400 text-sm">No users found for "{searchQuery}"</Text>
                    </View>
                  ) : (
                    users.map((user) => (
                      <TouchableOpacity 
                        key={`user-${user.id}`}
                        className="flex-row items-center px-4 py-4 border-b border-[#1A1A1A]"
                        onPress={() => handleUserPress(user.id)}
                      >
                        <View className="relative mr-4">
                          <Image
                            source={{ 
                              uri: avatarUrls[`user_${user.id}`] || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.first_name || user.username || 'U')}&background=C42720&color=fff&size=100`
                            }}
                            className="w-14 h-14 rounded-full"
                          />
                          {user.is_online && (
                            <View className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-black" />
                          )}
                        </View>
                        
                        <View className="flex-1">
                          <View className="flex-row justify-between items-center mb-1">
                            <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-base">
                              {user.first_name && user.last_name 
                                ? `${user.first_name} ${user.last_name}`
                                : user.username || 'Unknown User'}
                            </Text>
                          </View>
                          
                          <View className="flex-row items-center">
                            <Text style={{ fontFamily: fonts.regular }} className="text-gray-400 text-sm">
                              @{user.username} • Tap to message
                            </Text>
                          </View>
                        </View>
                        
                        <SvgXml xml={chatIcon} width={20} height={20} />
                      </TouchableOpacity>
                    ))
                  )}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 