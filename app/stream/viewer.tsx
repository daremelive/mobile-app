import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, FlatList, TextInput, Image, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../src/store/authSlice';
import { useGetStreamQuery, useJoinStreamMutation, useLeaveStreamMutation, useGetStreamMessagesQuery, useSendMessageMutation } from '../../src/store/streamsApi';
import { StreamVideoClient, StreamCall, StreamVideo, VideoRenderer, useCallStateHooks } from '@stream-io/video-react-native-sdk';
import { createStreamClient, createStreamUser } from '../../src/utils/streamClient';
import CancelIcon from '../../assets/icons/cancel.svg';

export default function StreamViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const currentUser = useSelector(selectCurrentUser);
  
  const streamId = params.streamId as string;
  const hostUsername = params.hostUsername as string;
  const streamTitle = params.streamTitle as string;

  const [streamClient, setStreamClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<any>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [comment, setComment] = useState('');
  
  // API hooks
  const { data: streamDetails, isLoading: streamLoading } = useGetStreamQuery(streamId);
  const [joinStream] = useJoinStreamMutation();
  const [leaveStream] = useLeaveStreamMutation();
  const [sendMessage] = useSendMessageMutation();
  
  // Get stream messages
  const { data: messages = [], refetch: refetchMessages } = useGetStreamMessagesQuery(
    streamId, 
    { 
      pollingInterval: 3000, // Poll every 3 seconds for real-time chat
      refetchOnMountOrArgChange: true,
    }
  );
  
  // Chat scroll reference
  const chatFlatListRef = useRef<FlatList>(null);

  // Initialize stream connection
  useEffect(() => {
    initializeStreamViewer();
    
    return () => {
      // Cleanup when component unmounts
      handleLeaveStream();
    };
  }, []);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && chatFlatListRef.current) {
      setTimeout(() => {
        chatFlatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const initializeStreamViewer = async () => {
    if (!currentUser?.id || !streamDetails) {
      return;
    }

    try {
      setIsConnecting(true);

      // Create GetStream client for viewer
      const streamUser = createStreamUser(currentUser);
      const client = await createStreamClient(streamUser);
      if (!client) {
        Alert.alert('Error', 'Failed to connect to stream', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }
      setStreamClient(client);

      // Join the call as viewer
      const callId = `stream_${streamId}`;
      const streamCall = client.call('livestream', callId);
      
      await streamCall.join();
      setCall(streamCall);

      // Join the stream in the backend
      await joinStream({
        streamId,
        data: { participant_type: 'viewer' }
      }).unwrap();

      setHasJoined(true);
      setIsConnecting(false);
    } catch (error: any) {
      console.error('Stream viewer initialization error:', error);
      Alert.alert('Connection Error', 'Failed to join the stream', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  };

  const handleLeaveStream = async () => {
    try {
      if (hasJoined) {
        await leaveStream(streamId).unwrap();
      }
      
      if (call) {
        await call.leave();
      }
      
      setHasJoined(false);
    } catch (error) {
      console.error('Leave stream error:', error);
    }
  };

  const handleSendComment = async () => {
    if (!comment.trim() || !hasJoined) {
      return;
    }

    try {
      await sendMessage({
        streamId,
        data: { message: comment.trim() }
      }).unwrap();
      
      setComment('');
      refetchMessages();
      
      setTimeout(() => {
        chatFlatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    } catch (error: any) {
      console.error('Send comment error:', error);
      Alert.alert('Error', 'Failed to send comment');
    }
  };

  const StreamContent = () => {
    const { useParticipants } = useCallStateHooks();
    const participants = useParticipants();
    
    // Find the host participant (the one streaming)
    const hostParticipant = participants.find(p => !p.isLocalParticipant && p.videoStream);

    if (!hostParticipant || !hostParticipant.videoStream) {
      return (
        <View className="flex-1 items-center justify-center bg-black">
          <Text className="text-white text-lg mb-2">📡 Connecting to stream...</Text>
          <Text className="text-gray-400 text-sm">Please wait</Text>
        </View>
      );
    }

    return (
      <View className="flex-1 bg-black">
        <VideoRenderer 
          participant={hostParticipant}
          objectFit="cover"
        />
      </View>
    );
  };

  const renderStreamContent = () => {
    if (isConnecting || streamLoading) {
      return (
        <View className="flex-1 items-center justify-center bg-black">
          <ActivityIndicator size="large" color="#C42720" />
          <Text className="text-white text-lg mt-4">Joining {hostUsername}'s stream...</Text>
        </View>
      );
    }

    if (!streamClient || !call) {
      return (
        <View className="flex-1 items-center justify-center bg-black">
          <Text className="text-white text-lg mb-2">❌ Connection Failed</Text>
          <TouchableOpacity onPress={() => router.back()} className="bg-[#C42720] px-4 py-2 rounded-lg">
            <Text className="text-white font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View className="flex-1 bg-black">
        <StreamVideo client={streamClient}>
          <StreamCall call={call}>
            <StreamContent />
          </StreamCall>
        </StreamVideo>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      className="flex-1" 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      
      {/* Stream Content */}
      <View className="flex-1">
        {renderStreamContent()}
      </View>

      {/* Stream Info Overlay */}
      {hasJoined && (
        <View className="absolute top-16 left-4 right-4 flex-row items-center justify-between" style={{ zIndex: 10 }}>
          {/* Stream Info */}
          <View className="flex-row items-center bg-black/60 rounded-full px-4 py-2 flex-1 mr-3">
            <View className="w-2 h-2 bg-red-500 rounded-full mr-2" />
            <View className="flex-1">
              <Text className="text-white font-semibold text-sm" numberOfLines={1}>
                {streamTitle}
              </Text>
              <Text className="text-gray-300 text-xs" numberOfLines={1}>
                @{hostUsername} • {streamDetails?.viewer_count || 0} viewers
              </Text>
            </View>
          </View>
          
          {/* Leave Button */}
          <TouchableOpacity 
            onPress={async () => {
              await handleLeaveStream();
              router.back();
            }}
            className="w-10 h-10 rounded-full items-center justify-center"
          >
            <CancelIcon width={25} height={25} />
          </TouchableOpacity>
        </View>
      )}

      {/* Live Chat Overlay */}
      {hasJoined && messages.length > 0 && (
        <View className="absolute left-4 right-20" style={{ 
          zIndex: 5,
          bottom: 100,
        }}>
          <View style={{ maxHeight: 200 }}>
            <FlatList
              ref={chatFlatListRef}
              data={messages.slice(-4)} // Show only last 4 messages in overlay
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item, index }) => (
                <View className="mb-2" style={{ opacity: index < 1 ? 0.6 : 1 }}>
                  <View className="flex-row items-start">
                    {/* User Avatar */}
                    <View className="w-6 h-6 rounded-full bg-gray-400 mr-2 overflow-hidden flex-shrink-0">
                      {(item.user.profile_picture_url || item.user.avatar_url) ? (
                        <Image 
                          source={{ uri: `http://192.168.1.117:8000${item.user.profile_picture_url || item.user.avatar_url}` }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="w-full h-full bg-purple-500 items-center justify-center">
                          <Text className="text-white font-bold text-xs">
                            {(item.user.full_name || item.user.username || 'U').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    {/* Message */}
                    <View className="bg-black/60 rounded-xl px-3 py-2 flex-shrink-1" style={{ maxWidth: '75%' }}>
                      <Text className="text-white text-xs">
                        <Text className="font-bold">{item.user.full_name || item.user.username}: </Text>
                        {item.message}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ 
                flexGrow: 1, 
                justifyContent: 'flex-end',
                paddingBottom: 8,
              }}
            />
          </View>
        </View>
      )}

      {/* Comment Input */}
      {hasJoined && (
        <View className="absolute left-4 right-4 bottom-8 flex-row items-center" style={{ zIndex: 10 }}>
          <View className="flex-1 bg-black/60 rounded-full px-4 py-3 mr-3">
            <TextInput
              placeholder="Say something..."
              placeholderTextColor="#999"
              value={comment}
              onChangeText={setComment}
              className="text-white text-sm"
              multiline={false}
              maxLength={200}
              returnKeyType="send"
              onSubmitEditing={handleSendComment}
            />
          </View>
          
          <TouchableOpacity 
            onPress={handleSendComment}
            disabled={!comment.trim()}
            className={`w-12 h-12 rounded-full items-center justify-center ${
              comment.trim() ? 'bg-[#C42720]' : 'bg-gray-600'
            }`}
          >
            <Text className="text-white text-lg">📤</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
