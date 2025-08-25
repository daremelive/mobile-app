import React from 'react';
import { View, Text, SafeAreaView, ScrollView, TextInput, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import SearchIcon from '../assets/icons/search-icon.svg';
import { useGetPopularStreamsQuery } from '../src/store/streamsApi';
import ipDetector from '../src/utils/ipDetector';
import useChannelAccess from '../src/hooks/useChannelAccess';
import ChannelAccessModal from '../components/modals/ChannelAccessModal';
import StreamCard from '../components/stream/StreamCard';

export default function PopularChannelsScreen() {
  const [baseURL, setBaseURL] = React.useState<string>('');
  const { requestChannelAccess, accessModal, closeAccessModal, currentCoins } = useChannelAccess();
  
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
        console.log('🔗 Popular Channels Base URL initialized:', url);
      } catch (error) {
        console.error('❌ Failed to detect IP in popular channels:', error);
        setBaseURL('https://daremelive.pythonanywhere.com'); // Production fallback
      }
    };
    
    initializeBaseURL();
  }, []);

  const { data: popularStreams = [], isLoading, refetch } = useGetPopularStreamsQuery(undefined, {
    pollingInterval: 0, // Disabled to prevent screen blinking
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
      </ScrollView>

      {/* 🏆 PROFESSIONAL ACCESS CONTROL MODAL */}
      {accessModal.visible && accessModal.channelInfo && (
        <ChannelAccessModal
          visible={accessModal.visible}
          onClose={closeAccessModal}
          channelName={accessModal.channelInfo.channelName}
          channelCode={accessModal.channelInfo.channelCode}
          requiredTier={accessModal.channelInfo.requiredTier || 'Premium'}
          coinsNeeded={accessModal.channelInfo.coinsNeeded || 0}
          currentCoins={currentCoins}
          unlockMessage={accessModal.channelInfo.unlockMessage || 'Upgrade required to access this channel'}
        />
      )}
    </SafeAreaView>
  );
} 