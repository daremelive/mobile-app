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
  AppState,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { fonts } from '../../../constants/Fonts';
import { router } from 'expo-router';
import UniversalSearch from '../../../components/UniversalSearch';
import { useGetFollowingQuery } from '../../../src/store/followApi';
import { useGetPopularStreamsQuery, useGetFollowingLiveStreamsQuery} from '../../../src/store/streamsApi';
import { useGetAllBlockedUsersQuery } from '../../../src/api/blockedApi';
import { useNotificationContext } from '../../../src/context/NotificationContext';
import { useTranslation } from '../../../src/hooks/useTranslation';
import { MEDIA_BASE_URL, buildProfilePictureURL, buildAvatarFallbackURL } from '../../../src/config/env';
import useChannelAccess from '../../../src/hooks/useChannelAccess';
import ChannelAccessModal from '../../../components/modals/ChannelAccessModal';
import StreamCard from '../../../components/stream/StreamCard';

const categories = ['All', 'Video', 'Game', 'Truth/Dare', 'Banter'];

export default function HomeScreen() {
  const { t, currentLanguage } = useTranslation();
  const [selectedCategory, setSelectedCategory] = React.useState('All');
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);
  
  const { requestChannelAccess, accessModal, closeAccessModal, currentCoins } = useChannelAccess();

  const { data: followingUsers = [], isLoading: followingLoading, error: followingError } = useGetFollowingQuery({ search: '' });
  
  const { data: blockedUsers = [] } = useGetAllBlockedUsersQuery(undefined, {
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
  });
  
  const filteredFollowingUsers = React.useMemo(() => {
    if (!followingUsers || !Array.isArray(followingUsers)) return [];
    
    const blockedUserIds = new Set((blockedUsers || []).map((blocked: any) => blocked.blocked_user.id));
    const filtered = followingUsers.filter(user => !blockedUserIds.has(user.id));
    
    return filtered;
  }, [followingUsers, blockedUsers]);
  
  const { data: followingLiveStreamsData, isLoading: liveStreamsLoading } = useGetFollowingLiveStreamsQuery();
  const followingLiveStreams = Array.isArray(followingLiveStreamsData) ? followingLiveStreamsData : [];
  const safeFollowingUsers = followingError ? [] : filteredFollowingUsers;
  
  const { data: popularStreamsData, isLoading: popularLoading, refetch: refetchPopular } = useGetPopularStreamsQuery(undefined, {
    pollingInterval: 30000,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  
  const { stats: notificationStats, isConnected: notificationConnected } = useNotificationContext();
  const popularStreams = Array.isArray(popularStreamsData) ? popularStreamsData : [];

  React.useEffect(() => {
    const handleAppStateChange = (nextAppState: any) => {
      if (nextAppState === 'active') {
        refetchPopular();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [refetchPopular]);

  useFocusEffect(
    React.useCallback(() => {
      refetchPopular();
    }, [refetchPopular])
  );

  const onRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetchPopular();
    } catch (error) {
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchPopular]);

  const filteredStreams = React.useMemo(() => {
    if (!popularStreams || popularStreams.length === 0) return [];
    
    if (selectedCategory === 'All') {
      return popularStreams;
    }
    
    const channelFilter = selectedCategory.toLowerCase().replace('truth/dare', 'truth-or-dare');
    return popularStreams.filter(stream => stream.channel === channelFilter);
  }, [popularStreams, selectedCategory]);

  const navigateToProfile = (userId: number) => {
    router.push({
      pathname: '/user-profile',
      params: { userId: userId.toString() }
    });
  };

  const handleJoinStream = (streamId: string, streamTitle: string, hostUsername: string, channel?: string) => {
    const streamChannel = channel || 'video';
    const hasAccess = requestChannelAccess(streamChannel);
    
    if (!hasAccess) {
      return;
    }

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
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
        <View className="p-4">
          <View className="mb-6 flex-row items-center justify-between">
            <View className="flex-1">
              <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-2xl mb-1">
                {t('home.connectWith', 'Connect with your') as string}
              </Text>
              <Text style={{ fontFamily: fonts.bold }} className="text-[#C42720] text-2xl">
                {t('home.favoriteStreamers', 'Favorite Streamers!') as string}
              </Text>
              <Text className="text-gray-400 text-xs mt-1">
                {t('common.language', 'Language') as string}: {currentLanguage}
              </Text>
            </View>
            
            <TouchableOpacity 
              onPress={() => router.push('/notification-inbox')}
              className="relative bg-gray-800 rounded-full p-3 ml-4"
            >
              <MaterialIcons name="notifications" size={24} color="#C42720" />
              
              <View className={`absolute top-1 left-1 w-2 h-2 rounded-full ${notificationConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
              
              {notificationStats && notificationStats.unread_notifications > 0 && (
                <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center">
                  <Text className="text-white text-xs font-bold">
                    {notificationStats.unread_notifications > 9 ? '9+' : notificationStats.unread_notifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <UniversalSearch
            mode="embedded"
            onJoinStream={handleJoinStream}
            baseURL={MEDIA_BASE_URL}
            placeholder="Search for streamers, content..."
            className="mb-6"
            onClose={() => setIsSearching(false)}
          />

          {!isSearching && (
            <>
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
                const allFollowers = safeFollowingUsers;
                
                if (allFollowers.length === 0) {
                  return null;
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
                            ? buildProfilePictureURL(user.profile_picture_url)
                            : buildAvatarFallbackURL(user.full_name || user.username)
                        }}
                        className={`w-16 h-16 rounded-full border-2 ${user.is_live ? 'border-[#C42720]' : 'border-gray-600'}`}
                      />
                      {user.is_live && (
                        <View className="absolute top-[-2px] right-[-2px] w-6 h-6 bg-[#C42720] rounded-full items-center justify-center">
                          <View className="w-2 h-2 bg-white rounded-full" />
                          <View className="absolute w-6 h-6 bg-[#C42720] rounded-full animate-pulse opacity-50" />
                        </View>
                      )}
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

          <View className="mb-8">
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
                Array.from({ length: 2 }).map((_, index) => (
                  <View 
                    key={index}
                    className="w-56 h-80 rounded-xl overflow-hidden bg-[#1C1C1E] mr-3"
                  >
                    <View className="relative flex-1 bg-gray-600" />
                  </View>
                ))
              ) : filteredStreams.length === 0 ? (
                null
              ) : (
                filteredStreams.slice(0, 8).map((stream) => (
                  <StreamCard
                    key={stream.id}
                    id={stream.id}
                    title={stream.title}
                    host={stream.host}
                    channel={stream.channel}
                    viewer_count={stream.viewer_count}
                    status={stream.status}
                    width="w-56"
                    height="h-80"
                    margin="mr-3"
                  />
                ))
              )}
            </ScrollView>
            
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
