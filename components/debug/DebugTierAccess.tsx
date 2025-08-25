// Debug component to help troubleshoot tier access issues
import React from 'react';
import { View, Text } from 'react-native';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../src/store/authSlice';
import { useTierAccessControl } from '../../src/hooks/useTierAccessControl';

interface DebugTierAccessProps {
  hostTier: string;
  hostName: string;
}

const DebugTierAccess: React.FC<DebugTierAccessProps> = ({ hostTier, hostName }) => {
  const currentUser = useSelector(selectCurrentUser);
  const { checkHostAccess, getTierDisplayName } = useTierAccessControl();

  if (!__DEV__) return null; // Only show in development

  const tierAccessResult = checkHostAccess(
    { vip_level: hostTier } as any, 
    { allowHigherTier: true, requireExactMatch: false }
  );

  return (
    <View className="absolute top-16 left-4 right-4 bg-black/80 p-3 rounded-lg z-50">
      <Text className="text-yellow-400 font-bold text-sm mb-2">🔧 DEBUG: Tier Access</Text>
      <Text className="text-white text-xs">User: {(currentUser as any)?.first_name} ({(currentUser as any)?.vip_level || 'unknown'})</Text>
      <Text className="text-white text-xs">Host: {hostName} ({hostTier})</Text>
      <Text className="text-white text-xs">Can Access: {tierAccessResult.canAccess ? '✅ YES' : '❌ NO'}</Text>
      {tierAccessResult.reason && (
        <Text className="text-red-400 text-xs">Reason: {tierAccessResult.reason}</Text>
      )}
      <Text className="text-gray-400 text-xs mt-1">
        Logic: User level {'>'}= Host level = {tierAccessResult.canAccess ? 'Pass' : 'Fail'}
      </Text>
    </View>
  );
};

export default DebugTierAccess;
