import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, TextInput, Image, Modal, Alert, ScrollView, Switch } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../src/store/authSlice';
import { useCreateStreamMutation } from '../../src/store/streamsApi';
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

  const [createStream] = useCreateStreamMutation();

  const categories = [
    { id: 1, name: 'Just Chatting' },
    { id: 2, name: 'Gaming' },
    { id: 3, name: 'Music' },
    { id: 4, name: 'Art' },
    { id: 5, name: 'Fitness' },
    { id: 6, name: 'Cooking' },
    { id: 7, name: 'Educational' },
    { id: 8, name: 'Other' },
  ];

  const mockFriends: Guest[] = [
    { id: 1, username: 'john_doe', first_name: 'John', last_name: 'Doe', is_online: true, profile_picture_url: 'https://randomuser.me/api/portraits/men/1.jpg' },
    { id: 2, username: 'jane_smith', first_name: 'Jane', last_name: 'Smith', is_online: false, profile_picture_url: 'https://randomuser.me/api/portraits/women/1.jpg' },
    { id: 3, username: 'mike_wilson', first_name: 'Mike', last_name: 'Wilson', is_online: true, profile_picture_url: 'https://randomuser.me/api/portraits/men/2.jpg' },
  ];

  const filteredFriends = mockFriends.filter(friend =>
    friend.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${friend.first_name} ${friend.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
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
        category: selectedCategory,
        tags: tags,
        is_private: isPrivate,
        notify_followers: notifyFollowers,
        invited_guests: invitedFriends.map(f => f.id),
      };

      await createStream(streamData).unwrap();

      // Start the GetStream call
      await call.camera.enable();
      await call.microphone.enable();

      Alert.alert('Success', 'Stream started successfully!', [
        { text: 'OK', onPress: () => router.replace('/stream/live') }
      ]);

    } catch (error: any) {
      console.error('Failed to start stream:', error);
      Alert.alert('Error', error?.data?.detail || 'Failed to start stream. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderFriendItem = (item: Guest) => (
    <TouchableOpacity
      key={item.id}
      className="flex-row items-center justify-between py-3 px-1"
      onPress={() => toggleFriendInvite(item)}
    >
      <View className="flex-row items-center flex-1">
        <Image 
          source={{ uri: item.profile_picture_url || 'https://randomuser.me/api/portraits/men/30.jpg' }}
          className="w-10 h-10 rounded-full mr-3"
        />
        <View className="flex-1">
          <Text className="text-white font-medium">
            {item.first_name} {item.last_name}
          </Text>
          <Text className="text-gray-400 text-sm">@{item.username}</Text>
        </View>
        {item.is_online && (
          <View className="w-3 h-3 bg-green-500 rounded-full mr-3" />
        )}
      </View>
      <View className={`w-6 h-6 rounded-full border-2 ${
        invitedFriends.some(f => f.id === item.id)
          ? 'bg-blue-500 border-blue-500'
          : 'border-gray-400'
      } items-center justify-center`}>
        {invitedFriends.some(f => f.id === item.id) && (
          <Text className="text-white text-xs">✓</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-black">
      {/* Full-Screen GetStream Video Feed */}
      {streamClient && call ? (
        <StreamVideo client={streamClient}>
          <StreamCall call={call}>
            <View className="flex-1">
              <CallContent 
                onHangupCallHandler={handleClose}
              />
            </View>
          </StreamCall>
        </StreamVideo>
      ) : (
        <View className="flex-1 bg-gray-800 items-center justify-center">
          <Text className="text-white text-lg">
            {isConnecting ? 'Connecting to live stream...' : 'Loading camera...'}
          </Text>
        </View>
      )}
      
      {/* Minimal UI Overlays - Like TikTok */}
      <SafeAreaView className="absolute inset-0 pointer-events-none">
        <StatusBar style="light" />
        
        {/* Top Right Controls */}
        <View className="absolute top-12 right-4 pointer-events-auto">
          <TouchableOpacity 
            onPress={handleClose} 
            className="w-10 h-10 bg-black/30 rounded-full items-center justify-center mb-3"
          >
            <Text className="text-white text-xl">×</Text>
          </TouchableOpacity>
        </View>
        
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
              <TouchableOpacity className="w-12 h-12 bg-black/50 rounded-full items-center justify-center">
                <Text className="text-white text-lg">👥</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </SafeAreaView>
    </View>
  );
}
