import React from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { fonts } from '../../../constants/Fonts';
import { router } from 'expo-router';
import SearchInput from '../../../components/SearchInput';

const categories = ['All', 'Video', 'Game', 'Truth/Dare', 'Banter'];

const followingUsers = [
  { id: 1, image: 'https://picsum.photos/200', isLive: false },
  { id: 2, image: 'https://picsum.photos/201', isLive: true },
  { id: 3, image: 'https://picsum.photos/202', isLive: false },
  { id: 4, image: 'https://picsum.photos/203', isLive: true },
  { id: 5, image: 'https://picsum.photos/204', isLive: false },
];

const popularChannels = [
  {
    id: 1,
    title: 'Marriage Sacrifices',
    username: '@judennam',
    viewers: '8.9k',
    image: 'https://picsum.photos/400/500',
  },
  {
    id: 2,
    title: 'Marriage Sacrifices',
    username: '@judennam',
    viewers: '8.9k',
    image: 'https://picsum.photos/400/501',
  },
];

export default function HomeScreen() {
  const [isSearching, setIsSearching] = React.useState(false);
  const searchInputRef = React.useRef(null);

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
                    {followingUsers.map((user) => (
                      <View key={user.id} className="relative">
                        <Image
                          source={{ uri: user.image }}
                          className="w-16 h-16 rounded-full border-2 border-[#C42720]"
                        />
                        {user.isLive && (
                          <View className="absolute bottom-[-4px] self-center bg-[#C42720] px-2 py-0.5 rounded-lg">
                            <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-[10px]">
                              Live
                            </Text>
                          </View>
                        )}
                      </View>
                    ))}
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
                    {popularChannels.map((channel) => (
                      <View 
                        key={channel.id}
                        className="w-56 h-80 rounded-xl overflow-hidden bg-[#1C1C1E]"
                      >
                        <View className="relative flex-1">
                          <Image
                            source={{ uri: channel.image }}
                            className="w-full h-full"
                          />
                          <View className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded-full">
                            <Text style={{ fontFamily: fonts.regular }} className="text-white text-xs">
                              {channel.viewers}
                            </Text>
                          </View>
                          <BlurView
                            intensity={30}
                            tint="dark"
                            className="absolute bottom-0 left-0 right-0 p-3 bg-black/30"
                          >
                            <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-base mb-1">
                              {channel.title}
                            </Text>
                            <Text style={{ fontFamily: fonts.regular }} className="text-gray-400 text-sm">
                              {channel.username}
                            </Text>
                          </BlurView>
                        </View>
                      </View>
                    ))}
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
