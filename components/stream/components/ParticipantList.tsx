import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export interface Participant {
  id: string;
  username: string;
  profilePicture?: string;
  isHost?: boolean;
  isMuted?: boolean;
  isCameraOn?: boolean;
  isOnSeat?: boolean;
  seatNumber?: number;
}

interface ParticipantListProps {
  participants: Participant[];
  isVisible?: boolean;
  onParticipantPress?: (participant: Participant) => void;
  showControls?: boolean;
  currentUserId?: string;
}

export const ParticipantList = ({
  participants,
  isVisible = true,
  onParticipantPress,
  showControls = false,
  currentUserId,
}: ParticipantListProps) => {
  if (!isVisible || participants.length === 0) return null;

  return (
    <View className="absolute top-20 right-4 bg-black/40 rounded-lg p-3 max-w-[40%]">
      <Text className="text-white font-semibold text-sm mb-2">
        Participants ({participants.length})
      </Text>
      
      {participants.map((participant) => (
        <TouchableOpacity
          key={participant.id}
          onPress={() => onParticipantPress?.(participant)}
          className="flex-row items-center py-2"
          disabled={!onParticipantPress}
        >
          <View className="relative">
            {participant.profilePicture ? (
              <Image
                source={{ uri: participant.profilePicture }}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <View className="w-8 h-8 rounded-full bg-gray-600 items-center justify-center">
                <Ionicons name="person" size={16} color="white" />
              </View>
            )}
            
            {/* Status indicators */}
            {participant.isOnSeat && (
              <View className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-black" />
            )}
          </View>
          
          <View className="flex-1 ml-2">
            <Text className={`text-xs font-medium ${
              participant.isHost ? 'text-yellow-400' : 'text-white'
            }`} numberOfLines={1}>
              {participant.username}
              {participant.isHost && ' 👑'}
              {participant.id === currentUserId && ' (You)'}
            </Text>
            
            {participant.seatNumber && (
              <Text className="text-white/60 text-xs">
                Seat {participant.seatNumber}
              </Text>
            )}
          </View>
          
          {showControls && (
            <View className="flex-row">
              {!participant.isCameraOn && (
                <Ionicons name="videocam-off" size={12} color="red" />
              )}
              {participant.isMuted && (
                <Ionicons name="mic-off" size={12} color="red" className="ml-1" />
              )}
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};
