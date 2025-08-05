import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  TouchableOpacity, 
  TextInput, 
  Image, 
  Modal, 
  Alert, 
  ScrollView, 
  Switch, 
  FlatList, 
  Animated,
  Dimensions,
  Platform
} from 'react-native';
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
import Constants from 'expo-constants';

const { width, height } = Dimensions.get('window');
const statusBarHeight = Constants.statusBarHeight;

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
  
  // Get stream mode settings from params
  const streamMode = params.mode as string || 'single';
  const streamChannel = params.channel as string || 'video';
  const maxSeats = parseInt(params.seats as string) || 1;
  
  // Stream setup states
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  
  // GetStream states
  const [streamClient, setStreamClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Invitation states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [streamId, setStreamId] = useState<string | null>(null);
  const [inviteAnimation] = useState(new Animated.Value(0));

  const [createStream] = useCreateStreamMutation();
  const [inviteUsersToStream] = useInviteUsersToStreamMutation();

  // Initialize GetStream client and call
  useEffect(() => {
    const initializeStream = async () => {
      if (!currentUser) return;

      try {
        setIsConnecting(true);
        const client = await createStreamClient(currentUser);
        setStreamClient(client);

        // Create a call based on stream mode
        const callId = `${streamMode}_${currentUser.id}_${Date.now()}`;
        const callType = streamMode === 'multi' ? 'default' : 'livestream';
        const newCall = client.call(callType, callId);
        
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
  }, [currentUser, streamMode]);

  const handleClose = () => {
    if (call) {
      call.leave().catch(console.error);
    }
    router.back();
  };

  const handleStartLiveNow = async () => {
    if (!title.trim()) {
      Alert.alert('Add a Title', 'Please add a title to your stream before going live.');
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
        mode: streamMode as 'single' | 'multi',
        channel: streamChannel as 'video' | 'game' | 'truth-or-dare' | 'banter',
        max_seats: maxSeats,
      };

      const streamResponse = await createStream(streamData).unwrap();
      setStreamId(streamResponse.id);

      // Start the GetStream call
      await call.camera.enable();
      
      setIsLive(true);
      
      // Animate the floating invite button
      Animated.spring(inviteAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();

    } catch (error: any) {
      Alert.alert('Error', error?.data?.error || 'Failed to start stream. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteByUsername = async () => {
    if (!inviteUsername.trim()) {
      Alert.alert('Enter Username', 'Please enter a username to invite.');
      return;
    }

    if (!streamId) {
      Alert.alert('Error', 'Stream not found. Please try again.');
      return;
    }

    try {
      const result = await inviteUsersToStream({ 
        streamId: streamId, 
        username: inviteUsername.trim()
      }).unwrap();

      Alert.alert(
        '🎉 Invitation Sent!', 
        result.message || `Successfully invited @${inviteUsername} to join your live stream. They will receive a notification in their DareMe account and email.`
      );

      setInviteUsername('');
      setShowInviteModal(false);
    } catch (error: any) {
      Alert.alert(
        'Invitation Failed', 
        error?.data?.error || `Could not find user @${inviteUsername}. Please check the username and try again.`
      );
    }
  };

  const handleOpenInviteModal = () => {
    setShowInviteModal(true);
    setInviteUsername('');
  };

  if (isConnecting) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <StatusBar style="light" />
        <Text className="text-white text-lg mb-4">Setting up camera...</Text>
        <View className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </View>
    );
  }

  // Live Stream View
  if (isLive && streamClient && call) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        
        {/* GetStream Camera Background - Full Screen */}
        <View style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%'
        }}>
          <StreamVideo client={streamClient}>
            <StreamCall call={call}>
              <CallContent />
            </StreamCall>
          </StreamVideo>
        </View>

        {/* UI Overlays */}
        <View style={{ flex: 1, paddingTop: statusBarHeight }}>
          {/* Top Profile Header - Like the reference image */}
          <View style={{ 
            position: 'absolute',
            top: 10,
            left: 16,
            right: 16,
            zIndex: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            {/* Profile Section */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.6)',
              borderRadius: 25,
              paddingHorizontal: 12,
              paddingVertical: 8,
              flex: 1,
              marginRight: 12
            }}>
              {/* Avatar */}
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#9CA3AF',
                marginRight: 12,
                overflow: 'hidden'
              }}>
                <Image 
                  source={{ 
                    uri: currentUser?.profile_picture_url || 
                         currentUser?.profile_picture || 
                         'https://randomuser.me/api/portraits/men/30.jpg' 
                  }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </View>
              
              {/* Name and Username */}
              <View style={{ flex: 1 }}>
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }} numberOfLines={1}>
                  {currentUser?.first_name && currentUser?.last_name 
                    ? `${currentUser.first_name} ${currentUser.last_name}` 
                    : currentUser?.username || 'User'}
                </Text>
                <Text style={{ color: '#D1D5DB', fontSize: 14 }} numberOfLines={1}>
                  @{currentUser?.username || 'user'}
                </Text>
              </View>
              
              {/* Follow Button */}
              <TouchableOpacity style={{
                backgroundColor: 'white',
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 8,
                marginLeft: 8
              }}>
                <Text style={{ color: 'black', fontWeight: '600', fontSize: 14 }}>Follow</Text>
              </TouchableOpacity>
              
              {/* Share Button */}
              <TouchableOpacity style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'white',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 8
              }}>
                <Text style={{ color: 'black', fontSize: 18 }}>📤</Text>
              </TouchableOpacity>
            </View>
            
            {/* Close Button */}
            <TouchableOpacity 
              onPress={handleClose}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(0,0,0,0.6)',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Text style={{ color: 'white', fontSize: 20 }}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Comment Bar - Like the reference image */}
          <View className="absolute left-4 right-4 flex-row items-center gap-3 z-10" style={{ bottom: 120 }}>
            {/* Comment Input */}
            <View className="flex-1 bg-black/40 rounded-full px-4 py-3">
              <TextInput
                placeholder="Type comment here..."
                placeholderTextColor="#999"
                className="text-white text-base"
                multiline={false}
                maxLength={200}
              />
            </View>
            
            {/* Gift Icon */}
            <TouchableOpacity className="w-12 h-12 bg-black/40 rounded-full items-center justify-center">
              <Text className="text-white text-xl">🎁</Text>
            </TouchableOpacity>
            
            {/* Add People Icon */}
            <TouchableOpacity 
              onPress={handleOpenInviteModal}
              className="w-12 h-12 bg-black/40 rounded-full items-center justify-center"
            >
              <Text className="text-white text-xl">👥</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Overlay */}
          <View className="absolute bottom-0 left-0 right-0 z-10" style={{ paddingBottom: 34 }}>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              className="pt-20 pb-8 px-4"
            >
              {/* Stream Info */}
              <View className="flex-row items-center mb-4">
                <Image 
                  source={{ 
                    uri: currentUser?.profile_picture_url || 
                         currentUser?.profile_picture || 
                         'https://randomuser.me/api/portraits/men/30.jpg' 
                  }}
                  className="w-10 h-10 rounded-full mr-3 border-2 border-white"
                />
                <View className="flex-1">
                  <Text className="text-white font-bold text-lg">{title}</Text>
                  <Text className="text-gray-300 text-sm">@{currentUser?.username || 'user'}</Text>
                </View>
              </View>
              
              {/* Live Stats */}
              <View className="flex-row items-center mb-6 space-x-4">
                <View className="bg-red-500/20 border border-red-500 px-3 py-1 rounded-full">
                  <Text className="text-red-400 text-sm font-bold">👁 LIVE</Text>
                </View>
                <View className="bg-white/10 px-3 py-1 rounded-full">
                  <Text className="text-white text-sm">❤️ 0</Text>
                </View>
                <View className="bg-white/10 px-3 py-1 rounded-full">
                  <Text className="text-white text-sm">💎 0</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Floating Invite Button */}
          <Animated.View
            style={{
              position: 'absolute',
              right: 20,
              bottom: 154, // Adjusted for full screen
              transform: [
                {
                  scale: inviteAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                },
              ],
              opacity: inviteAnimation,
            }}
          >
            <TouchableOpacity
              onPress={handleOpenInviteModal}
              className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full items-center justify-center shadow-2xl"
              style={{
                shadowColor: '#8B5CF6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <Text className="text-white text-2xl font-bold">+</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Invite Modal */}
        <Modal
          visible={showInviteModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowInviteModal(false)}
        >
          <View className="flex-1 bg-black">
            <SafeAreaView className="flex-1">
              {/* Header */}
              <View className="flex-row items-center justify-between p-4 border-b border-gray-800">
                <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                  <Text className="text-gray-400 text-base">Cancel</Text>
                </TouchableOpacity>
                <Text className="text-white text-lg font-bold">Invite Friend</Text>
                <TouchableOpacity 
                  onPress={handleInviteByUsername}
                  className="bg-purple-600 px-4 py-2 rounded-full"
                >
                  <Text className="text-white font-bold">Send</Text>
                </TouchableOpacity>
              </View>

              {/* Content */}
              <ScrollView className="flex-1 p-6">
                <View className="items-center mb-8">
                  <View className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full items-center justify-center mb-4">
                    <Text className="text-white text-3xl">👥</Text>
                  </View>
                  <Text className="text-white text-xl font-bold mb-2">Invite to Your Live Stream</Text>
                  <Text className="text-gray-400 text-center">
                    Enter a username to invite them to join your live stream. 
                    They'll receive a notification in their DareMe account and email.
                  </Text>
                </View>

                {/* Username Input */}
                <View className="mb-6">
                  <Text className="text-white text-sm font-medium mb-2">Username</Text>
                  <View className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-4 flex-row items-center">
                    <Text className="text-gray-400 text-lg mr-2">@</Text>
                    <TextInput
                      value={inviteUsername}
                      onChangeText={setInviteUsername}
                      placeholder="Enter username"
                      placeholderTextColor="#6B7280"
                      className="flex-1 text-white text-lg"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Info Card */}
                <View className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                  <View className="flex-row items-center mb-2">
                    <Text className="text-purple-400 text-lg mr-2">ℹ️</Text>
                    <Text className="text-purple-400 font-semibold">How it works</Text>
                  </View>
                  <Text className="text-gray-300 text-sm">
                    • User receives notification in their DareMe account{'\n'}
                    • Email invitation sent to their registered email{'\n'}
                    • They can join your stream as a {streamMode === 'multi' ? 'participant' : 'viewer'}{'\n'}
                    • Maximum {maxSeats} {maxSeats === 1 ? 'seat' : 'seats'} available
                  </Text>
                </View>
              </ScrollView>
            </SafeAreaView>
          </View>
        </Modal>
      </View>
    );
  }

  // Stream Info Setup View (matches your screenshot)
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

      {/* Dark Overlay */}
      <View className="absolute inset-0 bg-black/60" />

      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4">
          <TouchableOpacity onPress={handleClose}>
            <Text className="text-white text-xl">×</Text>
          </TouchableOpacity>
          <Text className="text-white text-lg font-bold">Stream Info</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Content */}
        <ScrollView className="flex-1 px-4">
          {/* Profile Section */}
          <View className="flex-row items-center mb-6">
            <Image 
              source={{ 
                uri: currentUser?.profile_picture_url || 
                     currentUser?.profile_picture || 
                     'https://randomuser.me/api/portraits/men/30.jpg' 
              }}
              className="w-12 h-12 rounded-full mr-3"
            />
            <View className="flex-1">
              <Text className="text-white font-semibold text-base">
                {currentUser?.first_name} {currentUser?.last_name}
              </Text>
              <Text className="text-gray-400 text-sm">@{currentUser?.username}</Text>
            </View>
          </View>

          {/* Title Input */}
          <View className="mb-6">
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Add a title to start"
              placeholderTextColor="#6B7280"
              className="bg-gray-900/80 text-white text-lg px-4 py-4 rounded-xl border border-gray-700"
              maxLength={100}
            />
          </View>

          {/* Stream Mode Info */}
          <View className="bg-gray-900/80 rounded-xl p-4 mb-6 border border-gray-700">
            <Text className="text-white font-semibold mb-3">Selected Configuration</Text>
            <View className="space-y-2">
              <View className="flex-row justify-between">
                <Text className="text-gray-400">Mode:</Text>
                <Text className="text-white capitalize">{streamMode} Live</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-400">Channel:</Text>
                <Text className="text-white capitalize">{streamChannel}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-400">Seats:</Text>
                <Text className="text-white">{maxSeats}</Text>
              </View>
            </View>
          </View>

          {/* Invite Guests Section */}
          <View className="mb-8">
            <Text className="text-white font-semibold mb-3">Invite Guests</Text>
            <View className="bg-gray-900/80 rounded-xl border border-gray-700">
              <TouchableOpacity 
                className="flex-row items-center p-4"
                onPress={handleOpenInviteModal}
              >
                <View className="w-10 h-10 bg-purple-600 rounded-full items-center justify-center mr-3">
                  <Text className="text-white text-lg">+</Text>
                </View>
                <Text className="text-gray-400 flex-1">Search Guest</Text>
                <Text className="text-purple-400">🔍</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Controls */}
        <View className="p-4">
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity className="w-12 h-12 bg-gray-800 rounded-full items-center justify-center">
              <Text className="text-white text-lg">⚙️</Text>
            </TouchableOpacity>
            <TouchableOpacity className="w-12 h-12 bg-gray-800 rounded-full items-center justify-center">
              <Text className="text-white text-lg">🔔</Text>
            </TouchableOpacity>
          </View>
          
          {/* Start Live Now Button */}
          <TouchableOpacity
            onPress={handleStartLiveNow}
            disabled={isLoading || !title.trim()}
            className={`bg-red-500 rounded-full py-4 px-6 flex-row items-center justify-center ${
              isLoading || !title.trim() ? 'opacity-50' : ''
            }`}
          >
            {isLoading ? (
              <View className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
            ) : (
              <Text className="text-white text-lg mr-2">🎥</Text>
            )}
            <Text className="text-white text-lg font-bold">
              {isLoading ? 'Starting...' : 'Start Live Now'}
            </Text>
            {!isLoading && <Text className="text-white text-lg ml-2">➤</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
