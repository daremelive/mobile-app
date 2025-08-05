import React from 'react';
import { View, Text, SafeAreaView, ScrollView, TextInput, Image, TouchableOpacity, ImageBackground, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import SearchIcon from '../assets/icons/search-icon.svg';
import EyeIcon from '../assets/icons/eye.svg';
import { useGetPopularStreamsQuery } from '../src/store/streamsApi';

export default function PopularChannelsScreen() {
  const { data: popularStreams = [], isLoading, refetch } = useGetPopularStreamsQuery(undefined, {
    pollingInterval: 30000, // Poll every 30 seconds to ensure live streams are current
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      <View className="flex-row items-center px-4 pt-3 pb-3">
        <TouchableOpacity onPress={() => router.back()} className="absolute left-4 z-10 bg-[#1E1E1E] w-14 h-14 rounded-full justify-center items-center">
          <ArrowLeftIcon width={24} height={24} />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-white text-xl font-semibold">Popular Channels</Text>
        </View>
      </View>

      <View className="px-4 mt-6">
        <View className="flex-row items-center gap-3 bg-[#1C1C1E] rounded-full p-3 border border-[#333333]">
          <SearchIcon width={20} height={20} className="mr-3" />
          <TextInput
            placeholder="Search"
            placeholderTextColor="#8A8A8E"
            className="flex-1 text-white text-base"
          />
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#ffffff" />
        }
      >
        {popularStreams.length === 0 ? (
          <View className="flex-1 items-center justify-center mt-20">
            <Text className="text-gray-400 text-lg mb-2">🔴 No Live Streams</Text>
            <Text className="text-gray-500 text-sm text-center">
              Popular channels will appear here when streamers go live
            </Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between">
            {popularStreams.map((stream) => (
              <TouchableOpacity 
                key={stream.id} 
                className="w-[48%] h-[250px] rounded-2xl overflow-hidden mb-4"
                onPress={() => {
                  // Navigate to stream viewer screen
                  router.push(`/stream/${stream.id}?mode=viewer`);
                }}
              >
                <ImageBackground 
                  source={{ 
                    uri: stream.host.profile_picture_url 
                      ? `http://192.168.1.117:8000${stream.host.profile_picture_url}` 
                      : `https://picsum.photos/400/${500 + parseInt(stream.id.slice(-3), 16)}` 
                  }} 
                  className="w-full h-full justify-between"
                >
                  <View className="items-end p-2">
                    <View className="bg-black/60 px-3 py-1.5 rounded-full flex-row items-center gap-1">
                      <View className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <Text className="text-white text-xs font-semibold">LIVE</Text>
                    </View>
                    <View className="bg-black/60 px-3 py-1.5 rounded-full flex-row items-center gap-1 mt-1">
                      <EyeIcon width={16} height={16} stroke="#FFFFFF" className="mr-1.5" />
                      <Text className="text-white text-xs font-semibold">
                        {stream.total_participant_count || stream.viewer_count || 0}
                      </Text>
                    </View>
                  </View>
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    className="p-3"
                  >
                    <Text className="text-white text-base font-bold" numberOfLines={2}>
                      {stream.title}
                    </Text>
                    <Text className="text-gray-300 text-sm">
                      @{stream.host.username || stream.host.first_name || 'User'}
                    </Text>
                    <View className="flex-row items-center mt-1">
                      <Text className="text-gray-400 text-xs">
                        {stream.channel.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} • {stream.mode === 'multi' ? 'Multi' : 'Single'}
                      </Text>
                    </View>
                  </LinearGradient>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
} 