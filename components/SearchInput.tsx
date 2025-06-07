import React, { forwardRef } from 'react';
import { View, TextInput, Text, ScrollView, TouchableOpacity } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { fonts } from '../constants/Fonts';
import { router } from 'expo-router';
import ClockIcon from '../assets/icons/clock.svg';
import CancelIcon from '../assets/icons/cancel.svg';
import StarsIcon from '../assets/icons/stars.svg';

const MOCK_RECOMMENDED = ['Marriage', 'Banter with Friends', 'Live Gaming', 'World Politics', 'Hot Gist'];

interface SearchInputProps {
  autoFocus?: boolean;
  onSearchSubmit?: (query: string) => void;
  initialQuery?: string;
  placeholder?: string;
  showSuggestions?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

interface SearchSuggestionsProps {
  query: string;
  onSelectSuggestion: (suggestion: string) => void;
  recentSearches: string[];
  onRemoveRecent: (index: number) => void;
}

const SearchSuggestions: React.FC<SearchSuggestionsProps> = React.memo(({ 
  query, 
  onSelectSuggestion, 
  recentSearches,
  onRemoveRecent
}) => {
  if (!query) return null;

  const filteredRecents = recentSearches.filter(s => s.toLowerCase().includes(query.toLowerCase()));
  const filteredRecommended = MOCK_RECOMMENDED.filter(s => s.toLowerCase().includes(query.toLowerCase()));

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
            <TouchableOpacity 
              onPress={() => onSelectSuggestion(item)} 
              key={`rec-${index}`} 
              className="flex-row items-center py-2 px-4"
            >
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

const SearchInput = forwardRef<TextInput, SearchInputProps>(({ 
  autoFocus = false, 
  onSearchSubmit,
  initialQuery = '',
  placeholder = 'Search',
  showSuggestions = true,
  onFocus,
  onBlur
}, ref) => {
  const [searchQuery, setSearchQuery] = React.useState(initialQuery);
  const [recentSearches, setRecentSearches] = React.useState([
    'Marriage Sacrifices', 
    'Dating Life', 
    'How to cook', 
    'Gaming in SA', 
    'Mr & Mrs Kola'
  ]);

  const handleSearchChange = React.useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const handleSearchSubmit = React.useCallback(() => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      if (onSearchSubmit) {
        onSearchSubmit(trimmedQuery);
      } else {
        // Add to recent searches
        setRecentSearches(prev => {
          if (!prev.includes(trimmedQuery)) {
            return [trimmedQuery, ...prev];
          }
          return prev;
        });
        
        router.push({
          pathname: '/(tabs)/search',
          params: { query: trimmedQuery }
        });
      }
    }
  }, [searchQuery, onSearchSubmit]);

  const handleSelectSuggestion = React.useCallback((suggestion: string) => {
    setSearchQuery(suggestion);
    if (onSearchSubmit) {
      onSearchSubmit(suggestion);
    } else {
      router.push({
        pathname: '/(tabs)/search',
        params: { query: suggestion }
      });
    }
  }, [onSearchSubmit]);

  const handleRemoveRecent = React.useCallback((index: number) => {
    setRecentSearches(prev => prev.filter((_, i) => i !== index));
  }, []);

  const borderColor = searchQuery.length > 0 ? '#C42720' : '#353638';

  return (
    <View>
      <View className="flex-row items-center rounded-full px-3 h-11" style={{ borderWidth: 1, borderColor }}>
        <HugeiconsIcon icon={Search01Icon} size={20} color="#FFFFFF" />
        <TextInput
          ref={ref}
          value={searchQuery}
          onChangeText={handleSearchChange}
          onSubmitEditing={handleSearchSubmit}
          placeholder={placeholder}
          placeholderTextColor="#757688"
          className="flex-1 text-white ml-2 text-base"
          style={{ fontFamily: fonts.regular }}
          returnKeyType="search"
          autoFocus={autoFocus}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </View>
      {showSuggestions && searchQuery.length > 0 && (
        <SearchSuggestions
          query={searchQuery}
          onSelectSuggestion={handleSelectSuggestion}
          recentSearches={recentSearches}
          onRemoveRecent={handleRemoveRecent}
        />
      )}
    </View>
  );
});

SearchInput.displayName = 'SearchInput';

export default SearchInput; 