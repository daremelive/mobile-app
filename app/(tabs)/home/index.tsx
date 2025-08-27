import React from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
  AppState,
  RefreshControl,
  TextInput
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { fonts } from '../../../constants/Fonts';
import { router } from 'expo-router';
import SearchInput from '../../../components/SearchInput';
import UniversalSearch from '../../../components/UniversalSearch';
import { useGetFollowingQuery } from '../../../src/store/followApi';
import { useGetPopularStreamsQuery, useGetFollowingLiveStreamsQuery, useSearchQuery } from '../../../src/store/streamsApi';
import { useFollowUserMutation, useUnfollowUserMutation } from '../../../src/store/followApi';
import { useGetBlockedUsersQuery } from '../../../src/api/blockedApi';
import { useNotificationContext } from '../../../src/context/NotificationContext';
import { useTranslation } from '../../../src/hooks/useTranslation';
import ClockIcon from '../../../assets/icons/clock.svg';
import CancelIcon from '../../../assets/icons/cancel.svg';
import StarsIcon from '../../../assets/icons/stars.svg';
import CheckIcon from '../../../assets/icons/check.svg';
import EyeIcon from '../../../assets/icons/eye.svg';
import ipDetector from '../../../src/utils/ipDetector';
import useChannelAccess from '../../../src/hooks/useChannelAccess';
import ChannelAccessModal from '../../../components/modals/ChannelAccessModal';
import ProfileAvatar from '../../../components/ui/ProfileAvatar';
import StreamCard from '../../../components/stream/StreamCard';

const categories = ['All', 'Video', 'Game', 'Truth/Dare', 'Banter'];

export default function HomeScreen() {
  const { t, currentLanguage } = useTranslation();
  const [selectedCategory, setSelectedCategory] = React.useState('All');
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);
  
  const [baseURL, setBaseURL] = React.useState<string>('');
  const { requestChannelAccess, accessModal, closeAccessModal, currentCoins } = useChannelAccess();

  // Initialize base URL with IP detection
  React.useEffect(() => {
    const initializeBaseURL = async () => {
      try {
        const detection = await ipDetector.detectIP();
        const url = `http://${detection.ip}:8000`;
        setBaseURL(url);
        console.log('🔗 Home Base URL initialized:', url);
      } catch (error) {
        console.error('❌ Failed to detect IP in home:', error);
        setBaseURL('https://daremelive.pythonanywhere.com'); // Production fallback
      }
    };
    
    initializeBaseURL();
  }, []);

  // Get following users with live status
  const { data: followingUsers = [], isLoading: followingLoading, error: followingError } = useGetFollowingQuery({ search: '' });
  
  // Get blocked users to filter them out (with error handling)
  const { data: blockedUsers = [] } = useGetBlockedUsersQuery(undefined, {
    // Don't fail the entire following section if blocked users can't be fetched
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
  });
  
  // Filter out blocked users from following list
  const filteredFollowingUsers = React.useMemo(() => {
    if (!followingUsers || !Array.isArray(followingUsers)) return [];
    
    // Get blocked user IDs for efficient filtering
    const blockedUserIds = new Set(blockedUsers.map(blocked => blocked.blocked_user.id));
    
    // Filter out blocked users
    const filtered = followingUsers.filter(user => !blockedUserIds.has(user.id));
    
    // Debug logging
    if (blockedUserIds.size > 0) {
      console.log('🚫 Following section block filtering:', {
        totalFollowing: followingUsers.length,
        blockedCount: blockedUserIds.size,
        filteredCount: filtered.length,
        blockedUserIds: Array.from(blockedUserIds)
      });
    }
    
    return filtered;
  }, [followingUsers, blockedUsers]);
  
  // Get live streams from following users
  const { data: followingLiveStreamsData, isLoading: liveStreamsLoading } = useGetFollowingLiveStreamsQuery();
  
  // Ensure followingLiveStreams is always an array - API returns Stream[] directly
  const followingLiveStreams = Array.isArray(followingLiveStreamsData) ? followingLiveStreamsData : [];

  // If there's an authentication error, clear following users to avoid stale data
  const safeFollowingUsers = followingError ? [] : filteredFollowingUsers;
  
  // Get popular/trending streams with automatic refresh to detect ended streams
  const { data: popularStreamsData, isLoading: popularLoading, refetch: refetchPopular } = useGetPopularStreamsQuery(undefined, {
    pollingInterval: 30000, // Refresh every 30 seconds to detect ended streams
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  
  // Real-time notification stats
  const { stats: notificationStats, isConnected: notificationConnected } = useNotificationContext();
  
  // Ensure popularStreams is always an array - API returns Stream[] directly
  const popularStreams = Array.isArray(popularStreamsData) ? popularStreamsData : [];

  // Auto-refresh streams when app comes to foreground to detect ended streams
  React.useEffect(() => {
    const handleAppStateChange = (nextAppState: any) => {
      if (nextAppState === 'active') {
        refetchPopular();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [refetchPopular]);

  // Refresh streams when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refetchPopular();
    }, [refetchPopular])
  );

  // Manual refresh function for pull-to-refresh
  const onRefresh = React.useCallback(async () => {
    console.log('[HomeScreen] Manual refresh triggered...');
    setIsRefreshing(true);
    try {
      await refetchPopular();
    } catch (error) {
      console.error('[HomeScreen] Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchPopular]);

  // Since we're filtering at the API level, we can use popularStreams directly
  const filteredStreams = React.useMemo(() => {
    if (!popularStreams || popularStreams.length === 0) return [];
    
    if (selectedCategory === 'All') {
      return popularStreams;
    }
    
    // Filter by selected category
    const channelFilter = selectedCategory.toLowerCase().replace('truth/dare', 'truth-or-dare');
    return popularStreams.filter(stream => stream.channel === channelFilter);
  }, [popularStreams, selectedCategory]);

  // Navigate to user profile
  const navigateToProfile = (userId: number) => {
    router.push({
      pathname: '/user-profile',
      params: { userId: userId.toString() }
    });
  };

  const handleJoinStream = (streamId: string, streamTitle: string, hostUsername: string, channel?: string) => {
    // 🏆 PROFESSIONAL TIER ACCESS CHECK - No more "connection failed"!
    // For safety, default to 'video' if channel is not provided
    const streamChannel = channel || 'video';
    const hasAccess = requestChannelAccess(streamChannel);
    
    if (!hasAccess) {
      // Access modal will be shown automatically by the hook
      return;
    }

    // User has access - proceed with confirmation
    Alert.alert(
      'Join Live Stream',
      `Join ${hostUsername}'s stream: "${streamTitle}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Join',
          onPress: () => {
            console.log(`✅ Joining ${streamChannel} stream: ${streamId}`);
            // Navigate to stream viewer
            router.push({
              pathname: '/stream/viewer',
              params: { 
                streamId: streamId,
                hostUsername: hostUsername,
                streamTitle: streamTitle
              }
            });
          },
        },
      ]
    );
  };

  const dismissKeyboard = React.useCallback(() => {
    Keyboard.dismiss();
    setIsSearching(false);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <ScrollView 
          scrollEnabled={!isSearching}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#C42720"
              colors={['#C42720']}
              title="Refreshing streams..."
              titleColor="#ffffff"
            />
          }
          contentContainerStyle={{ paddingBottom: 100 }} // Add bottom padding for tab bar
          showsVerticalScrollIndicator={false}
        >
        <View className="p-4">
          {/* Header */}
          <View className="mb-6 flex-row items-center justify-between">
            <View className="flex-1">
              <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-2xl mb-1">
                {t('home.connectWith', 'Connect with your') as string}
              </Text>
              <Text style={{ fontFamily: fonts.bold }} className="text-[#C42720] text-2xl">
                {t('home.favoriteStreamers', 'Favorite Streamers!') as string}
              </Text>
              {/* Debug info to verify translations */}
              <Text className="text-gray-400 text-xs mt-1">
                {t('common.language', 'Language') as string}: {currentLanguage}
              </Text>
            </View>
            
            {/* Notification Icon */}
            <TouchableOpacity 
              onPress={() => router.push('/notification-inbox')}
              className="relative bg-gray-800 rounded-full p-3 ml-4"
            >
              <MaterialIcons name="notifications" size={24} color="#C42720" />
              
              {/* Real-time connection indicator */}
              <View className={`absolute top-1 left-1 w-2 h-2 rounded-full ${notificationConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
              
              {/* Notification Badge - Show unread count */}
              {notificationStats && notificationStats.unread_notifications > 0 && (
                <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center">
                  <Text className="text-white text-xs font-bold">
                    {notificationStats.unread_notifications > 9 ? '9+' : notificationStats.unread_notifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Universal Search Component */}
          <UniversalSearch
            mode="embedded"
            onJoinStream={handleJoinStream}
            baseURL={baseURL}
            placeholder="Search for streamers, content..."
            className="mb-6"
            onClose={() => setIsSearching(false)}
          />

          {!isSearching && (
            <>
              {/* Categories */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            className="mb-8"
            contentContainerStyle={{ paddingHorizontal: 0 }}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                onPress={() => setSelectedCategory(category)}
                className={`px-6 py-3 rounded-full mr-3 ${
                  selectedCategory === category ? 'bg-white' : 'bg-[#1C1C1E]'
                }`}
                style={{ 
                  minWidth: category === 'Truth/Dare' ? 110 : 80,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Text 
                  style={{ fontFamily: fonts.semiBold }} 
                  className={`text-sm ${
                    selectedCategory === category ? 'text-black' : 'text-white'
                  }`}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Following Section */}
          <View className="mb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-lg">
                Following
              </Text>
              <TouchableOpacity 
                onPress={() => router.push('/followings')}
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center',
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontFamily: fonts.bold }} className="text-[#666666] text-sm mr-1">
                  View All
                </Text>
                <MaterialIcons name="north-east" size={16} color="#666666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={{ paddingRight: 16 }}
              className="gap-4 mb-3"
            >
              {(followingLoading || liveStreamsLoading) ? (
                // Loading state
                <View className="flex-row">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <View key={index} className="relative mr-4">
                      <View className="w-16 h-16 rounded-full bg-gray-700 animate-pulse border-2 border-[#C42720]" />
                      <View className="absolute bottom-[-4px] self-center bg-gray-600 px-2 py-0.5 rounded-lg">
                        <View className="w-8 h-2 bg-gray-500 rounded" />
                      </View>
                    </View>
                  ))}
                </View>
              ) : (() => {
                // Show all followed users, not just live ones
                // Use safeFollowingUsers to avoid stale data when auth fails
                const allFollowers = safeFollowingUsers;
                
                if (allFollowers.length === 0) {
                  return null; // Don't render inside ScrollView, handle below
                }

                return allFollowers.map((user) => (
                  <TouchableOpacity 
                    key={user.id} 
                    className="relative mr-4"
                    onPress={() => navigateToProfile(user.id)}
                  >
                    <View className="relative">
                      <Image
                        source={{ 
                          uri: user.profile_picture_url 
                            ? (user.profile_picture_url.startsWith('http') 
                                ? user.profile_picture_url 
                                : `${baseURL}${user.profile_picture_url}`)
                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username)}&background=C42720&color=fff&size=100`
                        }}
                        className={`w-16 h-16 rounded-full border-2 ${user.is_live ? 'border-[#C42720]' : 'border-gray-600'}`}
                      />
                      {/* Live indicator with pulse animation - only show if user is live */}
                      {user.is_live && (
                        <View className="absolute top-[-2px] right-[-2px] w-6 h-6 bg-[#C42720] rounded-full items-center justify-center">
                          <View className="w-2 h-2 bg-white rounded-full" />
                          <View className="absolute w-6 h-6 bg-[#C42720] rounded-full animate-pulse opacity-50" />
                        </View>
                      )}
                      {/* Live badge at bottom - only show if user is live */}
                      {user.is_live && (
                        <View className="absolute bottom-[-4px] self-center bg-[#C42720] px-2 py-0.5 rounded-lg shadow-lg">
                          <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-[10px]">
                            LIVE
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ));
              })()}
            </ScrollView>
            
            {/* Empty state for Following - positioned outside ScrollView for proper centering */}
            {!followingLoading && !liveStreamsLoading && safeFollowingUsers.length === 0 && (
              <View className="w-full items-center justify-center py-12">
                <View className="items-center">
                  <View className="w-20 h-20 rounded-full bg-gradient-to-br from-red-600 to-red-800 items-center justify-center mb-4 opacity-60">
                    <MaterialIcons name="people-outline" size={32} color="white" />
                  </View>
                  <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-base mb-2 text-center">
                    No Following Yet
                  </Text>
                  <Text style={{ fontFamily: fonts.regular }} className="text-gray-400 text-sm text-center leading-5">
                    {followingError 
                      ? "Please log in to see the people you follow."
                      : "Start following people to see them here.\nTap 'View All' to discover users to follow!"
                    }
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Popular Channels */}
          <View className="mb-8">{/* Add bottom margin */}
            <View className="flex-row justify-between items-center mb-4">
              <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-lg">
                {selectedCategory === 'All' ? 'Popular Channels' : `${selectedCategory} Streams`}
              </Text>
              <TouchableOpacity 
                onPress={() => router.push('/popular-channels')}
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center',
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontFamily: fonts.extraBold }} className="text-[#666666] text-sm mr-1">
                  View All
                </Text>
                <MaterialIcons name="north-east" size={16} color="#666666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={{ paddingRight: 16 }}
              className="gap-3"
            >
              {popularLoading ? (
                // Loading state
                Array.from({ length: 2 }).map((_, index) => (
                  <View 
                    key={index}
                    className="w-56 h-80 rounded-xl overflow-hidden bg-[#1C1C1E] mr-3"
                  >
                    <View className="relative flex-1 bg-gray-600" />
                  </View>
                ))
              ) : filteredStreams.length === 0 ? (
                null // Don't render inside ScrollView, handle below
              ) : (
                // Live streams data using StreamCard component
                filteredStreams.slice(0, 8).map((stream) => (
                  <StreamCard
                    key={stream.id}
                    id={stream.id}
                    title={stream.title}
                    host={stream.host}
                    channel={stream.channel}
                    viewer_count={stream.viewer_count}
                    status={stream.status}
                    baseURL={baseURL}
                    width="w-56"
                    height="h-80"
                    margin="mr-3"
                  />
                ))
              )}
            </ScrollView>
            
            {/* Empty state for Popular Channels - positioned outside ScrollView for proper centering */}
            {!popularLoading && filteredStreams.length === 0 && (
              <View className="w-full items-center justify-center py-12">
                <View className="items-center">
                  <View className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 items-center justify-center mb-4 opacity-60">
                    <MaterialIcons name="live-tv" size={32} color="white" />
                  </View>
                  <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-base mb-2 text-center">
                    {selectedCategory === 'All' 
                      ? 'No Live Streams' 
                      : `No ${selectedCategory} Streams`
                    }
                  </Text>
                  <Text style={{ fontFamily: fonts.regular }} className="text-gray-400 text-sm text-center leading-5">
                    {selectedCategory === 'All' 
                      ? 'No streamers are currently live.\nCheck back later for amazing content!'
                      : `No ${selectedCategory.toLowerCase()} streams are live right now.\nTry a different category or come back later!`
                    }
                  </Text>
                </View>
              </View>
              )}
            </View>
            </>
          )}
        </View>
      </ScrollView>
      </TouchableWithoutFeedback>

      {/* 🏆 PROFESSIONAL ACCESS CONTROL MODAL */}
      {accessModal.visible && accessModal.channelInfo && (
        <ChannelAccessModal
          visible={accessModal.visible}
          onClose={closeAccessModal}
          channelName={accessModal.channelInfo.channelName}
          channelCode={accessModal.channelInfo.channelCode}
          requiredTier={accessModal.channelInfo.requiredTier || 'Premium'}
          coinsNeeded={accessModal.channelInfo.coinsNeeded || 0}
          currentCoins={currentCoins}
          unlockMessage={accessModal.channelInfo.unlockMessage || 'Upgrade required to access this channel'}
        />
      )}
    </SafeAreaView>
  );
}
