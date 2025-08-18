import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTierAccessControl, TierLevel } from '../hooks/useTierAccessControl';
import { Stream, StreamHost } from '../store/streamsApi';

interface TierAccessGuardProps {
  children: React.ReactNode;
  stream?: Stream | null;
  host?: StreamHost | null;
  allowHigherTier?: boolean;
  requireExactMatch?: boolean;
  onAccessDenied?: () => void;
  showUpgradePrompt?: boolean;
}

/**
 * TierAccessGuard component provides tier-based access control for stream viewing
 * Wraps viewer screens and shows appropriate messages for access restrictions
 */
export const TierAccessGuard: React.FC<TierAccessGuardProps> = ({
  children,
  stream,
  host,
  allowHigherTier = false,
  requireExactMatch = true,
  onAccessDenied,
  showUpgradePrompt = true
}) => {
  const { checkStreamAccess, checkHostAccess, getTierDisplayName } = useTierAccessControl();

  // Determine which access check to use
  const accessResult = stream 
    ? checkStreamAccess(stream, { allowHigherTier, requireExactMatch })
    : checkHostAccess(host || null, { allowHigherTier, requireExactMatch });

  // Handle access denied callback
  React.useEffect(() => {
    if (!accessResult.canAccess && onAccessDenied) {
      onAccessDenied();
    }
  }, [accessResult.canAccess, onAccessDenied]);

  // If access is granted, render children
  if (accessResult.canAccess) {
    return <>{children}</>;
  }

  // Show tier restriction UI
  const handleUpgrade = () => {
    if (showUpgradePrompt) {
      Alert.alert(
        'Upgrade Required',
        `You need ${getTierDisplayName(accessResult.hostTier!)} tier to access this stream. Would you like to upgrade your account?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Upgrade', 
            onPress: () => {
              // Navigate to upgrade screen
              router.push('/wallet');
            }
          }
        ]
      );
    }
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <View className="flex-1 bg-gray-900 justify-center items-center px-6">
      <LinearGradient
        colors={['rgba(59, 130, 246, 0.1)', 'rgba(147, 51, 234, 0.1)']}
        className="w-full max-w-sm p-8 rounded-2xl items-center"
      >
        {/* Access Denied Icon */}
        <View className="w-20 h-20 bg-red-500/20 rounded-full items-center justify-center mb-6">
          <Ionicons name="lock-closed" size={40} color="#EF4444" />
        </View>

        {/* Title */}
        <Text className="text-white text-2xl font-bold text-center mb-4">
          Tier Access Required
        </Text>

        {/* Message */}
        <Text className="text-gray-300 text-center mb-2 leading-6">
          {accessResult.reason}
        </Text>

        {/* Tier Information */}
        <View className="flex-row items-center justify-center mb-6 space-x-4">
          <View className="items-center">
            <Text className="text-gray-400 text-sm mb-1">Your Tier</Text>
            <Text className="text-white font-semibold">
              {accessResult.userTier ? getTierDisplayName(accessResult.userTier) : 'Unknown'}
            </Text>
          </View>
          
          <Ionicons name="arrow-forward" size={20} color="#6B7280" />
          
          <View className="items-center">
            <Text className="text-gray-400 text-sm mb-1">Required</Text>
            <Text className="text-blue-400 font-semibold">
              {accessResult.hostTier ? getTierDisplayName(accessResult.hostTier) : 'Unknown'}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="w-full space-y-3">
          {showUpgradePrompt && (
            <TouchableOpacity
              onPress={handleUpgrade}
              className="w-full"
            >
              <LinearGradient
                colors={['#3B82F6', '#8B5CF6']}
                className="py-4 px-6 rounded-xl"
              >
                <Text className="text-white text-center font-semibold text-lg">
                  Upgrade Account
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleGoBack}
            className="w-full py-4 px-6 border border-gray-600 rounded-xl"
          >
            <Text className="text-gray-300 text-center font-semibold text-lg">
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

export default TierAccessGuard;
