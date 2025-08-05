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
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { fonts } from '../../../constants/Fonts';
import { router } from 'expo-router';
import SearchInput from '../../../components/SearchInput';
import { useGetFollowingQuery } from '../../../src/store/followApi';
import { useGetStreamsQuery, useGetFollowingLiveStreamsQuery } from '../../../src/store/streamsApi';

const categories = ['All', 'Video', 'Game', 'Truth/Dare', 'Banter'];

export default function HomeScreen() {
  const [isSearching, setIsSearching] = React.useState(false);
  const searchInputRef = React.useRef(null);

  // Get following users with live status
  const { data: followingUsers = [], isLoading: followingLoading } = useGetFollowingQuery({ search: '' });
  
  // Get live streams from following users
  const { data: followingLiveStreamsData, isLoading: liveStreamsLoading } = useGetFollowingLiveStreamsQuery();
  
  // Ensure followingLiveStreams is always an array
  const followingLiveStreams = Array.isArray(followingLiveStreamsData?.results) ? followingLiveStreamsData.results : [];
  
  // Get popular/trending streams with aggressive polling to avoid stale data
  const { data: popularStreamsData, isLoading: popularLoading, refetch: refetchPopular } = useGetStreamsQuery({ 
    status: 'live' 
  }, {
    pollingInterval: 30000, // Poll every 30 seconds to ensure live streams are current
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  
  // Ensure popularStreams is always an array
  const popularStreams = Array.isArray(popularStreamsData?.results) ? popularStreamsData.results : [];

  const handleJoinStream = (streamId: string, streamTitle: string, hostUsername: string) => {
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

  const handleSearchFocus = React.useCallback(() => {
    setIsSearching(true);
  }, []);

  const handleSearchBlur = React.useCallback(() => {
    setIsSearching(false);
  }, []);

  const dismissKeyboard = React.useCallback(() => {
    Keyboard.dismiss();
    if (searchInputRef.current?.blur) {
      searchInputRef.current.blur();
    }
    setIsSearching(false);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <ScrollView scrollEnabled={!isSearching}>
        <View className="p-4">
          {/* Header */}
          <View className="mb-6">
            <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-2xl mb-1">
              Connect with your
            </Text>
            <Text style={{ fontFamily: fonts.bold }} className="text-[#C42720] text-2xl">
              Favorite Streamers!
            </Text>
          </View>

          {/* Search Bar */}
            <View className="mb-6" style={{ zIndex: 1 }}>
              <SearchInput
                ref={searchInputRef}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                placeholder="Search for a streamer"
            />
          </View>

            {/* Main Content */}
            {!isSearching && (
              <>
          {/* Categories */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8">
            {categories.map((category, index) => (
              <TouchableOpacity
                key={category}
                className={`px-4 py-2.5 rounded-lg mr-2 ${index === 0 ? 'bg-white' : 'bg-[#1C1C1E]'}`}
              >
                <Text style={{ fontFamily: fonts.bold }} className={`text-sm ${index === 0 ? 'text-black' : 'text-white'}`}>
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

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-4 mb-3">
              {followingLoading ? (
                // Loading state
                Array.from({ length: 5 }).map((_, index) => (
                  <View key={index} className="relative">
                    <View className="w-16 h-16 rounded-full bg-gray-600 border-2 border-[#C42720]" />
                  </View>
                ))
              ) : followingUsers.length === 0 ? (
                // Empty state
                <View className="flex-1 items-center justify-center py-4">
                  <Text className="text-gray-400 text-sm">
                    Follow some users to see them here!
                  </Text>
                </View>
              ) : (
                // Real following users data
                followingUsers.map((user) => (
                  <TouchableOpacity 
                    key={user.id} 
                    className="relative"
                    onPress={() => {
                      if (user.is_live) {
                        // Find the user's live stream
                        const userStream = followingLiveStreams.find(stream => stream.host.id === user.id);
                        if (userStream) {
                          handleJoinStream(userStream.id, userStream.title, user.username);
                        } else {
                          Alert.alert('Stream Not Found', 'This stream is no longer available.');
                        }
                      } else {
                        // Navigate to user profile
                        router.push({
                          pathname: '/profile',
                          params: { userId: user.id }
                        });
                      }
                    }}
                  >
                    <Image
                      source={{ 
                        uri: user.profile_picture_url ? 
                          `http://192.168.1.117:8000${user.profile_picture_url}` : 
                          `https://ui-avatars.com/api/?name=${user.full_name}&background=C42720&color=fff`
                      }}
                      className="w-16 h-16 rounded-full border-2 border-[#C42720]"
                    />
                    {user.is_live && (
                      <View className="absolute bottom-[-4px] self-center bg-[#C42720] px-2 py-0.5 rounded-lg">
                        <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-[10px]">
                          Live
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>

          {/* Popular Channels */}
          <View>
            <View className="flex-row justify-between items-center mb-4">
              <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-lg">
                Popular Channels
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

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
              {popularLoading ? (
                // Loading state
                Array.from({ length: 2 }).map((_, index) => (
                  <View 
                    key={index}
                    className="w-56 h-80 rounded-xl overflow-hidden bg-[#1C1C1E]"
                  >
                    <View className="relative flex-1 bg-gray-600" />
                  </View>
                ))
              ) : popularStreams.length === 0 ? (
                // Empty state
                <View className="flex-1 items-center justify-center py-8">
                  <Text className="text-gray-400 text-base">No live streams at the moment</Text>
                  <Text className="text-gray-500 text-sm mt-2">Check back later!</Text>
                </View>
              ) : (
                // Live streams data
                popularStreams.slice(0, 6).map((stream) => (
                  <TouchableOpacity
                    key={stream.id}
                    className="w-56 h-80 rounded-xl overflow-hidden bg-[#1C1C1E]"
                    onPress={() => handleJoinStream(stream.id, stream.title, stream.host.username)}
                  >
                    <View className="relative flex-1">
                      <Image
                        source={{ 
                          uri: stream.host.profile_picture_url ? 
                            `http://192.168.1.117:8000${stream.host.profile_picture_url}` : 
                            `https://ui-avatars.com/api/?name=${stream.host.first_name} ${stream.host.last_name}&background=C42720&color=fff&size=400`
                        }}
                        className="w-full h-full"
                      />
                      <View className="absolute top-2 left-2 bg-red-600 px-2 py-1 rounded-full flex-row items-center">
                        <View className="w-2 h-2 bg-white rounded-full mr-1" />
                        <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-xs">
                          LIVE
                        </Text>
                      </View>
                      <View className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded-full">
                        <Text style={{ fontFamily: fonts.regular }} className="text-white text-xs">
                          {stream.viewer_count || '0'}
                        </Text>
                      </View>
                      <BlurView
                        intensity={30}
                        tint="dark"
                        className="absolute bottom-0 left-0 right-0 p-3 bg-black/30"
                      >
                        <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-base mb-1" numberOfLines={2}>
                          {stream.title}
                        </Text>
                        <Text style={{ fontFamily: fonts.regular }} className="text-gray-400 text-sm">
                          @{stream.host.username}
                        </Text>
                        <Text style={{ fontFamily: fonts.regular }} className="text-gray-500 text-xs mt-1">
                          {stream.mode === 'multi' ? `Multi-Live • ${stream.max_seats} seats` : 'Single Live'} • {stream.channel.charAt(0).toUpperCase() + stream.channel.slice(1)}
                        </Text>
                      </BlurView>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
              </>
            )}
        </View>
      </ScrollView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}
