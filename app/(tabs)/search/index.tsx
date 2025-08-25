import React from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import ClockIcon from '../../../assets/icons/clock.svg';
import CancelIcon from '../../../assets/icons/cancel.svg';
import StarsIcon from '../../../assets/icons/stars.svg';
import { fonts } from '../../../constants/Fonts';
import SearchInput from '../../../components/SearchInput';
import EyeIcon from '../../../assets/icons/eye.svg';
import CheckIcon from '../../../assets/icons/check.svg';
import { useSearchQuery, SearchUser, SearchStream } from '../../../src/store/streamsApi';
import { useFollowUserMutation, useUnfollowUserMutation } from '../../../src/store/followApi';
import StreamCard from '../../../components/stream/StreamCard';
import ipDetector from '../../../src/utils/ipDetector';

const MOCK_RECOMMENDED = ['Marriage', 'Banter with Friends', 'Live Gaming', 'World Politics', 'Hot Gist'];

interface SearchSuggestionsProps {
  query?: string;
  onSelectSuggestion?: (suggestion: string) => void;
  recentSearches: string[];
  onRemoveRecent: (index: number) => void;
}

const SearchSuggestions = React.memo(({ 
  query = '', 
  onSelectSuggestion = () => {}, 
  recentSearches,
  onRemoveRecent
}: SearchSuggestionsProps) => {
  if (!query) return null;

  const filteredRecents = recentSearches?.filter(s => s.toLowerCase().includes(query.toLowerCase())) || [];
  const filteredRecommended = MOCK_RECOMMENDED?.filter(s => s.toLowerCase().includes(query.toLowerCase())) || [];

  return (
    <ScrollView className="px-0" keyboardShouldPersistTaps="handled">
      {filteredRecents.length > 0 && (
        <View>
          <Text style={{ fontFamily: fonts.semiBold }} className="text-[#757688] text-md mb-1 mt-4 ml-4">Recents</Text>
          {filteredRecents.map((item, index) => (
            <View key={`recent-${index}`} className="flex-row items-center justify-between py-2 px-4">
              <TouchableOpacity onPress={() => onSelectSuggestion(item)} className="flex-row items-center flex-1">
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: '#353638',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16,
                  }}
                >
                  <ClockIcon width={22} height={22} />
                </View>
                <Text style={{ fontFamily: fonts.regular }} className="text-white text-base">{item}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onRemoveRecent(index)}>
                <CancelIcon width={20} height={20} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      {filteredRecommended.length > 0 && (
        <View>
          <Text style={{ fontFamily: fonts.semiBold }} className="text-[#757688] text-md mb-1 mt-6 ml-4">Recommended</Text>
          {filteredRecommended.map((item, index) => (
            <TouchableOpacity onPress={() => onSelectSuggestion(item)} key={`rec-${index}`} className="flex-row items-center py-2 px-4">
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  borderWidth: 2,
                  borderColor: '#353638',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 16,
                }}
              >
                <StarsIcon width={22} height={22} />
              </View>
              <Text style={{ fontFamily: fonts.regular }} className="text-white text-base">{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
});

const UserResult = ({ user, onFollowChange }: { user: SearchUser, onFollowChange?: () => void }) => {
    const router = useRouter();
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
                const result = await unfollowUser({ user_id: user.id }).unwrap();
                setIsFollowing(false);
                console.log('Unfollow result:', result);
            } else {
                const result = await followUser({ user_id: user.id }).unwrap();
                setIsFollowing(true);
                console.log('Follow result:', result);
            }
            // Trigger parent refetch if callback is provided
            onFollowChange?.();
        } catch (error: any) {
            console.error('Follow/Unfollow error:', error);
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
                                : `http://172.20.10.2:8000${user.profile_picture_url}`)
                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username)}&background=C42720&color=fff&size=100`
                    }} 
                    className="w-12 h-12 rounded-full mr-4" 
                />
                <View>
                    <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-base">
                        {user.full_name}
                    </Text>
                    <Text style={{ fontFamily: fonts.regular }} className="text-gray-400 text-sm">
                        {formatFollowerCount(user.follower_count)} followers
                    </Text>
                </View>
            </TouchableOpacity>
            <TouchableOpacity 
                className={`w-[110px] h-10 rounded-full flex-row items-center justify-center ${isFollowing ? 'bg-[#330000]' : 'bg-red-600'}`}
                onPress={handleFollowToggle}
                disabled={isFollowingLoading || isUnfollowingLoading}
            >
                {(isFollowingLoading || isUnfollowingLoading) ? (
                    <ActivityIndicator size="small" color="white" />
                ) : (
                    <>
                        {isFollowing && <CheckIcon width={16} height={16} className="mr-2" stroke="white" />}
                        <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-sm">
                            {isFollowing ? 'Following' : 'Follow'}
                        </Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    )
}

const SearchResults = React.memo(({ query }: { query?: string }) => {
  const [activeTab, setActiveTab] = React.useState('Top');
  const [baseURL, setBaseURL] = React.useState<string>('');

  // Initialize base URL with IP detection
  React.useEffect(() => {
    const initializeBaseURL = async () => {
      try {
        const detection = await ipDetector.detectIP();
        let url;
        // Check if it's production domain or local IP
        if (detection.ip === 'daremelive.pythonanywhere.com') {
          url = `https://${detection.ip}`;
        } else {
          url = `http://${detection.ip}:8000`;
        }
        setBaseURL(url);
        console.log('🔗 Search Base URL initialized:', url);
      } catch (error) {
        console.error('❌ Failed to detect IP in search:', error);
        setBaseURL('https://daremelive.pythonanywhere.com'); // Production fallback
      }
    };
    
    initializeBaseURL();
  }, []);  // Skip API call if no query
  const { data: searchResults, isLoading, error, refetch } = useSearchQuery(query || '', {
    skip: !query || query.trim().length === 0,
  });

  // Debug logging for search results
  React.useEffect(() => {
    if (searchResults) {
      console.log('🔍 Search Results Debug:', {
        query,
        totalResults: searchResults.total_results,
        streamsCount: searchResults.results?.streams?.length || 0,
        usersCount: searchResults.results?.users?.length || 0,
        streams: searchResults.results?.streams?.map(s => ({ title: s.title, status: s.status })) || []
      });
    }
  }, [searchResults, query]);    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#DC2626" />
                <Text style={{ fontFamily: fonts.regular }} className="text-gray-400 mt-2">
                    Searching...
                </Text>
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 justify-center items-center px-4">
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
            <View className="flex-1 justify-center items-center px-4">
                <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-lg mb-2">
                    No Results Found
                </Text>
                <Text style={{ fontFamily: fonts.regular }} className="text-gray-400 text-center">
                    Try searching with different keywords or check your spelling.
                </Text>
            </View>
        );
    }

    const { streams = [], users = [] } = searchResults.results;

    return (
        <View className="flex-1">
            <View className="flex-row justify-around my-4 w-[66%] mx-auto">
                {['Top', 'Streams', 'Users'].map(tab => (
                    <TouchableOpacity 
                        key={tab} 
                        className={`px-5 py-3 rounded-lg ${activeTab === tab ? 'bg-white' : 'bg-[#1C1C1E]'}`}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={{ fontFamily: fonts.bold }} className={`text-base ${activeTab === tab ? 'text-gray-900' : 'text-gray-400'}`}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <ScrollView contentContainerClassName="px-4 pb-24">
                {activeTab === 'Top' && (
                    <>
                        {users.slice(0, 2).map((user) => (
                            <UserResult key={user.id} user={user} onFollowChange={refetch} />
                        ))}
                        <View className="flex-row flex-wrap justify-between mt-4">
                            {streams.map((stream) => (
                                <StreamCard
                                    key={stream.id}
                                    id={stream.id}
                                    title={stream.title}
                                    host={stream.host}
                                    channel={stream.channel}
                                    viewer_count={stream.viewer_count}
                                    status={stream.status}
                                    baseURL={baseURL}
                                />
                            ))}
                        </View>
                    </>
                )}
                {activeTab === 'Streams' && (
                    <View className="flex-row flex-wrap justify-between mt-4">
                        {streams.map((stream) => (
                            <StreamCard
                                key={stream.id}
                                id={stream.id}
                                title={stream.title}
                                host={stream.host}
                                channel={stream.channel}
                                viewer_count={stream.viewer_count}
                                status={stream.status}
                                baseURL={baseURL}
                            />
                        ))}
                    </View>
                )}
                {activeTab === 'Users' && (
                    <View className="mt-4">
                        {users.map((user) => (
                            <UserResult key={user.id} user={user} onFollowChange={refetch} />
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
});

export default function SearchScreen() {
  const [searchState, setSearchState] = React.useState({
    query: '',
    submitted: false
  });

  const [recentSearches, setRecentSearches] = React.useState([
    'Marriage Sacrifices', 
    'Dating Life', 
    'How to cook', 
    'Gaming in SA', 
    'Mr & Mrs Kola'
  ]);

  const handleSearchSubmit = React.useCallback((query: string) => {
    setRecentSearches(prev => {
      if (!prev.includes(query)) {
        return [query, ...prev];
      }
      return prev;
    });
    
    setSearchState({
      query,
      submitted: true
    });
  }, []);

  const handleSearchChange = React.useCallback((query: string) => {
    setSearchState(prev => ({
      query,
      submitted: query.trim().length > 0 // Auto-submit for realtime search when query has content
    }));
    
    // Clear recent searches from view when query becomes empty
    if (query.trim().length === 0) {
      setSearchState(prev => ({
        ...prev,
        submitted: false
      }));
    }
  }, []);

  const handleSelectSuggestion = React.useCallback((suggestion: string) => {
    setSearchState({
      query: suggestion,
      submitted: true
    });
  }, []);

  const handleRemoveRecent = React.useCallback((index: number) => {
    setRecentSearches(prev => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-black">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1">
          <View className="p-4">
            <SearchInput
              autoFocus
              initialQuery={searchState.query}
              onSearchSubmit={handleSearchSubmit}
              onSearchChange={handleSearchChange}
              enableRealtimeSearch={true}
              showSuggestions={!searchState.submitted}
            />
          </View>
          {searchState.submitted && searchState.query.trim().length > 0 ? (
            <SearchResults query={searchState.query} />
          ) : (
            <SearchSuggestions 
              query={searchState.query} 
              onSelectSuggestion={handleSelectSuggestion}
              recentSearches={recentSearches}
              onRemoveRecent={handleRemoveRecent}
            />
          )}
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
} 