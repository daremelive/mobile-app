import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, SafeAreaView, Share, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../src/store/authSlice';
import { StreamHeader, StreamChatOverlay, MultiParticipantInputBar, useStreamState, useStreamChat, useGiftAnimations, useEndStream, EndStreamModal } from '../../components/stream';
import { StreamVideo, StreamCall, useCallStateHooks, VideoRenderer } from '@stream-io/video-react-native-sdk';
import ipDetector from '../../src/utils/ipDetector';
import { useGetProfileQuery } from '../../src/store/authApi';
import { useCreateStreamMutation } from '../../src/store/streamsApi';
import AddTeamIcon from '../../assets/icons/add-team.svg';
import GiftAnimation from '../../components/animations/GiftAnimation';

export default function HostMultiStreamScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const currentUser = useSelector(selectCurrentUser) as any;
  
  const streamIdFromParams = (params.id as string) || '';
  const titleFromParams = (params.title as string) || '';
  const channel = (params.channel as string) || 'video';
  const maxSeats = parseInt((params.maxSeats as string) || '6');
  const fromTitleScreen = params.fromTitleScreen === 'true';
  
  const [streamId, setStreamId] = useState(streamIdFromParams);
  const [title, setTitle] = useState(titleFromParams);
  const [isCreatingStream, setIsCreatingStream] = useState(false);

  const { data: freshUserData } = useGetProfileQuery();
  const userData = freshUserData || currentUser;

  const [createStream] = useCreateStreamMutation();

  const [profilePictureUrl, setProfilePictureUrl] = useState<string>('');

  const { state, actions, streamDetails, messages: streamMessages } = useStreamState({ 
    streamId: streamId, 
    userRole: 'host' 
  });

  const chat = useStreamChat({
    streamId,
    userId: userData?.id?.toString(),
    username: userData?.username,
    isHost: true,
  });

  const giftAnimations = useGiftAnimations({
    messages: streamMessages || [],
    baseURL: state.baseURL || '',
  });

  const endStreamSystem = useEndStream({
    streamId,
    onStreamEnd: () => {
      if (state.call) {
        state.call.leave().catch(console.error);
      }
    },
  });

  const messages = streamMessages || [];

  useEffect(() => {
    const createStreamFromTitleScreen = async () => {
      if (fromTitleScreen && !streamId && userData?.id && !isCreatingStream) {
        setIsCreatingStream(true);
        
        try {
          const streamData = {
            title: titleFromParams.trim() || `${userData.username || 'User'}'s Multi Live Stream`,
            mode: 'multi' as const,
            channel: channel as 'video' | 'game' | 'truth-or-dare' | 'banter',
            max_seats: maxSeats,
          };

          const newStream = await createStream(streamData).unwrap();
          
          setStreamId(newStream.id);
          setTitle(newStream.title);
          
        } catch (error: any) {
          Alert.alert(
            'Stream Creation Failed',
            error?.data?.error || error?.message || 'Failed to create stream. Please try again.',
            [
              { text: 'Go Back', onPress: () => router.back() },
              { text: 'Retry', onPress: () => createStreamFromTitleScreen() }
            ]
          );
        } finally {
          setIsCreatingStream(false);
        }
      }
    };

    createStreamFromTitleScreen();
  }, [fromTitleScreen, streamId, userData?.id, isCreatingStream, titleFromParams, channel, maxSeats, createStream, router]);

  const handleShare = async () => {
    try {
      const baseURL = await ipDetector.getAPIBaseURL();
      const webURL = baseURL?.replace('/api/', '') || 'https://daremelive.pythonanywhere.com';
      const shareUrl = `${webURL}/stream/${streamId}?utm_source=mobile_share&utm_medium=social&host=${userData?.username}`;
      
      await Share.share({
        message: `Join my multi-live stream on DareMe! 🔴\n\n"${title || 'Multi Live Stream'}"\n\nChannel: ${channel}\n\n${shareUrl}`,
        url: shareUrl,
        title: `${userData?.first_name || userData?.username}'s Multi Live Stream`
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share stream');
    }
  };

  const getProfilePictureUrl = async () => {
    if (userData?.profile_picture_url) {
      return userData.profile_picture_url;
    }
    
    if (userData?.profile_picture) {
      if (userData.profile_picture.startsWith('http')) {
        return userData.profile_picture;
      }
      try {
        const baseURL = await ipDetector.getAPIBaseURL();
        const webURL = baseURL?.replace('/api/', '') || 'https://daremelive.pythonanywhere.com';
        return `${webURL}${userData.profile_picture}`;
      } catch (error) {
        return `https://daremelive.pythonanywhere.com${userData.profile_picture}`;
      }
    }
    
    return null;
  };

  useEffect(() => {
    getProfilePictureUrl().then(setProfilePictureUrl);
  }, [userData?.profile_picture, userData?.profile_picture_url]);

  // Initialize stream when user data and stream ID are available  
  useEffect(() => {
    if (currentUser?.id && streamId && !state.hasJoined && !state.isOperationInProgress) {
      actions.initializeStream();
    }
  }, [currentUser?.id, streamId, state.hasJoined, state.isOperationInProgress]);

  const handleSendMessage = async (message: string) => {
    if (chat?.sendMessage) {
      chat.sendMessage(message);
    }
  };

  const handleAddParticipant = () => {
    Alert.alert(
      'Add Participant',
      `You can invite up to ${maxSeats} participants to join your multi-live stream.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Invite Users', 
          onPress: () => {
            Alert.alert('Feature Coming Soon', 'Participant invitation system will be available soon!');
          }
        }
      ]
    );
  };

  const MultiParticipantVideoGrid = () => {
    const { useParticipants } = useCallStateHooks();
    const participants = useParticipants();
    
    const localParticipant = participants.find((p: any) => p.isLocalParticipant);
    const remoteParticipants = participants.filter((p: any) => !p.isLocalParticipant);
    
    // Only consider remote participants with active video streams as actual participants
    // Viewers don't have video streams, so they shouldn't trigger screen division
    // This ensures the host screen remains full when viewers join, and only splits when actual participants join
    const activeRemoteParticipants = remoteParticipants.filter((p: any) => p.videoStream);
    
    return (
      <View className="flex-1 bg-black">
        {activeRemoteParticipants.length === 0 ? (
          localParticipant ? (
            <VideoRenderer participant={localParticipant} objectFit="cover" />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-white/60 text-sm">Initializing camera...</Text>
            </View>
          )
        ) : (
          <View className="flex-1 flex-wrap flex-row">
            {/* Include local participant + active remote participants (those with video streams) */}
            {(() => {
              const allActiveParticipants = [localParticipant, ...activeRemoteParticipants].filter(Boolean);
              return allActiveParticipants.map((participant: any, index: number) => (
                <View 
                  key={participant.sessionId} 
                  className={`bg-gray-800 ${allActiveParticipants.length <= 2 ? 'w-full h-1/2' : allActiveParticipants.length <= 4 ? 'w-1/2 h-1/2' : 'w-1/3 h-1/3'}`}
                >
                  <VideoRenderer participant={participant} objectFit="cover" />
                  <View className="absolute bottom-2 left-2 bg-black/60 rounded px-2 py-1">
                    <Text className="text-white text-xs">
                      {participant.isLocalParticipant ? 'You' : participant.name || 'Guest'}
                    </Text>
                  </View>
                </View>
              ));
            })()}
          </View>
        )}
      </View>
    );
  };

  useEffect(() => {
    if (streamId && userData?.id) {
    }
  }, [streamId, userData?.id]);

  if (!userData?.id) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#fff" />
        <Text className="text-white mt-4">Loading user data...</Text>
      </SafeAreaView>
    );
  }

  if (fromTitleScreen && isCreatingStream) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#fff" />
        <Text className="text-white mt-4">Creating multi-live stream...</Text>
        <Text className="text-gray-400 mt-2">Channel: {channel.replace('-', ' ')}</Text>
        <Text className="text-gray-400">Max Participants: {maxSeats}</Text>
      </SafeAreaView>
    );
  }

  if (!streamId) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <Text className="text-white">Missing stream ID</Text>
        <TouchableOpacity 
          className="mt-4 bg-red-500 px-6 py-3 rounded-lg"
          onPress={() => router.back()}
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Stream Video Container */}
      {state.isConnecting || !state.hasJoined ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#fff" />
          <Text className="text-white mt-4">Starting multi-live stream...</Text>
        </View>
      ) : (
        state.streamClient && state.call && (
          <StreamVideo client={state.streamClient}>
            <StreamCall call={state.call}>
              <MultiParticipantVideoGrid />
            </StreamCall>
          </StreamVideo>
        )
      )}

      <StreamHeader
        streamTitle={title || 'Multi Live Stream'}
        hostFirstName={userData?.first_name}
        hostLastName={userData?.last_name}
        hostUsername={userData?.username}
        hostProfilePicture={profilePictureUrl || undefined}
        viewerCount={0}
        onToggleFollow={() => {}}
        onShare={handleShare}
        disableFollow={true}
        onClose={endStreamSystem.showEndStreamModal}
      />

      <StreamChatOverlay 
        messages={messages}
        keyboardHeight={chat.keyboardHeight}
        isKeyboardVisible={chat.isKeyboardVisible}
        inputBarHeight={72}
        baseURL={state.baseURL}
      />

      <MultiParticipantInputBar
        onSendMessage={handleSendMessage}
        onAddParticipant={handleAddParticipant}
        hasJoined={state.hasJoined}
        keyboardHeight={chat.keyboardHeight}
        isKeyboardVisible={chat.isKeyboardVisible}
      />

      {giftAnimations.activeGiftAnimations.map((animation) => (
        <GiftAnimation
          key={animation.id}
          gift={animation.gift}
          sender={animation.sender}
          animationKey={animation.animationKey}
          onAnimationComplete={() => giftAnimations.handleGiftAnimationComplete(animation.id)}
        />
      ))}

      <EndStreamModal
        visible={endStreamSystem.isEndStreamModalVisible}
        onCancel={endStreamSystem.hideEndStreamModal}
        onEndStream={endStreamSystem.handleEndStream}
        isLoading={endStreamSystem.isEndingStream}
      />
    </View>
  );
}
