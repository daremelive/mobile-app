import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { fonts } from '../constants/Fonts';
import SearchInput from './SearchInput';
import ProfileAvatar from './ui/ProfileAvatar';
import StreamCard from './stream/StreamCard';
import ClockIcon from '../assets/icons/clock.svg';
import CancelIcon from '../assets/icons/cancel.svg';
import StarsIcon from '../assets/icons/stars.svg';
import CheckIcon from '../assets/icons/check.svg';
import {
  useSearchQuery,
  SearchUser,
  SearchStream
} from '../src/store/streamsApi';
import {
  useFollowUserMutation,
  useUnfollowUserMutation
} from '../src/store/followApi';
import { useGetAllBlockedUsersQuery } from '../src/api/blockedApi';

const SEARCH_SUGGESTIONS = ['Marriage', 'Banter with Friends', 'Live Gaming', 'World Politics', 'Hot Gist'];

interface UniversalSearchProps {
  mode?: 'embedded' | 'fullscreen'; // embedded for home, fullscreen for search page
  onJoinStream?: (streamId: string, streamTitle: string, hostUsername: string, channel?: string) => void;
  baseURL: string;
  showTabs?: boolean; // Show Top/Streams/Users tabs (for fullscreen mode)
  autoFocus?: boolean;
  placeholder?: string;
  onClose?: () => void; // For embedded mode to close search
  className?: string;
}

// Enhanced Search Suggestions Component
const SearchSuggestions = React.memo(({
  query,
  onSelectSuggestion,
  recentSearches,
  onRemoveRecent,
  mode = 'embedded'
}: {
  query: string;
  onSelectSuggestion: (suggestion: string) => void;
  recentSearches: string[];
  onRemoveRecent: (index: number) => void;
  mode?: 'embedded' | 'fullscreen';
}) => {
  if (!query) return null;

  const filteredRecents = recentSearches.filter(s => s.toLowerCase().includes(query.toLowerCase()));
  const filteredRecommended = SEARCH_SUGGESTIONS.filter(s => s.toLowerCase().includes(query.toLowerCase()));

  const containerClass = mode === 'embedded'
    ? "absolute top-full left-0 right-0 bg-black border border-gray-700 rounded-lg mt-2 max-h-80 z-50"
    : "px-0";

  return (
    <View className={containerClass}>
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
SearchSuggestions.displayName = 'SearchSuggestions';

// User Search Result Component
const UserSearchResult = ({
  user,
  onFollowChange,
  baseURL,
  mode = 'embedded'
}: {
  user: SearchUser;
  onFollowChange?: () => void;
  baseURL: string;
  mode?: 'embedded' | 'fullscreen';
}) => {
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

  const buttonSize = mode === 'fullscreen' ? 'w-[110px] h-10' : 'px-4 h-8';

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
        className={`${buttonSize} rounded-full flex-row items-center justify-center ${isFollowing ? 'bg-[#330000]' : 'bg-red-600'}`}
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

// Stream Search Result Component for embedded mode
const StreamSearchResult = ({
  stream,
  onJoinStream,
  baseURL
}: {
  stream: SearchStream;
  onJoinStream: (streamId: string, streamTitle: string, hostUsername: string, channel?: string) => void;
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
      onPress={() => onJoinStream(stream.id, stream.title, stream.host.username, stream.channel)}
    >
      <View className="relative flex-1">
        <ProfileAvatar
          profilePictureUrl={stream.host.profile_picture_url}
          username={stream.host.username}
          firstName={stream.host.first_name}
          lastName={stream.host.last_name}
          size="full"
          className=""
          baseURL={baseURL}
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

// Main Search Results Component
const SearchResults = React.memo(({
  query,
  onJoinStream,
  baseURL,
  mode = 'embedded',
  activeTab = 'Top',
  onTabChange
}: {
  query: string;
  onJoinStream?: (streamId: string, streamTitle: string, hostUsername: string, channel?: string) => void;
  baseURL: string;
  mode?: 'embedded' | 'fullscreen';
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}) => {
  const { data: searchResults, isLoading, error, refetch } = useSearchQuery(query || '', {
    skip: !query || query.trim().length === 0,
  });

  // Get blocked users to filter them out from search results
  const { data: blockedUsers = [] } = useGetAllBlockedUsersQuery(undefined, {
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
  });

  // Filter out blocked users from search results
  const filteredSearchResults = React.useMemo(() => {
    if (!searchResults || !searchResults.results) return searchResults;

    const blockedUserIds = new Set((blockedUsers || []).map((blocked: any) => blocked.blocked_user.id));

    const filteredUsers = (searchResults.results.users || []).filter(user => !blockedUserIds.has(user.id));

    return {
      ...searchResults,
      results: {
        ...searchResults.results,
        users: filteredUsers
      }
    };
  }, [searchResults, blockedUsers, mode]);

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

  if (!filteredSearchResults || filteredSearchResults.total_results === 0) {
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

  const { streams = [], users = [] } = filteredSearchResults.results;

  // Show tabs for fullscreen mode
  if (mode === 'fullscreen' && onTabChange) {
    return (
      <View className="flex-1">
        <View className="flex-row justify-around my-4 w-[66%] mx-auto">
          {['Top', 'Streams', 'Users'].map(tab => (
            <TouchableOpacity
              key={tab}
              className={`px-5 py-3 rounded-lg ${activeTab === tab ? 'bg-white' : 'bg-[#1C1C1E]'}`}
              onPress={() => onTabChange(tab)}
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
                <UserSearchResult key={user.id} user={user} onFollowChange={refetch} baseURL={baseURL} mode={mode} />
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
                />
              ))}
            </View>
          )}
          {activeTab === 'Users' && (
            <View className="mt-4">
              {users.map((user) => (
                <UserSearchResult key={user.id} user={user} onFollowChange={refetch} baseURL={baseURL} mode={mode} />
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // Embedded mode (for home screen)
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {users.length > 0 && (
        <View className="mb-6">
          <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-lg mb-4">
            Users
          </Text>
          {users.slice(0, 3).map((user) => (
            <UserSearchResult key={user.id} user={user} onFollowChange={refetch} baseURL={baseURL} mode={mode} />
          ))}
        </View>
      )}
      {streams.length > 0 && onJoinStream && (
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
SearchResults.displayName = 'SearchResults';

// Main Universal Search Component
const UniversalSearch: React.FC<UniversalSearchProps> = ({
  mode = 'embedded',
  onJoinStream,
  baseURL,
  showTabs = false,
  autoFocus = false,
  placeholder = "Search for streamers, content...",
  onClose,
  className = ""
}) => {
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
  const [activeTab, setActiveTab] = React.useState('Top');

  const handleSearchFocus = React.useCallback(() => {
    setSearchState(prev => ({
      ...prev,
      showSuggestions: prev.query.length > 0 && prev.query.trim().length === 0
    }));
  }, []);

  const handleSearchBlur = React.useCallback(() => {
    // Delay hiding to allow suggestion selection
    setTimeout(() => {
      setSearchState(prev => ({ ...prev, showSuggestions: false }));
    }, 200);
  }, []);

  const handleSearchChange = React.useCallback((query: string) => {
    setSearchState(prev => ({
      ...prev,
      query,
      submitted: query.trim().length > 0, // Auto-submit for realtime search when query has content
      showSuggestions: query.length > 0 && query.trim().length === 0 // Show suggestions only when there are characters but no meaningful content
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

  const handleClearSearch = React.useCallback(() => {
    setSearchState({
      query: '',
      submitted: false,
      showSuggestions: false
    });
    onClose?.();
  }, [onClose]);

  const dismissKeyboard = React.useCallback(() => {
    Keyboard.dismiss();
    setSearchState(prev => ({ ...prev, showSuggestions: false }));
  }, []);

  if (mode === 'fullscreen') {
    return (
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View className={`flex-1 ${className}`}>
          <View className="p-4">
            <SearchInput
              autoFocus={autoFocus}
              initialQuery={searchState.query}
              onSearchSubmit={handleSearchSubmit}
              onSearchChange={handleSearchChange}
              enableRealtimeSearch={true}
              placeholder={placeholder}
              showSuggestions={!searchState.submitted}
            />
          </View>
          {searchState.submitted && searchState.query.trim().length > 0 ? (
            <SearchResults
              query={searchState.query}
              onJoinStream={onJoinStream}
              baseURL={baseURL}
              mode={mode}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          ) : (
            <SearchSuggestions
              query={searchState.query}
              onSelectSuggestion={handleSelectSuggestion}
              recentSearches={recentSearches}
              onRemoveRecent={handleRemoveRecent}
              mode={mode}
            />
          )}
        </View>
      </TouchableWithoutFeedback>
    );
  }

  // Embedded mode
  return (
    <View className={`relative ${className}`} style={{ zIndex: 2 }}>
      <SearchInput
        onFocus={handleSearchFocus}
        onBlur={handleSearchBlur}
        placeholder={placeholder}
        onSearchSubmit={handleSearchSubmit}
        onSearchChange={handleSearchChange}
        enableRealtimeSearch={true}
        initialQuery={searchState.query}
        showSuggestions={false} // We'll handle suggestions manually
      />
      {searchState.showSuggestions && (
        <SearchSuggestions
          query={searchState.query}
          onSelectSuggestion={handleSelectSuggestion}
          recentSearches={recentSearches}
          onRemoveRecent={handleRemoveRecent}
          mode={mode}
        />
      )}
      {searchState.submitted && searchState.query && (
        <View className="mt-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-lg">
              Search Results for “{searchState.query}”
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
          <SearchResults
            query={searchState.query}
            onJoinStream={onJoinStream}
            baseURL={baseURL}
            mode={mode}
          />
        </View>
      )}
    </View>
  );
};

export default UniversalSearch;
