import React from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, Image } from 'react-native';
import ClockIcon from '../../../assets/icons/clock.svg';
import CancelIcon from '../../../assets/icons/cancel.svg';
import StarsIcon from '../../../assets/icons/stars.svg';
import { fonts } from '../../../constants/Fonts';
import SearchInput from '../../../components/SearchInput';

const MOCK_RECOMMENDED = ['Marriage', 'Banter with Friends', 'Live Gaming', 'World Politics', 'Hot Gist'];

const searchResultsData = [
  { id: 1, title: 'Marriage Sacrifices', username: '@judennam', viewers: '8.9k', image: 'https://picsum.photos/400/501' },
  { id: 2, title: 'Banter with Friends', username: '@judennam', viewers: '8.9k', image: 'https://picsum.photos/400/502' },
  { id: 3, title: 'Live Gaming', username: '@judennam', viewers: '8.9k', image: 'https://picsum.photos/400/503' },
  { id: 4, title: 'World Politics', username: '@judennam', viewers: '8.9k', image: 'https://picsum.photos/400/504' },
];

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

const SearchResults = React.memo(({ query }: { query?: string }) => {
  return (
    <View className="flex-1">
      <View className="flex-row justify-around my-4">
        {['Top', 'Streams', 'Users'].map(tab => (
          <TouchableOpacity key={tab} className="px-5 py-2 rounded-full bg-[#1C1C1E]">
            <Text style={{ fontFamily: fonts.bold }} className="text-white text-base">{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerClassName="px-4 pb-24">
        <View className="flex-row flex-wrap justify-between">
          {searchResultsData.map((channel) => (
            <View key={channel.id} className="w-[48%] h-[250px] rounded-xl overflow-hidden bg-[#1C1C1E] mb-4">
              <Image source={{ uri: channel.image }} className="w-full h-full" />
              <View className="absolute bottom-0 left-0 right-0 p-3 bg-black/30">
                <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-base mb-1">{channel.title}</Text>
                <Text style={{ fontFamily: fonts.regular }} className="text-gray-400 text-sm">{channel.username}</Text>
              </View>
              <View className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded-full flex-row items-center">
                <Text style={{ fontFamily: fonts.regular }} className="text-white text-xs">{channel.viewers}</Text>
              </View>
            </View>
          ))}
        </View>
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