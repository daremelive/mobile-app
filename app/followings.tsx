import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, TextInput, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import SearchIcon from '../assets/icons/search-icon.svg';
import CheckIcon from '../assets/icons/check.svg';

const users = [
  { id: 1, name: 'John Doe', followers: '12k', avatar: 'https://randomuser.me/api/portraits/men/1.jpg', isLive: false, isFollowing: true },
  { id: 2, name: 'Desmond Elliot', followers: '12k', avatar: 'https://randomuser.me/api/portraits/men/2.jpg', isLive: false, isFollowing: false },
  { id: 3, name: 'Ted Iorbee', followers: '12k', avatar: 'https://randomuser.me/api/portraits/men/3.jpg', isLive: false, isFollowing: true },
  { id: 4, name: 'Desmond Elliot', followers: '12k', avatar: 'https://randomuser.me/api/portraits/women/1.jpg', isLive: true, isFollowing: true },
  { id: 5, name: 'Desmond Elliot', followers: '12k', avatar: 'https://randomuser.me/api/portraits/men/4.jpg', isLive: false, isFollowing: true },
  { id: 6, name: 'Desmond Elliot', followers: '12k', avatar: 'https://randomuser.me/api/portraits/women/2.jpg', isLive: true, isFollowing: true },
  { id: 7, name: 'Desmond Elliot', followers: '12k', avatar: 'https://randomuser.me/api/portraits/men/5.jpg', isLive: false, isFollowing: true },
  { id: 8, name: 'Desmond Elliot', followers: '12k', avatar: 'https://randomuser.me/api/portraits/men/6.jpg', isLive: false, isFollowing: true },
  { id: 9, name: 'Desmond Elliot', followers: '12k', avatar: 'https://randomuser.me/api/portraits/men/7.jpg', isLive: true, isFollowing: true },
  { id: 10, name: 'Desmond Elliot', followers: '12k', avatar: 'https://randomuser.me/api/portraits/women/3.jpg', isLive: false, isFollowing: true },
];

export default function FollowingsScreen() {
  const [search, setSearch] = useState('');
  const [followingState, setFollowingState] = useState(
    users.reduce((acc, user) => ({ ...acc, [user.id]: user.isFollowing }), {} as Record<number, boolean>)
  );

  const toggleFollow = (id: number) => {
    setFollowingState(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-row items-center px-4 pt-3 pb-3">
        <TouchableOpacity onPress={() => router.back()} className="absolute left-4 z-10 bg-[#1E1E1E] w-14 h-14 rounded-full justify-center items-center">
          <ArrowLeftIcon width={24} height={24} />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-white text-xl font-semibold">Following</Text>
        </View>
      </View>

      <View className="px-4 mt-6">
        <View className="flex-row items-center rounded-full p-3 border border-[#333333]">
          <SearchIcon width={20} height={20} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search"
            placeholderTextColor="#8A8A8E"
            className="flex-1 text-white text-base ml-3"
          />
        </View>
      </View>

      <ScrollView className="px-4 mt-6">
        {filteredUsers.map((user) => (
          <View key={user.id} className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center">
              <View className="relative mr-4">
                <Image
                  source={{ uri: user.avatar }}
                  className={`w-14 h-14 rounded-full ${user.isLive ? 'border-2 border-[#C42720]' : 'border-2 border-transparent'}`}
                />
                {user.isLive && (
                  <View className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#C42720] px-2 py-0.5 rounded-md">
                    <Text className="text-white text-[10px] font-semibold">Live</Text>
                  </View>
                )}
              </View>
              <View>
                <Text className="text-white text-base font-semibold">{user.name}</Text>
                <Text className="text-[#B0B0B0] text-sm">{user.followers} followers</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => toggleFollow(user.id)}
              className={`py-2 rounded-full flex-row items-center justify-center px-4 ${followingState[user.id] ? 'bg-[#2E1616]' : 'bg-[#C42720]'}`}
              style={{ minWidth: 110, height: 36 }}
            >
              {followingState[user.id] ? (
                <>
                  <CheckIcon width={12} height={12} stroke="#C42720" strokeWidth={2} className="mr-2"/>
                  <Text className="text-sm text-white font-semibold">Following</Text>
                </>
              ) : (
                <Text className="text-sm text-white font-semibold">Follow</Text>
              )}
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
} 