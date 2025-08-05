import React from 'react';
import { View, Text, SafeAreaView, TextInput, ScrollView, TouchableOpacity, Image, RefreshControl, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import { SearchIcon } from '../../../components/icons/SearchIcon';
import { CheckDoubleIcon } from '../../../components/icons/CheckDoubleIcon';
import { ArrowLeftIcon } from '../../../components/icons/ArrowLeftIcon';
import { useConversations, useUsers } from '../../../src/hooks/useMessages';
import { selectCurrentUser } from '../../../src/store/authSlice';
import { setUser } from '../../../src/store/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MessagesScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  
  const [searchQuery, setSearchQuery] = React.useState('');
  
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

  // Get recent active users from conversations
  const getRecentActiveUsers = React.useMemo(() => {
    if (!currentUser || !conversations.length) return [];
    
    // Get unique participants from recent conversations (limit to 10 most recent)
    const recentUsers = conversations
      .slice(0, 10) // Take first 10 most recent conversations
      .map(conversation => {
        // Get the other participant (not current user)
        const otherUser = conversation.participant_1?.id === currentUser.id 
          ? conversation.participant_2 
          : conversation.participant_1;
        
        return {
          id: otherUser?.id || 0,
          name: otherUser?.first_name && otherUser?.last_name 
            ? `${otherUser.first_name} ${otherUser.last_name}`.trim()
            : otherUser?.username || 'Unknown User',
          avatar: otherUser?.profile_picture_url || 
                  otherUser?.profile_picture || 
                  'https://randomuser.me/api/portraits/men/32.jpg',
          isLive: otherUser?.is_online || false,
          conversation_id: conversation.id
        };
      })
      .filter((user, index, self) => 
        // Remove duplicates based on user ID
        user.id && index === self.findIndex(u => u.id === user.id)
      );
    
    return recentUsers;
  }, [conversations, currentUser]);

  // Debug logging
  React.useEffect(() => {
    console.log('Current user in messages screen:', currentUser);
  }, [currentUser]);

  // Set a test token and user for debugging (remove this in production)
  React.useEffect(() => {
    const setTestData = async () => {
      // Using the token we generated earlier for user 'ted'
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzU0MTc3NTIwLCJpYXQiOjE3NTQwOTExMjAsImp0aSI6Ijc1NmQxMDgyNGNlZTRiODhhMjRjMzg4NjNkYWM2YjI4IiwidXNlcl9pZCI6Mzl9.OsoyP6MEydnlbqkZhQE8UeCK_-Hlq_TknT4tNzzRjKY';
      await AsyncStorage.setItem('access_token', testToken);
      
      // Set a mock user in Redux store if none exists
      if (!currentUser) {
        const mockUser = {
          id: 39,
          email: 'ted@test.com',
          username: 'ted',
          first_name: 'Ted',
          last_name: 'Test',
          full_name: 'Ted Test',
          short_name: 'Ted',
          phone_number: null,
          gender: 'male' as const,
          country: null,
          interests: null,
          language: 'en',
          profile_completed: true,
          is_email_verified: true,
          is_phone_verified: false,
          is_content_creator: false,
          has_accepted_terms: true,
          vip_level: 'basic' as const,
          profile_picture: 'https://randomuser.me/api/portraits/men/30.jpg',
          profile_picture_url: 'https://randomuser.me/api/portraits/men/30.jpg',
          followers_count: 0,
          following_count: 0,
          total_likes_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        dispatch(setUser(mockUser));
        console.log('Mock user set for debugging');
      }
      
      console.log('Test token set for debugging');
    };
    setTestData();
  }, [currentUser, dispatch]);

  // Handle search with debouncing - search both conversations and users
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        // Search both conversations and users when there's a query
        searchConversations(searchQuery);
        searchUsers(searchQuery);
      } else {
        // When no query, just show conversations
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
    if (!currentUser || !currentUser.id) return conversation.participant_2; // Fallback
    
    // Return the participant that is not the current user
    if (conversation.participant_1?.id === currentUser.id) {
      return conversation.participant_2;
    } else {
      return conversation.participant_1;
    }
  };

  // Handle clicking on a recent user avatar to navigate to conversation
  const handleStoryUserPress = async (recentUser: any) => {
    try {
      if (recentUser.conversation_id) {
        // If we have a conversation ID, navigate directly to the conversation
        router.push(`/(tabs)/messages/${recentUser.conversation_id}`);
      } else if (recentUser.id) {
        // If we only have user ID, create or get conversation
        const conversation = await createConversation(recentUser.id);
        if (conversation?.id) {
          router.push(`/(tabs)/messages/${conversation.id}`);
        } else {
          Alert.alert('Error', 'Failed to open conversation');
        }
      } else {
        Alert.alert('Error', 'Unable to open conversation');
      }
    } catch (error) {
      console.error('Error opening conversation:', error);
      Alert.alert('Error', 'Failed to open conversation. Please try again.');
    }
  };

  // Handle clicking on a user to start a conversation
  const handleUserPress = async (userId: number) => {
    try {
      // Skip the createConversation call and navigate directly to new message screen
      router.push(`/(tabs)/messages/new?recipientId=${userId}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
      console.error('Error starting conversation:', error);
    }
  };

  // Transform conversations to match the original UI data structure
  const displayConversations = currentUser ? conversations.map(conversation => {
    const otherUser = getOtherParticipant(conversation);
    return {
      id: conversation.id,
      name: otherUser?.first_name && otherUser?.last_name 
        ? `${otherUser.first_name} ${otherUser.last_name}`
        : otherUser?.username || 'Unknown User',
      message: conversation.last_message || 'No messages yet',
      time: conversation.last_message_time ? formatTime(conversation.last_message_time) : '',
      unread: conversation.unread_count || 0,
      avatar: otherUser?.profile_picture || 'https://randomuser.me/api/portraits/men/32.jpg',
      isLive: false // You can implement this based on user status
    };
  }) : [];

  const filteredMessages = displayConversations.filter(message => 
    message.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      
      {/* Header */}
      <View className="flex-row items-center relative px-4 pt-3 pb-3 mb-6">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="absolute left-4 z-10"
        >
          <View className="w-14 h-14 bg-[#1A1A1A] rounded-full justify-center items-center">
            <ArrowLeftIcon size={24} color="white" />
          </View>
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-white text-[20px] font-semibold">Messages</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View className="px-4 mb-2">
        <View className="flex-row items-center border border-[#757688] rounded-full px-3 h-11">
          <SearchIcon size={20} color="#ffffff" />
          <TextInput
            placeholder="Search"
            placeholderTextColor="#666666"
            className="flex-1 text-white ml-2 text-base"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Main Content */}
      <View className="flex-1">
        {/* Recent Active Users */}
        <View className="mb-2 mt-4">
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            className="pl-4 pb-2"
          >
            {getRecentActiveUsers.map((user, index) => (
              <TouchableOpacity 
                key={user.id || index} 
                className="mr-4"
                onPress={() => handleStoryUserPress(user)}
              >
                <LinearGradient
                  colors={['#FF4D67', '#FF8C5B']}
                  style={{ width: 64, height: 64, borderRadius: 32, padding: 2 }}
                >
                  <View className="bg-[#090909] rounded-full p-0.5 w-full h-full overflow-hidden">
                    <Image
                      source={{ uri: user.avatar }}
                      className="w-full h-full rounded-full"
                    />
                  </View>
                </LinearGradient>
                {user.isLive && (
                  <View className="absolute -bottom-1 self-center bg-[#C42720] px-2 py-0.5 rounded-md">
                    <Text className="text-white text-[10px] font-medium">Live</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
            
            {/* Show loading state when no recent users and still loading */}
            {getRecentActiveUsers.length === 0 && loading && (
              <View className="flex-row">
                {[1, 2, 3, 4, 5].map((_, index) => (
                  <View key={index} className="mr-4">
                    <View className="w-16 h-16 bg-[#1A1A1A] rounded-full animate-pulse" />
                  </View>
                ))}
              </View>
            )}
            
            {/* Show message when no recent conversations */}
            {getRecentActiveUsers.length === 0 && !loading && (
              <View className="px-4">
                <Text className="text-[#666666] text-sm">Start a conversation to see recent contacts</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Messages List */}
        <ScrollView 
          className="flex-1 mt-2"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshConversations}
              tintColor="#C42720"
            />
          }
        >
          {/* Show any errors */}
          {error && (
            <View className="p-4 bg-red-500/20 border border-red-500 rounded-lg mx-4 mb-4">
              <Text className="text-red-400 text-sm">Error: {error}</Text>
            </View>
          )}
          
          {loading && conversations.length === 0 ? (
            <View className="flex-1 justify-center items-center py-20">
              <Text className="text-[#666666] text-base">Loading conversations...</Text>
            </View>
          ) : (
            <>
              {/* Show existing conversations */}
              {filteredMessages.map((message, index) => (
                <TouchableOpacity 
                  key={`conversation-${message.id}`}
                  className="flex-row p-4 border-b border-[#1A1A1A]"
                  onPress={() => router.push(`/messages/${message.id}`)}
                >
                  <View className="relative">
                    <Image
                      source={{ uri: message.avatar }}
                      className="w-12 h-12 rounded-full"
                    />
                    {message.isLive && (
                      <View className="absolute -bottom-1 self-center bg-[#FF4D67] px-2 py-0.5 rounded-md">
                        <Text className="text-white text-[10px] font-medium">Live</Text>
                      </View>
                    )}
                  </View>
                  
                  <View className="flex-1 ml-3">
                    <View className="flex-row justify-between items-center">
                      <Text className="text-white text-[16px] font-semibold">{message.name}</Text>
                      <Text className="text-[#666666] text-xs">{message.time}</Text>
                    </View>
                    
                    <View className="flex-row items-center mt-1">
                      <CheckDoubleIcon size={16} color="#666666" />
                      <Text className="flex-1 text-[#666666] text-[14px] ml-1" numberOfLines={1}>
                        {message.message}
                      </Text>
                      {message.unread > 0 && (
                        <View className="bg-[#C42720] w-5 h-5 rounded-full justify-center items-center ml-2">
                          <Text className="text-white text-xs">{message.unread}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Show users when searching */}
              {searchQuery.trim() && (
                <>
                  <View className="px-4 py-2 bg-[#1A1A1A] mt-2">
                    <Text className="text-[#666666] text-sm uppercase tracking-wider">
                      Users ({users.length} found)
                    </Text>
                  </View>
                  {users.length === 0 ? (
                    <View className="p-4">
                      <Text className="text-[#666666] text-sm">No users found for "{searchQuery}"</Text>
                    </View>
                  ) : (
                    users.map((user) => (
                      <TouchableOpacity 
                        key={`user-${user.id}`}
                        className="flex-row p-4 border-b border-[#1A1A1A]"
                        onPress={() => handleUserPress(user.id)}
                      >
                        <View className="relative">
                          <Image
                            source={{ 
                              uri: user.profile_picture_url || user.profile_picture || 'https://randomuser.me/api/portraits/men/32.jpg' 
                            }}
                            className="w-12 h-12 rounded-full"
                          />
                          {user.is_online && (
                            <View className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#00FF00] rounded-full border-2 border-[#090909]" />
                          )}
                        </View>
                        
                        <View className="flex-1 ml-3">
                          <View className="flex-row justify-between items-center">
                            <Text className="text-white text-[16px] font-semibold">
                              {user.first_name && user.last_name 
                                ? `${user.first_name} ${user.last_name}`
                                : user.username || 'Unknown User'}
                            </Text>
                          </View>
                          
                          <View className="flex-row items-center mt-1">
                            <Text className="flex-1 text-[#666666] text-[14px]" numberOfLines={1}>
                              @{user.username} • Tap to message
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
} 