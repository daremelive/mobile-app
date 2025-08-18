import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

interface RealtimeStatusIndicatorProps {
  isConnected: boolean;
  lastUpdate: Date | null;
  viewerCount: number;
  onRefresh: () => void;
  className?: string;
}

export const RealtimeStatusIndicator: React.FC<RealtimeStatusIndicatorProps> = ({
  isConnected,
  lastUpdate,
  viewerCount,
  onRefresh,
  className = ''
}) => {
  const getTimeAgo = (date: Date | null): string => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    
    if (diffSecs < 10) return 'Just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    
    return 'Long ago';
  };

  const getStatusColor = (): string => {
    if (!isConnected) return '#EF4444'; // Red
    if (!lastUpdate) return '#F59E0B'; // Amber
    
    const timeSince = lastUpdate ? Date.now() - lastUpdate.getTime() : Infinity;
    if (timeSince < 5000) return '#10B981'; // Green - Fresh
    if (timeSince < 30000) return '#F59E0B'; // Amber - Stale
    return '#EF4444'; // Red - Very stale
  };

  const getStatusText = (): string => {
    if (!isConnected) return 'Disconnected';
    if (!lastUpdate) return 'Connecting...';
    return 'Live Updates';
  };

  return (
    <View className={`flex-row items-center ${className}`}>
      {/* Status Indicator */}
      <View className="flex-row items-center mr-4">
        <View 
          className="w-2 h-2 rounded-full mr-2"
          style={{ backgroundColor: getStatusColor() }}
        />
        <Text className="text-white/70 text-xs font-medium">
          {getStatusText()}
        </Text>
      </View>

      {/* Viewer Count */}
      <View className="flex-row items-center mr-4">
        <Ionicons name="eye" size={14} color="rgba(255,255,255,0.7)" />
        <Text className="text-white/70 text-xs font-medium ml-1">
          {viewerCount.toLocaleString()}
        </Text>
      </View>

      {/* Last Update Time */}
      <Text className="text-white/50 text-xs mr-4">
        {getTimeAgo(lastUpdate)}
      </Text>

      {/* Manual Refresh Button */}
      <TouchableOpacity
        onPress={onRefresh}
        className="w-8 h-8 items-center justify-center rounded-full bg-white/10"
        activeOpacity={0.7}
      >
        <Ionicons name="refresh" size={16} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>
    </View>
  );
};
