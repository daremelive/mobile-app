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
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { fonts } from '../../../constants/Fonts';
import { router } from 'expo-router';
import SearchInput from '../../../components/SearchInput';
import { useGetFollowingQuery } from '../../../src/store/followApi';
import { useGetStreamsQuery, useGetFollowingLiveStreamsQuery, useSearchQuery } from '../../../src/store/streamsApi';
import { useFollowUserMutation, useUnfollowUserMutation } from '../../../src/store/followApi';
import { useNotificationContext } from '../../../src/context/NotificationContext';
import ClockIcon from '../../../assets/icons/clock.svg';
import CancelIcon from '../../../assets/icons/cancel.svg';
import StarsIcon from '../../../assets/icons/stars.svg';
import CheckIcon from '../../../assets/icons/check.svg';
import EyeIcon from '../../../assets/icons/eye.svg';
import ipDetector from '../../../src/utils/ipDetector';

const categories = ['All', 'Video', 'Game', 'Truth/Dare', 'Banter'];
const SEARCH_SUGGESTIONS = ['Marriage', 'Banter with Friends', 'Live Gaming', 'World Politics', 'Hot Gist'];

// Search Suggestions Component
const SearchSuggestions = React.memo(({ 
  query, 
  onSelectSuggestion, 
  recentSearches,
  onRemoveRecent
}: {
  query: string;
  onSelectSuggestion: (suggestion: string) => void;
  recentSearches: string[];
  onRemoveRecent: (index: number) => void;
}) => {
  if (!query) return null;

  const filteredRecents = recentSearches.filter(s => s.toLowerCase().includes(query.toLowerCase()));
  const filteredRecommended = SEARCH_SUGGESTIONS.filter(s => s.toLowerCase().includes(query.toLowerCase()));

  return (
    <View className="absolute top-full left-0 right-0 bg-black border border-gray-700 rounded-lg mt-2 max-h-80 z-50">
      <ScrollView keyboardShouldPersistTaps="handled">
        {filteredRecents.length > 0 && (
          <View>
            <Text style={{ fontFamily: fonts.semiBold }} className="text-[#757688] text-sm mb-2 mt-3 mx-4">Recents</Text>
            {filteredRecents.map((item, index) => (
              <View key={`recent-${index}`} className="flex-row items-center justify-between py-2 px-4">
                <TouchableOpacity onPress={() => onSelectSuggestion(item)} className="flex-row items-center flex-1">
                  <View className="w-8 h-8 rounded-full border border-gray-600 items-center justify-center mr-3">
                    <ClockIcon width={16} height={16} />
                  </View>
                  <Text style={{ fontFamily: fonts.regular }} className="text-white text-sm">{item}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onRemoveRecent(index)} className="p-1">
                  <CancelIcon width={16} height={16} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        {filteredRecommended.length > 0 && (
          <View>
            <Text style={{ fontFamily: fonts.semiBold }} className="text-[#757688] text-sm mb-2 mt-4 mx-4">Recommended</Text>
            {filteredRecommended.map((item, index) => (
              <TouchableOpacity 
                onPress={() => onSelectSuggestion(item)} 
                key={`rec-${index}`} 
                className="flex-row items-center py-2 px-4"
              >
                <View className="w-8 h-8 rounded-full border border-gray-600 items-center justify-center mr-3">
                  <StarsIcon width={16} height={16} />
                </View>
                <Text style={{ fontFamily: fonts.regular }} className="text-white text-sm">{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
});

// User Search Result Component
const UserSearchResult = ({ user, onFollowChange, baseURL }: { 
  user: any, 
  onFollowChange?: () => void,
  baseURL: string
}) => {
  const [isFollowing, setIsFollowing] = React.useState(user.is_following);
  const [followUser, { isLoading: isFollowingLoading }] = useFollowUserMutation();
  const [unfollowUser, { isLoading: isUnfollowingLoading }] = useUnfollowUserMutation();
  
  const formatFollowerCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const handleFollowToggle = async () => {
    try {
      if (isFollowing) {
        await unfollowUser({ user_id: user.id }).unwrap();
        setIsFollowing(false);
      } else {
        await followUser({ user_id: user.id }).unwrap();
        setIsFollowing(true);
      }
      onFollowChange?.();
    } catch (error: any) {
      Alert.alert('Error', error.data?.message || 'Failed to update follow status');
    }
  };

  const handleUserPress = () => {
    router.push({
      pathname: '/user-profile',
      params: { userId: user.id.toString() }
    });
  };

  return (
    <View className="flex-row items-center justify-between py-3">
      <TouchableOpacity 
        className="flex-row items-center flex-1"
        onPress={handleUserPress}
      >
        <Image 
          source={{ 
            uri: user.profile_picture_url 
              ? (user.profile_picture_url.startsWith('http') 
                  ? user.profile_picture_url 
                  : `${baseURL}${user.profile_picture_url}`)
              : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username)}&background=C42720&color=fff&size=100`
          }} 
          className="w-12 h-12 rounded-full mr-3" 
        />
        <View>
          <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-base">
            {user.full_name || user.username}
          </Text>
          <Text style={{ fontFamily: fonts.regular }} className="text-gray-400 text-sm">
            {formatFollowerCount(user.follower_count || 0)} followers
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity 
        className={`px-4 h-8 rounded-full flex-row items-center justify-center ${isFollowing ? 'bg-[#330000]' : 'bg-red-600'}`}
        onPress={handleFollowToggle}
        disabled={isFollowingLoading || isUnfollowingLoading}
      >
        {(isFollowingLoading || isUnfollowingLoading) ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <>
            {isFollowing && <CheckIcon width={12} height={12} className="mr-1" stroke="white" />}
            <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-xs">
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

// Stream Search Result Component
const StreamSearchResult = ({ stream, onJoinStream, baseURL }: { 
  stream: any;
  onJoinStream: (streamId: string, streamTitle: string, hostUsername: string) => void;
  baseURL: string;
}) => {
  const formatViewerCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <TouchableOpacity
      className="w-[48%] h-[200px] rounded-xl overflow-hidden bg-[#1C1C1E] mb-4"
      onPress={() => onJoinStream(stream.id, stream.title, stream.host.username)}
    >
      <View className="relative flex-1">
        <Image
          source={{ 
            uri: stream.host.profile_picture_url 
              ? (stream.host.profile_picture_url.startsWith('http') 
                  ? stream.host.profile_picture_url 
                  : `${baseURL}${stream.host.profile_picture_url}`)
              : `https://ui-avatars.com/api/?name=${encodeURIComponent(`${stream.host.first_name || ''} ${stream.host.last_name || ''}`).trim() || stream.host.username}&background=C42720&color=fff&size=400`
          }}
          className="w-full h-full"
        />
        <View className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded-full">
          <Text style={{ fontFamily: fonts.regular }} className="text-white text-xs">
            {formatViewerCount(stream.viewer_count || 0)}
          </Text>
        </View>
        <BlurView
          intensity={30}
          tint="dark"
          className="absolute bottom-0 left-0 right-0 px-3 py-3 bg-black/30"
        >
          <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-sm mb-2" numberOfLines={2}>
            {stream.title}
          </Text>
          <Text style={{ fontFamily: fonts.regular }} className="text-gray-400 text-xs">
            @{stream.host.username}
          </Text>
        </BlurView>
      </View>
    </TouchableOpacity>
  );
};

// Search Results Component
const SearchResults = React.memo(({ query, onJoinStream, baseURL }: { 
  query: string;
  onJoinStream: (streamId: string, streamTitle: string, hostUsername: string) => void;
  baseURL: string;
}) => {
  const { data: searchResults, isLoading, error, refetch } = useSearchQuery(query || '', {
    skip: !query || query.trim().length === 0,
  });

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center py-12">
        <ActivityIndicator size="large" color="#C42720" />
        <Text style={{ fontFamily: fonts.regular }} className="text-gray-400 mt-2">
          Searching...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center py-12">
        <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-lg mb-2">
          Search Error
        </Text>
        <Text style={{ fontFamily: fonts.regular }} className="text-gray-400 text-center">
          Unable to search at the moment. Please try again.
        </Text>
      </View>
    );
  }

  if (!searchResults || searchResults.total_results === 0) {
    return (
      <View className="flex-1 justify-center items-center py-12">
        <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-lg mb-2">
          No Results Found
        </Text>
        <Text style={{ fontFamily: fonts.regular }} className="text-gray-400 text-center">
          Try searching with different keywords.
        </Text>
      </View>
    );
  }

  const { streams = [], users = [] } = searchResults.results;

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {users.length > 0 && (
        <View className="mb-6">
          <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-lg mb-4">
            Users
          </Text>
          {users.slice(0, 3).map((user) => (
            <UserSearchResult key={user.id} user={user} onFollowChange={refetch} baseURL={baseURL} />
          ))}
        </View>
      )}
      {streams.length > 0 && (
        <View className="mb-6">
          <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-lg mb-4">
            Live Streams
          </Text>
          <View className="flex-row flex-wrap justify-between">
            {streams.map((stream) => (
              <StreamSearchResult key={stream.id} stream={stream} onJoinStream={onJoinStream} baseURL={baseURL} />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
});

export default function HomeScreen() {
  const [isSearching, setIsSearching] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState('All');
  const [searchState, setSearchState] = React.useState({
    query: '',
    submitted: false,
    showSuggestions: false
  });
  const [recentSearches, setRecentSearches] = React.useState([
    'Marriage Sacrifices', 
    'Dating Life', 
    'How to cook', 
    'Gaming in SA', 
    'Mr & Mrs Kola'
  ]);
  
  const searchInputRef = React.useRef(null);
  const [baseURL, setBaseURL] = React.useState<string>('');

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
  
  // Get live streams from following users
  const { data: followingLiveStreamsData, isLoading: liveStreamsLoading } = useGetFollowingLiveStreamsQuery();
  
  // Ensure followingLiveStreams is always an array
  const followingLiveStreams = Array.isArray(followingLiveStreamsData?.results) ? followingLiveStreamsData.results : [];

  // Debug logging
  React.useEffect(() => {
    console.log('🔍 DEBUG Following Users:', followingUsers);
    console.log('🔍 DEBUG Following Error:', followingError);
    console.log('🔍 DEBUG Live Streams:', followingLiveStreams);
    console.log('🔍 DEBUG Following Users with is_live=true:', followingUsers.filter(user => user.is_live));
  }, [followingUsers, followingLiveStreams, followingError]);

  // If there's an authentication error, clear following users to avoid stale data
  const safeFollowingUsers = followingError ? [] : followingUsers;
  
  // Get popular/trending streams with aggressive polling to avoid stale data
  const { data: popularStreamsData, isLoading: popularLoading, refetch: refetchPopular } = useGetStreamsQuery({ 
    status: 'live',
    channel: selectedCategory === 'All' ? undefined : selectedCategory.toLowerCase().replace('truth/dare', 'truth-or-dare')
  }, {
    pollingInterval: 0, // Disabled to prevent screen blinking
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  
  // Real-time notification stats
  const { stats: notificationStats, isConnected: notificationConnected } = useNotificationContext();
  
  // Ensure popularStreams is always an array
  const popularStreams = Array.isArray(popularStreamsData?.results) ? popularStreamsData.results : [];

  // Since we're filtering at the API level, we can use popularStreams directly
  const filteredStreams = popularStreams;

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
    setSearchState(prev => ({ ...prev, showSuggestions: true }));
  }, []);

  const handleSearchBlur = React.useCallback(() => {
    // Delay hiding to allow suggestion selection
    setTimeout(() => {
      setIsSearching(false);
      setSearchState(prev => ({ ...prev, showSuggestions: false }));
    }, 200);
  }, []);

  const handleSearchChange = React.useCallback((query: string) => {
    setSearchState(prev => ({
      ...prev,
      query,
      submitted: false,
      showSuggestions: query.length > 0
    }));
  }, []);

  const handleSearchSubmit = React.useCallback((query: string) => {
    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      // Add to recent searches
      setRecentSearches(prev => {
        if (!prev.includes(trimmedQuery)) {
          return [trimmedQuery, ...prev.slice(0, 4)]; // Keep only 5 recent searches
        }
        return prev;
      });
      
      setSearchState({
        query: trimmedQuery,
        submitted: true,
        showSuggestions: false
      });
    }
  }, []);

  const handleSelectSuggestion = React.useCallback((suggestion: string) => {
    setSearchState({
      query: suggestion,
      submitted: true,
      showSuggestions: false
    });
    
    // Add to recent searches
    setRecentSearches(prev => {
      if (!prev.includes(suggestion)) {
        return [suggestion, ...prev.slice(0, 4)];
      }
      return prev;
    });
  }, []);

  const handleRemoveRecent = React.useCallback((index: number) => {
    setRecentSearches(prev => prev.filter((_, i) => i !== index));
  }, []);

  const dismissKeyboard = React.useCallback(() => {
    Keyboard.dismiss();
    if (searchInputRef.current?.blur) {
      searchInputRef.current.blur();
    }
    setIsSearching(false);
    setSearchState(prev => ({ ...prev, showSuggestions: false }));
  }, []);

  const handleClearSearch = React.useCallback(() => {
    setSearchState({
      query: '',
      submitted: false,
      showSuggestions: false
    });
    setIsSearching(false);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <ScrollView scrollEnabled={!isSearching && !searchState.showSuggestions}>
        <View className="p-4">
          {/* Header */}
          <View className="mb-6 flex-row items-center justify-between">
            <View className="flex-1">
              <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-2xl mb-1">
                Connect with your
              </Text>
              <Text style={{ fontFamily: fonts.bold }} className="text-[#C42720] text-2xl">
                Favorite Streamers!
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

          {/* Search Bar */}
          <View className="mb-6 relative" style={{ zIndex: 2 }}>
            <SearchInput
              ref={searchInputRef}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              placeholder="Search for streamers, content..."
              onSearchSubmit={handleSearchSubmit}
              initialQuery={searchState.query}
              showSuggestions={false} // We'll handle suggestions manually
              onSearchChange={handleSearchChange}
            />
            {searchState.showSuggestions && (
              <SearchSuggestions
                query={searchState.query}
                onSelectSuggestion={handleSelectSuggestion}
                recentSearches={recentSearches}
                onRemoveRecent={handleRemoveRecent}
              />
            )}
          </View>

            {/* Main Content */}
            {searchState.submitted && searchState.query ? (
              /* Search Results */
              <View className="flex-1">
                <View className="flex-row items-center justify-between mb-4">
                  <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-lg">
                    Search Results for "{searchState.query}"
                  </Text>
                  <TouchableOpacity 
                    onPress={handleClearSearch}
                    className="px-3 py-1 bg-gray-800 rounded-full"
                  >
                    <Text style={{ fontFamily: fonts.regular }} className="text-gray-400 text-sm">
                      Clear
                    </Text>
                  </TouchableOpacity>
                </View>
                <SearchResults query={searchState.query} onJoinStream={handleJoinStream} baseURL={baseURL} />
              </View>
            ) : !isSearching ? (
              /* Normal Home Content */
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

          {/* Live Following Section */}
          <View className="mb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-lg">
                Live Following
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
                // Filter to only show followers who are currently live streaming
                // Use safeFollowingUsers to avoid stale data when auth fails
                const liveFollowers = safeFollowingUsers.filter(user => user.is_live);
                
                if (liveFollowers.length === 0) {
                  return null; // Don't render inside ScrollView, handle below
                }

                return liveFollowers.map((user) => (
                  <TouchableOpacity 
                    key={user.id} 
                    className="relative mr-4"
                    onPress={() => {
                      // Find the user's live stream
                      const userStream = followingLiveStreams.find(stream => stream.host.id === user.id);
                      if (userStream) {
                        handleJoinStream(userStream.id, userStream.title, user.username);
                      } else {
                        Alert.alert('Stream Unavailable', 'This stream is no longer available or has ended.');
                      }
                    }}
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
                        className="w-16 h-16 rounded-full border-2 border-[#C42720]"
                      />
                      {/* Live indicator with pulse animation */}
                      <View className="absolute top-[-2px] right-[-2px] w-6 h-6 bg-[#C42720] rounded-full items-center justify-center">
                        <View className="w-2 h-2 bg-white rounded-full" />
                        <View className="absolute w-6 h-6 bg-[#C42720] rounded-full animate-pulse opacity-50" />
                      </View>
                      {/* Live badge at bottom */}
                      <View className="absolute bottom-[-4px] self-center bg-[#C42720] px-2 py-0.5 rounded-lg shadow-lg">
                        <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-[10px]">
                          LIVE
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ));
              })()}
            </ScrollView>
            
            {/* Empty state for Live Following - positioned outside ScrollView for proper centering */}
            {!followingLoading && !liveStreamsLoading && safeFollowingUsers.filter(user => user.is_live).length === 0 && (
              <View className="w-full items-center justify-center py-12">
                <View className="items-center">
                  <View className="w-20 h-20 rounded-full bg-gradient-to-br from-red-600 to-red-800 items-center justify-center mb-4 opacity-60">
                    <MaterialIcons name="videocam-off" size={32} color="white" />
                  </View>
                  <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-base mb-2 text-center">
                    No Live Streams
                  </Text>
                  <Text style={{ fontFamily: fonts.regular }} className="text-gray-400 text-sm text-center leading-5">
                    {followingError 
                      ? "Please log in to see your friends' live streams."
                      : "None of your friends are streaming right now.\nCheck back later for live content!"
                    }
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Popular Channels */}
          <View>
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
                // Live streams data
                filteredStreams.slice(0, 8).map((stream) => (
                  <TouchableOpacity
                    key={stream.id}
                    className="w-56 h-80 rounded-xl overflow-hidden bg-[#1C1C1E] mr-3"
                    onPress={() => handleJoinStream(stream.id, stream.title, stream.host.username)}
                  >
                    <View className="relative flex-1">
                      <Image
                        source={{ 
                          uri: stream.host.profile_picture_url 
                            ? (stream.host.profile_picture_url.startsWith('http') 
                                ? stream.host.profile_picture_url 
                                : `${baseURL}${stream.host.profile_picture_url}`)
                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(`${stream.host.first_name || ''} ${stream.host.last_name || ''}`).trim() || stream.host.username}&background=C42720&color=fff&size=400`
                        }}
                        className="w-full h-full"
                      />
                      <View className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded-full flex-row items-center gap-1">
                        <EyeIcon width={16} height={16} stroke="#FFFFFF" className="mr-1.5" />
                        <Text style={{ fontFamily: fonts.regular }} className="text-white text-xs">
                          {stream.viewer_count || '0'}
                        </Text>
                      </View>
                      <BlurView
                        intensity={30}
                        tint="dark"
                        className="absolute bottom-0 left-0 right-0 px-4 py-4 bg-black/30"
                      >
                        <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-base mb-2" numberOfLines={2}>
                          {stream.title}
                        </Text>
                        <Text style={{ fontFamily: fonts.regular }} className="text-gray-400 text-sm">
                          @{stream.host.username}
                        </Text>
                      </BlurView>
                    </View>
                  </TouchableOpacity>
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
            ) : null}
        </View>
      </ScrollView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}
