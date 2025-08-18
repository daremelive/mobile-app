import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { VideoRenderer, useCallStateHooks } from '@stream-io/video-react-native-sdk';

interface SingleStreamRendererProps {
  // Props specific to single stream rendering
}

/**
 * Single Stream Renderer Component
 * Handles rendering for single-participant streams (host-single)
 * Focused on one-to-many streaming experience
 */
export const SingleStreamRenderer: React.FC<SingleStreamRendererProps> = () => {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants() || [];
  
  const remoteParticipants = participants.filter((p: any) => !p.isLocalParticipant);
  
  // Find host participant with multiple fallback strategies
  let hostParticipant = null;
  
  // Strategy 1: Find participant with video stream
  hostParticipant = remoteParticipants.find((p: any) => p.videoStream);
  
  // Strategy 2: Find participant with published tracks
  if (!hostParticipant) {
    hostParticipant = remoteParticipants.find((p: any) => p.publishedTracks && p.publishedTracks.length > 0);
  }
  
  // Strategy 3: Find participant with audio stream
  if (!hostParticipant) {
    hostParticipant = remoteParticipants.find((p: any) => p.audioStream);
  }
  
  // Strategy 4: Use any remote participant
  if (!hostParticipant) {
    hostParticipant = remoteParticipants[0];
  }

  if (!hostParticipant) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator size="large" color="#C42720" />
        <Text className="text-white text-lg mb-2 mt-4">📡 Waiting for host...</Text>
        <Text className="text-gray-400 text-sm text-center px-8">
          Host is preparing the stream
        </Text>
        <Text className="text-gray-500 text-xs mt-2">
          Single Stream Mode • {participants.length} participant(s)
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <View className="flex-1">
        <VideoRenderer 
          participant={hostParticipant}
          objectFit="cover"
          key={`single-video-${hostParticipant.sessionId || hostParticipant.userId}`}
        />
        
        {/* Audio-only overlay for single streams */}
        {!hostParticipant.videoStream && (
          <View className="absolute inset-0 items-center justify-center bg-gray-900/95">
            <View className="items-center p-6">
              <Text className="text-white text-4xl mb-4">
                {hostParticipant.audioStream ? '🎙️' : '⏳'}
              </Text>
              <Text className="text-white text-2xl font-bold mb-2">
                {hostParticipant.audioStream ? 'Audio Stream' : 'Connecting...'}
              </Text>
              <Text className="text-gray-300 text-center px-4 mb-4">
                {hostParticipant.audioStream ? 
                  'The host is streaming audio without video' : 
                  'Waiting for host to start streaming...'}
              </Text>
              <Text className="text-gray-500 text-sm">
                Single Stream Mode
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

export default SingleStreamRenderer;
