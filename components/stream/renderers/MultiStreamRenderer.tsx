import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { VideoRenderer, useCallStateHooks } from '@stream-io/video-react-native-sdk';
import { Ionicons } from '@expo/vector-icons';

interface MultiStreamRendererProps {
  onLike?: () => void;
  onAddParticipant?: () => void;
  isLiked?: boolean;
  likeCount?: number;
}

/**
 * Multi Stream Renderer Component
 * Handles rendering for multi-participant streams (host-multi)
 * Supports grid layout for multiple participants
 */
export const MultiStreamRenderer: React.FC<MultiStreamRendererProps> = ({
  onLike,
  onAddParticipant,
  isLiked = false,
  likeCount = 0
}) => {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants() || [];
  
  // Filter active participants (excluding viewer-only participants)
  const activeParticipants = participants.filter((p: any) => {
    if (p.isLocalParticipant) return false;
    if (p.custom?.viewerOnly === true || p.custom?.role === 'viewer') return false;
    return true;
  });

  if (activeParticipants.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator size="large" color="#C42720" />
        <Text className="text-white text-lg mb-2 mt-4">📡 Waiting for participants...</Text>
        <Text className="text-gray-400 text-sm text-center px-8">
          Host and participants are preparing the multi-live stream
        </Text>
        <Text className="text-gray-500 text-xs mt-2">
          Multi Stream Mode • {participants.length} connected
        </Text>
      </View>
    );
  }

  // Single participant in multi-stream (host only)
  if (activeParticipants.length === 1) {
    const hostParticipant = activeParticipants[0];
    
    return (
      <View className="flex-1 bg-black">
        <View className="flex-1">
          <VideoRenderer 
            participant={hostParticipant}
            objectFit="cover"
            key={`multi-single-${hostParticipant.sessionId}`}
          />
          
          {!hostParticipant.videoStream && (
            <View className="absolute inset-0 items-center justify-center bg-gray-900/95">
              <View className="items-center p-6">
                <Text className="text-white text-4xl mb-4">🎙️</Text>
                <Text className="text-white text-2xl font-bold mb-2">Audio Only</Text>
                <Text className="text-gray-300 text-center px-4 mb-4">
                  Host is streaming audio without video
                </Text>
                <Text className="text-gray-500 text-sm">
                  Multi Stream Mode • Waiting for more participants
                </Text>
              </View>
            </View>
          )}
        </View>
        
        {/* Multi-stream action buttons overlay */}
        <View className="absolute bottom-20 right-4 flex-col space-y-3" style={{ zIndex: 15 }}>
          {/* Like Button */}
          <TouchableOpacity 
            onPress={onLike}
            className={`w-12 h-12 rounded-full items-center justify-center ${isLiked ? 'bg-red-500' : 'bg-black/60'}`}
          >
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={24} 
              color={isLiked ? "white" : "#ff0000"} 
            />
          </TouchableOpacity>
          
          {/* Add Participant Button */}
          <TouchableOpacity 
            onPress={onAddParticipant}
            className="w-12 h-12 rounded-full bg-black/60 items-center justify-center"
          >
            <Ionicons name="person-add" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Multiple participants - Grid layout
  const renderParticipantGrid = () => {
    // Determine grid layout based on participant count
    const getGridLayout = (count: number) => {
      if (count <= 2) return { columns: 1, aspectRatio: 16/9 };
      if (count <= 4) return { columns: 2, aspectRatio: 1 };
      if (count <= 6) return { columns: 2, aspectRatio: 16/9 };
      return { columns: 3, aspectRatio: 4/3 };
    };

    const { columns, aspectRatio } = getGridLayout(activeParticipants.length);

    const renderParticipant = ({ item: participant, index }: { item: any, index: number }) => {
      const isMainParticipant = index === 0 && activeParticipants.length > 2;
      
      return (
        <View 
          className={`bg-gray-800 rounded-lg overflow-hidden m-1 ${
            isMainParticipant ? 'flex-2' : 'flex-1'
          }`}
          style={{ 
            aspectRatio: isMainParticipant ? 16/9 : aspectRatio,
            minHeight: isMainParticipant ? 200 : 120
          }}
        >
          <VideoRenderer 
            participant={participant}
            objectFit="cover"
            key={`multi-grid-${participant.sessionId}-${index}`}
          />
          
          {/* Participant label */}
          <View className="absolute bottom-2 left-2 bg-black/60 rounded px-2 py-1">
            <Text className="text-white text-xs font-medium" numberOfLines={1}>
              {participant.userId?.split('_')[0] || `User ${index + 1}`}
            </Text>
          </View>
          
          {/* Audio/Video indicators */}
          <View className="absolute top-2 right-2 flex-row space-x-1">
            {!participant.audioStream && (
              <View className="w-6 h-6 bg-red-500 rounded-full items-center justify-center">
                <Ionicons name="mic-off" size={12} color="white" />
              </View>
            )}
            {!participant.videoStream && (
              <View className="w-6 h-6 bg-gray-600 rounded-full items-center justify-center">
                <Ionicons name="videocam-off" size={12} color="white" />
              </View>
            )}
          </View>
        </View>
      );
    };

    return (
      <FlatList
        data={activeParticipants}
        renderItem={renderParticipant}
        numColumns={columns}
        key={`grid-${columns}`}
        contentContainerStyle={{ 
          flexGrow: 1, 
          padding: 8,
          justifyContent: 'center' 
        }}
        columnWrapperStyle={columns > 1 ? { justifyContent: 'space-around' } : undefined}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View className="flex-1 bg-black">
      {renderParticipantGrid()}
      
      {/* Multi-stream stats overlay */}
      <View className="absolute top-4 left-4 bg-black/60 rounded-lg px-3 py-2">
        <Text className="text-white text-xs font-medium">
          {activeParticipants.length} Participants • {likeCount} ❤️
        </Text>
      </View>
      
      {/* Multi-stream action buttons */}
      <View className="absolute bottom-20 right-4 flex-col space-y-3" style={{ zIndex: 15 }}>
        {/* Like Button */}
        <TouchableOpacity 
          onPress={onLike}
          className={`w-12 h-12 rounded-full items-center justify-center ${isLiked ? 'bg-red-500' : 'bg-black/60'}`}
        >
          <Ionicons 
            name={isLiked ? "heart" : "heart-outline"} 
            size={24} 
            color={isLiked ? "white" : "#ff0000"} 
          />
        </TouchableOpacity>
        
        {/* Add Participant Button */}
        <TouchableOpacity 
          onPress={onAddParticipant}
          className="w-12 h-12 rounded-full bg-black/60 items-center justify-center"
        >
          <Ionicons name="person-add" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MultiStreamRenderer;
