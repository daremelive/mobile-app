import React from 'react';
import { View, Text, SafeAreaView, ScrollView, TextInput, Image, TouchableOpacity, ImageBackground, RefreshControl, Alert } from 'react-native';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import SearchIcon from '../assets/icons/search-icon.svg';
import EyeIcon from '../assets/icons/eye.svg';
import { useGetPopularStreamsQuery } from '../src/store/streamsApi';
import ipDetector from '../src/utils/ipDetector';

export default function PopularChannelsScreen() {
  const [baseURL, setBaseURL] = React.useState<string>('');
  
  // Initialize base URL with IP detection
  React.useEffect(() => {
    const initializeBaseURL = async () => {
      try {
        const detection = await ipDetector.detectIP();
        const url = `http://${detection.ip}:8000`;
        setBaseURL(url);
        console.log('🔗 Popular Channels Base URL initialized:', url);
      } catch (error) {
        console.error('❌ Failed to detect IP in popular channels:', error);
        setBaseURL('http://172.20.10.2:8000'); // Fallback
      }
    };
    
    initializeBaseURL();
  }, []);

  const { data: popularStreams = [], isLoading, refetch } = useGetPopularStreamsQuery(undefined, {
    pollingInterval: 30000, // Poll every 30 seconds to ensure live streams are current
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

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
                onPress={() => handleJoinStream(stream.id, stream.title || 'Untitled Stream', stream.host.username || stream.host.first_name || 'Unknown Host')}
              >
                <ImageBackground 
                  source={{ 
                    uri: stream.host.profile_picture_url 
                      ? (stream.host.profile_picture_url.startsWith('http') 
                          ? stream.host.profile_picture_url 
                          : `${baseURL}${stream.host.profile_picture_url}`)
                      : `https://picsum.photos/400/${500 + parseInt(stream.id.slice(-3), 16)}` 
                  }} 
                  className="w-full h-full justify-between"
                >
                  <View className="items-end p-2">
                    <View className="bg-black/60 px-3 py-1.5 rounded-full flex-row items-center gap-1">
                      <EyeIcon width={16} height={16} stroke="#FFFFFF" className="mr-1.5" />
                      <Text className="text-white text-xs font-semibold">
                        {stream.total_participant_count || stream.viewer_count || 0}
                      </Text>
                    </View>
                  </View>
                  <BlurView
                    intensity={30}
                    tint="dark"
                    className="absolute bottom-0 left-0 right-0 px-4 py-4 bg-black/30"
                  >
                    <Text className="text-white text-base font-bold mb-2" numberOfLines={2}>
                      {stream.title}
                    </Text>
                    <Text className="text-gray-300 text-sm">
                      @{stream.host.username || stream.host.first_name || 'User'}
                    </Text>
                  </BlurView>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
} 