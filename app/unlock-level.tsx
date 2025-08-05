import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useDispatch } from 'react-redux';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import CheckIcon from '../assets/icons/check.svg';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  useGetUserLevelSummaryQuery,
  useGetLevelTiersQuery,
  useUnlockLevelMutation,
} from '../src/api/levelsApi';

// Import Tier-specific Icons
import BasicBadge from '../assets/icons/basic.svg';
import PremiumBadge from '../assets/icons/premium.svg';
import VIPBadge from '../assets/icons/vip.svg';
import VVIPBadge from '../assets/icons/vvip.svg';
import UnlockVVIPModal from '../components/modals/UnlockVVIPModal';

const UnlockLevelScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedTier, setSelectedTier] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // RTK Query hooks
  const { data: levelSummary, isLoading: summaryLoading, error: summaryError, refetch: refetchSummary } = useGetUserLevelSummaryQuery();
  const { data: levelTiers, isLoading: tiersLoading, error: tiersError, refetch: refetchTiers } = useGetLevelTiersQuery();
  const [unlockLevel] = useUnlockLevelMutation();

  const getBadgeComponent = (tierName: string) => {
    switch (tierName) {
      case 'basic': return BasicBadge;
      case 'premium': return PremiumBadge;
      case 'vip': return VIPBadge;
      case 'vvip': return VVIPBadge;
      default: return BasicBadge;
    }
  };

  const handleUnlock = (tier: any) => {
    if (tier.name === 'vvip') {
      setSelectedTier(tier);
      setModalVisible(true);
    } else {
      handleDirectUnlock(tier);
    }
  };

  const handleDirectUnlock = async (tier: any) => {
    try {
      await unlockLevel({ tier_id: tier.id }).unwrap();
      Alert.alert('Success!', `You've unlocked ${tier.display_name} level!`);
      refetchSummary();
      refetchTiers();
    } catch (error: any) {
      const errorMessage = error?.data?.tier_id?.[0] || error?.data?.detail || error?.data?.message || 'Failed to unlock level. Please try again.';
      Alert.alert('Unlock Failed', errorMessage);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedTier(null);
  };

  const handleModalUnlock = () => {
    if (selectedTier) {
      handleDirectUnlock(selectedTier);
    }
    handleCloseModal();
  };

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchSummary(),
        refetchTiers()
      ]);
      
      // Also invalidate stream privileges cache
      dispatch({ type: 'levelsApi/util/invalidateTags', payload: ['StreamPrivileges'] });
      
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle authentication errors
  const isAuthError = (error: any) => {
    return error?.status === 401 || error?.data?.detail?.includes('Authentication');
  };

  if (summaryLoading || tiersLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black justify-center items-center">
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#A40000" />
        <Text className="text-white mt-4">Loading level data...</Text>
      </SafeAreaView>
    );
  }

  // Handle authentication errors
  if (isAuthError(summaryError) || isAuthError(tiersError)) {
    return (
      <SafeAreaView className="flex-1 bg-black justify-center items-center px-6">
        <StatusBar style="light" />
        <Text className="text-white text-xl font-semibold mb-4 text-center">Authentication Required</Text>
        <Text className="text-gray-400 text-center mb-6">
          Please log in to view your level progress and unlock new tiers.
        </Text>
        <TouchableOpacity 
          onPress={() => router.push('/(auth)/signin')}
          className="bg-[#A40000] px-8 py-3 rounded-full"
        >
          <Text className="text-white font-semibold">Go to Login</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-gray-400">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Handle other errors
  if (summaryError || tiersError || !levelSummary || !levelTiers) {
    // Debug information
    console.log('🐛 [UnlockLevel] Summary Error:', summaryError);
    console.log('🐛 [UnlockLevel] Tiers Error:', tiersError);
    console.log('🐛 [UnlockLevel] Level Summary:', levelSummary);
    console.log('🐛 [UnlockLevel] Level Tiers:', levelTiers);
    
    return (
      <SafeAreaView className="flex-1 bg-black justify-center items-center px-6">
        <StatusBar style="light" />
        <Text className="text-white text-xl font-semibold mb-4 text-center">Unable to Load Level Data</Text>
        <Text className="text-gray-400 text-center mb-2">
          There was an error loading your level information.
        </Text>
        {/* Debug info for development */}
        {__DEV__ && (
          <View className="bg-gray-800 p-4 rounded mb-4 max-w-full">
            <Text className="text-yellow-400 text-xs mb-2">Debug Info:</Text>
            {summaryError && (
              <Text className="text-red-400 text-xs mb-1">
                Summary Error: {JSON.stringify(summaryError, null, 2)}
              </Text>
            )}
            {tiersError && (
              <Text className="text-red-400 text-xs mb-1">
                Tiers Error: {JSON.stringify(tiersError, null, 2)}
              </Text>
            )}
          </View>
        )}
        <TouchableOpacity 
          onPress={() => {
            refetchSummary();
            refetchTiers();
          }}
          className="bg-[#A40000] px-8 py-3 rounded-full mb-4"
        >
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-gray-400">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentTier = levelSummary.current_tier;
  const progress = levelSummary.progress;
  const CurrentBadge = getBadgeComponent(currentTier.name);

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      <View className="flex-row items-center relative px-4 pt-3 pb-3 mb-6">
        <TouchableOpacity onPress={() => router.back()} className="absolute left-4 z-10 bg-[#1E1E1E] w-14 h-14 rounded-full justify-center items-center">
          <ArrowLeftIcon width={24} height={24} />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-white text-xl font-semibold">Unlock Level</Text>
        </View>
      </View>

      <ScrollView 
        className="flex-1 px-4"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#A40000"
            colors={['#A40000']}
          />
        }
      >
        <View className="rounded-2xl overflow-hidden mb-8">
          <LinearGradient
            colors={['#FDF2EE', '#FBC19D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View className="flex-row justify-between items-center p-6">
              <View>
                <View>
                  <Text className="text-black text-2xl font-bold">{currentTier.display_name}</Text>
                  <Text className="text-black text-sm">{levelSummary.coins.total_earned} coins earned</Text>
                </View>
                
                <Text className="text-black mt-4">
                  {levelSummary.next_tier 
                    ? `Get ${levelSummary.coins.needed_for_next} more coins to reach ${levelSummary.next_tier.display_name}`
                    : 'You\'ve reached the maximum level!'}
                </Text>
                {levelSummary.next_tier && (
                  <View className="w-full bg-gray-300 rounded-full h-2.5 mt-2">
                    <View className="bg-black h-2.5 rounded-full" style={{ width: `${progress * 100}%` }} />
                  </View>
                )}
              </View>
              <CurrentBadge width={80} height={80} />
            </View>
          </LinearGradient>
        </View>

        <Text className="text-white text-xl font-semibold mb-4">Tier System</Text>

        {levelTiers.map((tier) => {
          const BadgeComponent = getBadgeComponent(tier.name);
          
          return (
            <View 
              key={tier.id} 
              style={{ backgroundColor: tier.color_hex, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }} 
              className="rounded-xl p-4 mb-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <BadgeComponent width={40} height={40} style={{ marginRight: 16 }} />
                <View>
                  <Text className="text-black text-lg font-bold">{tier.display_name}</Text>
                  <Text className="text-gray-500">{tier.coin_range_display}</Text>
                </View>
              </View>
              {tier.is_current ? (
                <View className="flex-row items-center">
                  <CheckIcon width={16} height={16} fill="#1D5B1D" />
                  <Text className="text-[#1D5B1D] ml-2">Current Level</Text>
                </View>
              ) : tier.is_unlocked ? (
                <View className="flex-row items-center">
                  <CheckIcon width={16} height={16} fill="#1D5B1D" />
                  <Text className="text-[#1D5B1D] ml-2">Unlocked</Text>
                </View>
              ) : (
                <TouchableOpacity 
                  style={{ backgroundColor: '#FFFFFF' }} 
                  className="px-6 py-2 rounded-full"
                  onPress={() => handleUnlock(tier)}
                >
                  <Text style={{ color: '#090909' }} className="font-semibold">Unlock</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
      
      {selectedTier && (
        <UnlockVVIPModal
          visible={isModalVisible}
          onClose={handleCloseModal}
          onUnlock={handleModalUnlock}
        />
      )}
    </SafeAreaView>
  );
};

export default UnlockLevelScreen; 