import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

interface StreamControlsProps {
  isHost?: boolean;
  isRecording?: boolean;
  isMuted?: boolean;
  isCameraOn?: boolean;
  canToggleCamera?: boolean;
  canToggleMic?: boolean;
  canRecord?: boolean;
  onToggleCamera?: () => void;
  onToggleMic?: () => void;
  onToggleRecording?: () => void;
}

export const StreamControls = ({
  isHost = false,
  isRecording = false,
  isMuted = false,
  isCameraOn = true,
  canToggleCamera = true,
  canToggleMic = true,
  canRecord = false,
  onToggleCamera,
  onToggleMic,
  onToggleRecording,
}: StreamControlsProps) => {
  return (
    <View className="absolute bottom-20 right-4 flex-col items-center space-y-3">
      {/* Camera Toggle */}
      {canToggleCamera && onToggleCamera && (
        <TouchableOpacity
          onPress={onToggleCamera}
          className={`w-12 h-12 rounded-full items-center justify-center ${
            isCameraOn ? 'bg-gray-700/80' : 'bg-red-500/80'
          }`}
        >
          <Ionicons
            name={isCameraOn ? 'videocam' : 'videocam-off'}
            size={24}
            color="white"
          />
        </TouchableOpacity>
      )}

      {/* Mic Toggle */}
      {canToggleMic && onToggleMic && (
        <TouchableOpacity
          onPress={onToggleMic}
          className={`w-12 h-12 rounded-full items-center justify-center ${
            !isMuted ? 'bg-gray-700/80' : 'bg-red-500/80'
          }`}
        >
          <Ionicons
            name={!isMuted ? 'mic' : 'mic-off'}
            size={24}
            color="white"
          />
        </TouchableOpacity>
      )}

      {/* Recording Toggle (Host only) */}
      {canRecord && onToggleRecording && (
        <TouchableOpacity
          onPress={onToggleRecording}
          className={`w-12 h-12 rounded-full items-center justify-center ${
            isRecording ? 'bg-red-500/80' : 'bg-gray-700/80'
          }`}
        >
          <Ionicons
            name="radio-button-on"
            size={24}
            color="white"
          />
        </TouchableOpacity>
      )}

  {/* Leave button removed - cancel in header handles end */}
    </View>
  );
};
