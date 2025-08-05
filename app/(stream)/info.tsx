import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, TextInput, Image, Alert, Platform } from 'react-native';
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
import CancelIcon from '../../assets/icons/cancel.svg';
import MagicWandIcon from '../../assets/icons/magic-wand.svg';
import DareMeLiveIcon from '../../assets/icons/daremelive.svg';
import SearchIcon from '../../assets/icons/search.svg';
import SeatsIcon from '../../assets/icons/seat-selector.svg';
import { createStreamClient, createStreamUser, generateCallId } from '../../src/utils/streamClient';
import { CALL_SETTINGS } from '../../src/config/stream';

interface Participant {
  id: string;
  user: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
  };
  participant_type: 'host' | 'guest' | 'viewer';
  seat_number?: number;
  camera_enabled: boolean;
  microphone_enabled: boolean;
}

export default function StreamInfoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const currentUser = useSelector(selectCurrentUser);
  const [createStream, { isLoading }] = useCreateStreamMutation();
  const [title, setTitle] = useState('');
  const [guestSearch, setGuestSearch] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [streamClient, setStreamClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Get stream parameters
  const mode = (params.mode as 'single' | 'multi') || 'single';
  const channel = (params.channel as 'video' | 'game' | 'truth-or-dare' | 'banter') || 'video';
  const maxSeats = params.seats ? parseInt(params.seats as string) : 1;

  useEffect(() => {
    console.log('🎥 StreamInfoScreen mounted with GetStream');
    console.log('📋 Stream params:', { mode, channel, maxSeats });
    
    // Initialize GetStream client
    initializeStreamClient();
    
    return () => {
      console.log('🧹 Cleaning up GetStream client...');
      if (call) {
        call.leave();
      }
      if (streamClient) {
        streamClient.disconnectUser();
      }
    };
  }, []);

  const initializeStreamClient = async () => {
    if (!currentUser) {
      console.error('❌ No current user available for GetStream initialization');
      return;
    }

    try {
      setIsConnecting(true);
      
      // Create GetStream user
      const streamUser = createStreamUser(currentUser);
      
      // Create client (token will be fetched from backend automatically)
      const client = await createStreamClient(streamUser);
      setStreamClient(client);
      
      console.log('✅ GetStream client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize GetStream client:', error);
      Alert.alert(
        'Stream Setup Error',
        'Failed to initialize video streaming. Please check your internet connection and try again.',
        [
          { text: 'Retry', onPress: initializeStreamClient },
          { text: 'Continue Without Video', style: 'cancel' }
        ]
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleStartStream = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a stream title');
      return;
    }

    if (!streamClient) {
      Alert.alert('Error', 'Video streaming not initialized. Please try again.');
      return;
    }

    try {
      console.log('🚀 Creating stream with GetStream:', { title, mode, channel, maxSeats });
      
      const streamData = {
        title: title.trim(),
        mode: mode,
        channel: channel,
        max_seats: maxSeats,
      };

      // Create stream in your backend
      const response = await createStream(streamData).unwrap();
      console.log('✅ Stream created:', response);

      // Create GetStream call
      const callId = generateCallId(response.id);
      const call = streamClient.call('default', callId);
      
      // Join the call
      await call.join({
        create: true,
        data: {
          members: [{ user_id: currentUser!.id.toString() }], // Use non-null assertion since we checked above
        },
      });

      setCall(call);
      console.log('✅ Joined GetStream call successfully');
      
      // Navigate to stream screen with GetStream call
      router.push({
        pathname: '/(stream)/stream-info',
        params: { 
          streamId: response.id,
          callId: callId,
          title: response.title,
          mode: streamData.mode,
          maxSeats: streamData.max_seats.toString()
        }
      });
    } catch (error: any) {
      console.error('❌ Stream creation error:', error);
      Alert.alert('Error', error.data?.message || 'Failed to create stream. Please try again.');
    }
  };

  const toggleCamera = async () => {
    if (!call) return;
    
    try {
      if (cameraEnabled) {
        await call.camera.disable();
      } else {
        await call.camera.enable();
      }
      setCameraEnabled(!cameraEnabled);
      console.log('📹 Camera toggled:', !cameraEnabled);
    } catch (error) {
      console.error('❌ Error toggling camera:', error);
    }
  };

  const toggleMicrophone = async () => {
    if (!call) return;
    
    try {
      if (microphoneEnabled) {
        await call.microphone.disable();
      } else {
        await call.microphone.enable();
      }
      setMicrophoneEnabled(!microphoneEnabled);
      console.log('🎤 Microphone toggled:', !microphoneEnabled);
    } catch (error) {
      console.error('❌ Error toggling microphone:', error);
    }
  };

  const switchCamera = async () => {
    if (!call) return;
    
    try {
      await call.camera.flip();
      console.log('🔄 Camera switched');
    } catch (error) {
      console.error('❌ Failed to switch camera:', error);
    }
  };

  const renderSeats = () => {
    const seats = [];
    const seatCount = mode === 'multi' ? maxSeats : 4; 
    
    for (let i = 0; i < seatCount; i++) {
      const isHostSeat = i === 0;
      seats.push(
        <View key={i} className="w-[48%] h-[45%] bg-black mb-3 relative overflow-hidden rounded-2xl">
          {isHostSeat ? (
            <>
              {/* Host camera view with GetStream */}
              {streamClient && call ? (
                <StreamVideo client={streamClient}>
                  <StreamCall call={call}>
                    <CallContent />
                  </StreamCall>
                </StreamVideo>
              ) : (
                <View className="w-full h-full bg-gray-800 items-center justify-center">
                  <TouchableOpacity 
                    onPress={initializeStreamClient}
                    className="w-16 h-16 bg-gray-600 rounded-full items-center justify-center"
                    disabled={isConnecting}
                  >
                    <Text className="text-white text-xs text-center">
                      {isConnecting ? 'Connecting...' : 'Tap to Setup Camera'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              <View className="absolute bottom-2 left-2 bg-red-500 px-2 py-1 rounded">
                <Text className="text-white text-xs font-medium">Host</Text>
              </View>
              {/* Camera controls overlay */}
              <View className="absolute top-2 right-2 flex-row gap-2">
                <TouchableOpacity
                  onPress={toggleCamera}
                  className={`w-8 h-8 rounded-full items-center justify-center ${
                    cameraEnabled ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  disabled={!call}
                >
                  <Text className="text-white text-xs">📹</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={toggleMicrophone}
                  className={`w-8 h-8 rounded-full items-center justify-center ${
                    microphoneEnabled ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  disabled={!call}
                >
                  <Text className="text-white text-xs">🎤</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View className="flex-1 items-center justify-center">
              <View className="w-12 h-12 bg-[#2A2A2A] rounded-full items-center justify-center">
                <SeatsIcon width={24} height={24} />
              </View>
            </View>
          )}
        </View>
      );
    }
    return seats;
  };

  // Show connection status notice
  const ConnectionStatusNotice = () => {
    if (isConnecting) {
      return (
        <View className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-3 mb-4">
          <Text className="text-yellow-400 text-sm">
            🎥 Setting up video streaming...
          </Text>
        </View>
      );
    }

    if (!streamClient) {
      return (
        <View className="bg-blue-500/20 border border-blue-500 rounded-lg p-3 mb-4">
          <Text className="text-blue-400 text-sm mb-2">
            📹 Tap to setup video streaming.
          </Text>
          <TouchableOpacity 
            onPress={initializeStreamClient}
            className="bg-blue-500 rounded px-3 py-1 self-start"
          >
            <Text className="text-white text-xs font-medium">Setup Camera</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      
      {/* Full Screen Background - Seats Layout */}
      <View className="absolute inset-0 pt-16">
        {mode === 'multi' && (
          <View className="flex-1 px-4 pb-20">
            <View className="flex-row flex-wrap justify-between h-full">
              {renderSeats()}
            </View>
          </View>
        )}

        {/* Single mode preview */}
        {mode === 'single' && (
          <View className="flex-1 px-4 justify-center">
            <View className="w-full aspect-[4/3] bg-black rounded-2xl relative overflow-hidden">
              {streamClient && call ? (
                <StreamVideo client={streamClient}>
                  <StreamCall call={call}>
                    <CallContent />
                  </StreamCall>
                </StreamVideo>
              ) : (
                <TouchableOpacity 
                  onPress={initializeStreamClient}
                  className="w-full h-full bg-gray-800 items-center justify-center"
                  disabled={isConnecting}
                >
                  <View className="w-20 h-20 bg-gray-600 rounded-full items-center justify-center">
                    <Text className="text-white text-sm text-center">
                      {isConnecting ? 'Connecting...' : 'Tap to Setup Camera'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              <View className="absolute bottom-4 left-4 bg-red-500 px-3 py-1 rounded">
                <Text className="text-white text-sm font-medium">Host</Text>
              </View>
              {/* Camera controls for single mode */}
              <View className="absolute top-4 right-4 flex-row gap-3">
                <TouchableOpacity
                  onPress={toggleCamera}
                  className={`w-10 h-10 rounded-full items-center justify-center ${
                    cameraEnabled ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  disabled={!call}
                >
                  <Text className="text-white">📹</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={toggleMicrophone}
                  className={`w-10 h-10 rounded-full items-center justify-center ${
                    microphoneEnabled ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  disabled={!call}
                >
                  <Text className="text-white">🎤</Text>
                </TouchableOpacity>
                {call && (
                  <TouchableOpacity
                    onPress={switchCamera}
                    className="w-10 h-10 rounded-full items-center justify-center bg-gray-600"
                  >
                    <Text className="text-white">🔄</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Stream Info Card - Overlaid on top */}
      <View className="px-4 pt-3 pb-4 relative z-10" style={{ marginTop: '30%' }}>
        <View className="bg-black/60 rounded-2xl p-4">
          <ConnectionStatusNotice />
          
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-white text-xl font-semibold">Stream Info</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <CancelIcon width={24} height={24} />
            </TouchableOpacity>
          </View>

          {/* Title Input */}
          <View className="flex-row items-center mb-6">
            <Image 
              source={{ 
                uri: currentUser?.profile_picture_url || 
                     currentUser?.profile_picture || 
                     'https://randomuser.me/api/portraits/men/30.jpg' 
              }}
              className="w-8 h-8 rounded-full mr-3"
            />
            <TextInput
              placeholder="Add a title to chat"
              placeholderTextColor="#666"
              value={title}
              onChangeText={setTitle}
              className="flex-1 text-white text-base"
              editable={!isLoading}
            />
          </View>

          {/* Invite Guests Section - Only show for multi mode */}
          {mode === 'multi' && (
            <>
              <Text className="text-white text-base font-medium mb-3">Invite Guests</Text>
              <View className="flex-row items-center bg-transparent border border-white/20 rounded-full px-4 h-12 mb-2">
                <TextInput
                  placeholder="Search Guest"
                  placeholderTextColor="#666"
                  value={guestSearch}
                  onChangeText={setGuestSearch}
                  className="flex-1 text-white text-base"
                  editable={!isLoading}
                />
                <SearchIcon width={16} height={16} color="#666" />
              </View>
            </>
          )}
        </View>
      </View>

      {/* Bottom Actions - Also overlaid */}
      <View className="absolute bottom-8 left-0 right-0 px-4 z-10">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity 
            className="w-14 h-14 rounded-full bg-[#1A1A1A] items-center justify-center"
            disabled={isLoading}
          >
            <MagicWandIcon width={24} height={24} />
          </TouchableOpacity>
          <View className="w-[82%] h-[52px] rounded-full overflow-hidden">
            <LinearGradient
              colors={['#FF0000', '#330000']}
              locations={[0, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="w-full h-full"
            >
              <TouchableOpacity 
                className="w-full h-full items-center justify-center flex-row gap-2"
                onPress={handleStartStream}
                disabled={isLoading || isConnecting}
              >
                <Text className="text-white text-[17px] font-semibold">
                  {isLoading ? 'Creating Stream...' : 
                   isConnecting ? 'Setting up Video...' :
                   'Start Live Now'}
                </Text>
                {!isLoading && !isConnecting && (
                  <View>
                    <DareMeLiveIcon width={24} height={24} />
                  </View>
                )}
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
} 