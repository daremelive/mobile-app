import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, SafeAreaView, Share, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../src/store/authSlice';
import { StreamHeader, StreamChatOverlay, StreamInputBar, StreamControls, useStreamState, useStreamChat, useEndStream, EndStreamModal } from '../../components/stream';
import { StreamVideo, StreamCall, useCallStateHooks, VideoRenderer } from '@stream-io/video-react-native-sdk';
import ipDetector from '../../src/utils/ipDetector';
import { useGetProfileQuery } from '../../src/store/authApi';

export default function HostSingleStreamScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const currentUser = useSelector(selectCurrentUser) as any;
  const streamId = (params.id as string) || '';
  const title = (params.title as string) || '';

  // Fetch fresh user profile data to ensure we have latest profile picture
  const { data: freshUserData } = useGetProfileQuery();
  const userData = freshUserData || currentUser;

  // Share handler
  const handleShare = async () => {
    try {
      const baseURL = await ipDetector.getAPIBaseURL();
      const webURL = baseURL?.replace('/api/', '') || 'https://daremelive.pythonanywhere.com';
      const shareUrl = `${webURL}/stream/${streamId}?utm_source=mobile_share&utm_medium=social&host=${userData?.username}`;
      
      await Share.share({
        message: `Join me live on DareMe! 🔴\n\n"${title || 'Live Stream'}"\n\n${shareUrl}`,
        url: shareUrl,
        title: `${userData?.first_name || userData?.username}'s Live Stream`
      });
    } catch (error) {
      console.error('Share failed:', error);
      Alert.alert('Error', 'Failed to share stream');
    }
  };

  // Log currentUser for debugging
  console.log('🔍 Current user data:', {
    id: userData?.id,
    username: userData?.username,
    profile_picture: userData?.profile_picture,
    profile_picture_url: userData?.profile_picture_url,
  });

  // Construct proper profile picture URL
  const getProfilePictureUrl = async () => {
    if (userData?.profile_picture_url) {
      console.log('📸 Using profile_picture_url:', userData.profile_picture_url);
      return userData.profile_picture_url;
    }
    
    if (userData?.profile_picture) {
      console.log('📸 Using profile_picture:', userData.profile_picture);
      // If it's already a full URL, use it
      if (userData.profile_picture.startsWith('http')) {
        return userData.profile_picture;
      }
      // Otherwise construct the full URL using detected API base
      try {
        const baseURL = await ipDetector.getAPIBaseURL();
        const webURL = baseURL?.replace('/api/', '') || 'https://daremelive.pythonanywhere.com';
        return `${webURL}${userData.profile_picture}`;
      } catch (error) {
        console.error('Failed to get base URL for profile picture:', error);
        return `https://daremelive.pythonanywhere.com${userData.profile_picture}`;
      }
    }
    
    console.log('📸 No profile picture found');
    return null;
  };

  const [profilePictureUrl, setProfilePictureUrl] = React.useState<string | null>(null);

  // Update profile picture URL when userData changes
  React.useEffect(() => {
    getProfilePictureUrl().then(setProfilePictureUrl);
  }, [userData?.profile_picture, userData?.profile_picture_url]);

  // Core stream state (host role)
  const { state, actions, streamDetails, messages } = useStreamState({ streamId, userRole: 'host' });

  // Chat (host perspective)
  const chat = useStreamChat({
    streamId,
    userId: userData?.id?.toString(),
    username: userData?.username,
    isHost: true,
  });

  const endStreamSystem = useEndStream({
    streamId,
    onStreamEnd: () => {
      actions.handleLeaveStream();
    },
  });

  // Initialize when details + user available
  useEffect(() => {
    // Trigger initialization once user & streamId & not joined yet
    if (currentUser?.id && streamId && !state.hasJoined && !state.isOperationInProgress) {
      actions.initializeStream();
    }
  }, [currentUser?.id, streamId, state.hasJoined, state.isOperationInProgress]);

  if (!streamId) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <Text className="text-white">Missing stream ID</Text>
      </SafeAreaView>
    );
  }

  if (state.isConnecting || !state.hasJoined) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#C42720" />
        <Text className="text-white mt-4">Starting your stream…</Text>
      </SafeAreaView>
    );
  }

  const VideoLayer = () => {
    if (!state.call || !state.streamClient) return null;
    const { useParticipants } = useCallStateHooks();
    const participants = useParticipants();
    const local = participants.find((p: any) => p.isLocalParticipant);
    return (
      <View className="flex-1 bg-black">
        {local ? (
          <VideoRenderer participant={local} objectFit="cover" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-white/60 text-sm">Initializing camera…</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-black">
      {state.streamClient && state.call && (
        <StreamVideo client={state.streamClient}>
          <StreamCall call={state.call}>
            <VideoLayer />
          </StreamCall>
        </StreamVideo>
      )}

      <StreamHeader
        streamTitle={title || streamDetails?.title}
        hostFirstName={userData?.first_name}
        hostLastName={userData?.last_name}
        hostUsername={userData?.username}
        hostProfilePicture={profilePictureUrl || undefined}
        viewerCount={streamDetails?.viewer_count || 0}
        onToggleFollow={() => {
          // For host view, this could be disabled or show different behavior
          console.log('Follow action from host view');
        }}
        onShare={handleShare}
        disableFollow={true} // Disable follow button for host's own stream
        onClose={endStreamSystem.showEndStreamModal}
      />

      <StreamChatOverlay 
        messages={messages}
        keyboardHeight={chat.keyboardHeight}
        isKeyboardVisible={chat.isKeyboardVisible}
        inputBarHeight={72}
        baseURL={state.baseURL}
      />

      <StreamInputBar
        onSendMessage={chat.sendMessage}
        onGiftPress={() => {}}
        hasJoined={state.hasJoined}
        keyboardHeight={chat.keyboardHeight}
        isKeyboardVisible={chat.isKeyboardVisible}
        showGiftButton={false}
      />

      <StreamControls isHost />

      <EndStreamModal
        visible={endStreamSystem.isEndStreamModalVisible}
        onCancel={endStreamSystem.hideEndStreamModal}
        onEndStream={endStreamSystem.handleEndStream}
        isLoading={endStreamSystem.isEndingStream}
      />
    </View>
  );
}
