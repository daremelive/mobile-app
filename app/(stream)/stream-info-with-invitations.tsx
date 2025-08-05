import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, TextInput, Image, Modal, Alert, ScrollView, Switch, FlatList } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../src/store/authSlice';
import { useCreateStreamMutation, useInviteUsersToStreamMutation } from '../../src/store/streamsApi';
import { useGetFollowingQuery, useDiscoverUsersQuery } from '../../src/store/followApi';
import { 
  StreamVideoClient, 
  CallContent, 
  StreamCall,
  StreamVideo
} from '@stream-io/video-react-native-sdk';
import { createStreamClient, createStreamUser } from '../../src/utils/streamClient';

interface Guest {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  profile_picture_url?: string;
  is_online?: boolean;
}

export default function StreamInfoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const currentUser = useSelector(selectCurrentUser);
  
  // Stream setup states
  const [title, setTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(1);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [notifyFollowers, setNotifyFollowers] = useState(true);
  const [invitedFriends, setInvitedFriends] = useState<Guest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // GetStream states
  const [streamClient, setStreamClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Invitation modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Guest[]>([]);
  const [streamId, setStreamId] = useState<string | null>(null);

  const [createStream] = useCreateStreamMutation();
  const [inviteUsersToStream] = useInviteUsersToStreamMutation();
  
  // Fetch users for invitation
  const { data: followingUsers = [] } = useGetFollowingQuery({ search: inviteSearchQuery });
  const { data: discoverUsers = [] } = useDiscoverUsersQuery({ search: inviteSearchQuery });

  const categories = [
    { id: 1, name: 'Just Chatting' },
    { id: 2, name: 'Gaming' },
    { id: 3, name: 'Music' },
    { id: 4, name: 'Art' },
    { id: 5, name: 'Sports' },
    { id: 6, name: 'Food' },
    { id: 7, name: 'Travel' },
    { id: 8, name: 'Education' },
  ];

  // Mock data for friends
  const mockFriends: Guest[] = [
    { id: 1, username: 'sarah_johnson', first_name: 'Sarah', last_name: 'Johnson', profile_picture_url: 'https://randomuser.me/api/portraits/women/1.jpg', is_online: true },
    { id: 2, username: 'mike_chen', first_name: 'Mike', last_name: 'Chen', profile_picture_url: 'https://randomuser.me/api/portraits/men/2.jpg', is_online: false },
    { id: 3, username: 'emma_davis', first_name: 'Emma', last_name: 'Davis', profile_picture_url: 'https://randomuser.me/api/portraits/women/3.jpg', is_online: true },
    { id: 4, username: 'alex_wilson', first_name: 'Alex', last_name: 'Wilson', profile_picture_url: 'https://randomuser.me/api/portraits/men/4.jpg', is_online: true },
  ];

  // Filter friends based on search
  const filteredFriends = mockFriends.filter(friend =>
    friend.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${friend.first_name} ${friend.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Combine and filter users for invitation
  const allInviteUsers = [...followingUsers, ...discoverUsers, ...mockFriends]
    .filter((user, index, self) => 
      index === self.findIndex(u => u.id === user.id) // Remove duplicates
    )
    .filter(user => 
      user.username?.toLowerCase().includes(inviteSearchQuery.toLowerCase()) ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(inviteSearchQuery.toLowerCase())
    );

  // Initialize GetStream client and call
  useEffect(() => {
    const initializeStream = async () => {
      if (!currentUser) return;

      try {
        setIsConnecting(true);
        const client = await createStreamClient(currentUser);
        setStreamClient(client);

        // Create a call
        const callId = `stream_${currentUser.id}_${Date.now()}`;
        const newCall = client.call('livestream', callId);
        
        await newCall.join({ create: true });
        setCall(newCall);
      } catch (error) {
        console.error('Failed to initialize GetStream:', error);
        Alert.alert('Error', 'Failed to initialize camera. Please try again.');
      } finally {
        setIsConnecting(false);
      }
    };

    initializeStream();

    return () => {
      if (call) {
        call.leave().catch(console.error);
      }
    };
  }, [currentUser]);

  const handleClose = () => {
    if (call) {
      call.leave().catch(console.error);
    }
    router.back();
  };

  const handleTagInput = (text: string) => {
    setTagInput(text);
    if (text.endsWith(' ') && text.trim()) {
      addTag();
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().replace('#', '');
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const toggleFriendInvite = (friend: Guest) => {
    setInvitedFriends(prev => {
      const isInvited = prev.some(f => f.id === friend.id);
      if (isInvited) {
        return prev.filter(f => f.id !== friend.id);
      } else {
        return [...prev, friend];
      }
    });
  };

  // Invitation helper functions
  const handleOpenInviteModal = () => {
    setShowInviteModal(true);
    setInviteSearchQuery('');
    setSelectedUsers([]);
  };

  const toggleUserSelection = (user: any) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, {
          id: user.id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          profile_picture_url: user.profile_picture_url,
          is_online: user.is_online
        }];
      }
    });
  };

  const handleSendInvitations = async () => {
    if (selectedUsers.length === 0) {
      Alert.alert('No Users Selected', 'Please select at least one user to invite.');
      return;
    }

    if (!streamId) {
      Alert.alert('Error', 'Stream not found. Please try again.');
      return;
    }

    try {
      const userIds = selectedUsers.map(user => user.id);
      const result = await inviteUsersToStream({ 
        streamId: streamId, 
        userIds: userIds 
      }).unwrap();

      Alert.alert(
        '🎉 Invitations Sent!', 
        `Successfully invited ${result.invitation_count} user(s) to join your live stream.${
          result.errors && result.errors.length > 0 
            ? `\n\nSome errors occurred:\n${result.errors.join('\n')}` 
            : ''
        }`
      );

      setShowInviteModal(false);
      setSelectedUsers([]);
    } catch (error: any) {
      Alert.alert(
        'Invitation Failed', 
        error?.data?.error || 'Failed to send invitations. Please try again.'
      );
    }
  };

  const handleStartStream = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a stream title');
      return;
    }

    if (!currentUser || !call) {
      Alert.alert('Error', 'Stream not ready. Please try again.');
      return;
    }

    try {
      setIsLoading(true);

      // Create stream in backend
      const streamData = {
        title: title.trim(),
        mode: 'single' as const,
        channel: 'video' as const,
        max_seats: 1,
      };

      const streamResponse = await createStream(streamData).unwrap();
      setStreamId(streamResponse.id);

      // Start the GetStream call
      await call.camera.enable();
      await call.join();

      Alert.alert('🎉 Stream Started!', 'Your live stream is now active. You can now invite friends to join!', [
        { text: 'OK', onPress: () => router.push('/(tabs)/') }
      ]);

    } catch (error: any) {
      Alert.alert('Error', error?.data?.error || 'Failed to start stream. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isConnecting) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <StatusBar style="light" />
        <Text className="text-white text-lg">Setting up camera...</Text>
      </View>
    );
  }

  const renderInviteUserItem = ({ item }: { item: any }) => {
    const isSelected = selectedUsers.some(u => u.id === item.id);
    
    return (
      <TouchableOpacity 
        onPress={() => toggleUserSelection(item)}
        className={`flex-row items-center p-3 ${isSelected ? 'bg-purple-600/20' : 'bg-gray-800/50'} rounded-lg mb-2`}
      >
        <Image 
          source={{ 
            uri: item.profile_picture_url || 
                 item.profile_picture || 
                 'https://randomuser.me/api/portraits/men/30.jpg' 
          }}
          className="w-10 h-10 rounded-full mr-3"
        />
        <View className="flex-1">
          <Text className="text-white font-medium">
            {item.first_name && item.last_name 
              ? `${item.first_name} ${item.last_name}` 
              : item.username}
          </Text>
          <Text className="text-gray-400 text-sm">@{item.username}</Text>
        </View>
        {item.is_online && (
          <View className="w-3 h-3 bg-green-500 rounded-full mr-3" />
        )}
        <View className={`w-6 h-6 rounded-full border-2 ${
          isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-500'
        } items-center justify-center`}>
          {isSelected && <Text className="text-white text-xs">✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />
      
      {/* GetStream Camera Background */}
      {streamClient && call && (
        <View className="absolute inset-0">
          <StreamVideo client={streamClient}>
            <StreamCall call={call}>
              <CallContent />
            </StreamCall>
          </StreamVideo>
        </View>
      )}
      
      <SafeAreaView className="flex-1">
        {/* Close Button */}
        <TouchableOpacity 
          onPress={handleClose}
          className="absolute top-12 left-4 w-10 h-10 bg-black/50 rounded-full items-center justify-center z-10"
        >
          <Text className="text-white text-lg">×</Text>
        </TouchableOpacity>
        
        {/* Top Left Stream Info */}
        <View className="absolute top-12 left-4 pointer-events-auto">
          <View className="flex-row items-center bg-black/30 rounded-full px-3 py-2">
            <View className="w-2 h-2 bg-red-500 rounded-full mr-2" />
            <Text className="text-white text-sm font-medium">LIVE</Text>
          </View>
        </View>
        
        {/* Bottom Overlay - Chat and Controls */}
        <View className="absolute bottom-0 left-0 right-0 pointer-events-auto">
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            className="pt-20 pb-8 px-4"
          >
            {/* Stream Title and Host */}
            <View className="flex-row items-center mb-4">
              <Image 
                source={{ 
                  uri: currentUser?.profile_picture_url || 
                       currentUser?.profile_picture || 
                       'https://randomuser.me/api/portraits/men/30.jpg' 
                }}
                className="w-8 h-8 rounded-full mr-3"
              />
              <View className="flex-1">
                <Text className="text-white font-semibold text-base">
                  {title || 'Live Stream'}
                </Text>
                <Text className="text-gray-300 text-sm">
                  @{currentUser?.username || 'user'}
                </Text>
              </View>
            </View>
            
            {/* Viewer Stats */}
            <View className="flex-row items-center mb-4 space-x-4">
              <View className="bg-black/40 px-3 py-1 rounded-full">
                <Text className="text-white text-sm">👁 12.4k</Text>
              </View>
              <View className="bg-black/40 px-3 py-1 rounded-full">
                <Text className="text-white text-sm">❤️ 220</Text>
              </View>
              <View className="bg-black/40 px-3 py-1 rounded-full">
                <Text className="text-white text-sm">💎 +20,120</Text>
              </View>
            </View>
            
            {/* Recent Chat Messages */}
            <View className="mb-4 space-y-2">
              <View className="flex-row items-start">
                <Image 
                  source={{ uri: 'https://randomuser.me/api/portraits/women/1.jpg' }}
                  className="w-6 h-6 rounded-full mr-2 mt-1"
                />
                <View className="flex-1 bg-black/40 px-3 py-2 rounded-2xl">
                  <Text className="text-white text-sm">
                    <Text className="font-semibold text-yellow-400">Modesta Ekeh </Text>
                    Hey Karen, I love your content 😊
                  </Text>
                </View>
              </View>
              
              <View className="flex-row items-start">
                <Image 
                  source={{ uri: 'https://randomuser.me/api/portraits/women/2.jpg' }}
                  className="w-6 h-6 rounded-full mr-2 mt-1"
                />
                <View className="flex-1 bg-black/40 px-3 py-2 rounded-2xl">
                  <Text className="text-white text-sm">
                    <Text className="font-semibold text-blue-400">Modesta Ekeh joined</Text>
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Chat Input and Controls */}
            <View className="flex-row items-center space-x-3">
              <View className="flex-1 bg-black/50 rounded-full px-4 py-3">
                <Text className="text-gray-400">Type comment here...</Text>
              </View>
              <TouchableOpacity className="w-12 h-12 bg-black/50 rounded-full items-center justify-center">
                <Text className="text-white text-lg">🎤</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleOpenInviteModal}
                className="w-12 h-12 bg-black/50 rounded-full items-center justify-center"
              >
                <Text className="text-white text-lg">👥</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </SafeAreaView>

      {/* Invitation Modal */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View className="flex-1 bg-gray-900">
          <SafeAreaView className="flex-1">
            {/* Header */}
            <View className="flex-row items-center justify-between p-4 border-b border-gray-700">
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <Text className="text-white text-base">Cancel</Text>
              </TouchableOpacity>
              <Text className="text-white text-lg font-semibold">Invite Friends</Text>
              <TouchableOpacity 
                onPress={handleSendInvitations}
                className={`px-4 py-2 rounded-full ${
                  selectedUsers.length > 0 ? 'bg-purple-600' : 'bg-gray-600'
                }`}
                disabled={selectedUsers.length === 0}
              >
                <Text className={`font-medium ${
                  selectedUsers.length > 0 ? 'text-white' : 'text-gray-400'
                }`}>
                  Send ({selectedUsers.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View className="p-4">
              <View className="bg-gray-800 rounded-full px-4 py-3 flex-row items-center">
                <Text className="text-gray-400 mr-3">🔍</Text>
                <TextInput
                  value={inviteSearchQuery}
                  onChangeText={setInviteSearchQuery}
                  placeholder="Search friends..."
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 text-white"
                />
              </View>
            </View>

            {/* Users List */}
            <FlatList
              data={allInviteUsers}
              renderItem={renderInviteUserItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View className="items-center py-8">
                  <Text className="text-gray-400 text-center">
                    {inviteSearchQuery ? 'No users found' : 'No friends to invite'}
                  </Text>
                </View>
              }
            />
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}
