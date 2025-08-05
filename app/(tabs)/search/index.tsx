import React from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import ClockIcon from '../../../assets/icons/clock.svg';
import CancelIcon from '../../../assets/icons/cancel.svg';
import StarsIcon from '../../../assets/icons/stars.svg';
import { fonts } from '../../../constants/Fonts';
import SearchInput from '../../../components/SearchInput';
import EyeIcon from '../../../assets/icons/eye.svg';
import CheckIcon from '../../../assets/icons/check.svg';
import { useSearchQuery, SearchUser, SearchStream } from '../../../src/store/streamsApi';

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

const UserResult = ({ user }: { user: SearchUser }) => {
    const [isFollowing, setIsFollowing] = React.useState(user.is_following);
    
    const formatFollowerCount = (count: number) => {
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
        return count.toString();
    };

    return (
        <View className="flex-row items-center justify-between py-3">
            <View className="flex-row items-center">
                <Image 
                    source={{ uri: user.profile_picture_url || 'https://via.placeholder.com/48' }} 
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
            </View>
            <TouchableOpacity 
                className={`w-[110px] h-10 rounded-full flex-row items-center justify-center ${isFollowing ? 'bg-[#330000]' : 'bg-red-600'}`}
                onPress={() => setIsFollowing(!isFollowing)}
            >
                {isFollowing && <CheckIcon width={16} height={16} className="mr-2" stroke="white" />}
                <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-sm">
                    {isFollowing ? 'Following' : 'Follow'}
                </Text>
            </TouchableOpacity>
        </View>
    )
}

const StreamResult = ({ stream }: { stream: SearchStream }) => {
    const formatViewerCount = (count: number) => {
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
        return count.toString();
    };

    return (
        <View className="w-[48%] h-[250px] rounded-xl overflow-hidden bg-[#1C1C1E] mb-4">
            <Image 
                source={{ uri: stream.host.profile_picture_url || 'https://via.placeholder.com/300x400' }} 
                className="w-full h-full" 
            />
            <View className="absolute bottom-0 left-0 right-0 p-3 bg-black/30">
                <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-base mb-1">
                    {stream.title}
                </Text>
                <Text style={{ fontFamily: fonts.regular }} className="text-gray-400 text-sm">
                    @{stream.host.username}
                </Text>
            </View>
            <View className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded-full flex-row items-center">
                <EyeIcon width={12} height={12} className="mr-1" stroke="white" />
                <Text style={{ fontFamily: fonts.regular }} className="text-white text-xs">
                    {formatViewerCount(stream.viewer_count)}
                </Text>
            </View>
            {stream.status === 'live' && (
                <View className="absolute top-2 left-2 bg-red-600 px-2 py-1 rounded-full">
                    <Text style={{ fontFamily: fonts.bold }} className="text-white text-xs">LIVE</Text>
                </View>
            )}
        </View>
    );
};

const SearchResults = React.memo(({ query }: { query?: string }) => {
    const [activeTab, setActiveTab] = React.useState('Top');
    
    // Skip API call if no query
    const { data: searchResults, isLoading, error } = useSearchQuery(query || '', {
        skip: !query || query.trim().length === 0,
    });

    if (isLoading) {
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
                            <UserResult key={user.id} user={user} />
                        ))}
                        <View className="flex-row flex-wrap justify-between mt-4">
                            {streams.map((stream) => (
                                <StreamResult key={stream.id} stream={stream} />
                            ))}
                        </View>
                    </>
                )}
                {activeTab === 'Streams' && (
                    <View className="flex-row flex-wrap justify-between mt-4">
                        {streams.map((stream) => (
                            <StreamResult key={stream.id} stream={stream} />
                        ))}
                    </View>
                )}
                {activeTab === 'Users' && (
                    <View className="mt-4">
                        {users.map((user) => (
                            <UserResult key={user.id} user={user} />
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
      submitted: false
    }));
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
      <View className="p-4">
        <SearchInput
          autoFocus
          initialQuery={searchState.query}
          onSearchSubmit={handleSearchSubmit}
          showSuggestions={!searchState.submitted}
        />
      </View>
      {searchState.submitted ? (
        <SearchResults query={searchState.query} />
      ) : (
        <SearchSuggestions 
          query={searchState.query} 
          onSelectSuggestion={handleSelectSuggestion}
          recentSearches={recentSearches}
          onRemoveRecent={handleRemoveRecent}
        />
      )}
    </SafeAreaView>
  );
} 