import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, TextInput, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Search01Icon, Tick01Icon } from '@hugeicons/core-free-icons';
import ArrowLeft from '../assets/icons/arrow-left.svg';
import { fonts } from '../constants/Fonts';

const users = [
  { id: 1, name: 'Desmond Elliot', followers: '12k', avatar: 'https://randomuser.me/api/portraits/men/1.jpg', isLive: false, isFollowing: true },
  { id: 2, name: 'Desmond Elliot', followers: '12k', avatar: 'https://randomuser.me/api/portraits/men/2.jpg', isLive: false, isFollowing: false },
  { id: 3, name: 'Desmond Elliot', followers: '12k', avatar: 'https://randomuser.me/api/portraits/men/3.jpg', isLive: false, isFollowing: true },
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
  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="px-4 pt-8">
        {/* Header */}
        <View className="flex-row items-center mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-14 h-14 rounded-full bg-[#1C1C1E] justify-center items-center"
          >
            <ArrowLeft width={24} height={24} />
          </TouchableOpacity>
          <Text
            style={{ fontFamily: fonts.bold }}
            className="text-white text-xl text-center flex-1 -ml-12"
          >
            Following
          </Text>
        </View>
        {/* Search Bar */}
        <View className="flex-row items-center rounded-full border border-[#353638] px-4 mb-6 h-12 bg-[#18181B]">
          <HugeiconsIcon icon={Search01Icon} size={20} color="#757688" style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search"
            placeholderTextColor="#757688"
            className="flex-1 text-white text-base"
            style={{ fontFamily: fonts.regular }}
          />
        </View>
      </View>
      <ScrollView className="px-4" contentContainerStyle={{ paddingBottom: 32 }}>
        {filteredUsers.map((user) => (
          <View key={user.id} className="flex-row items-center py-3 border-b border-[#232325]">
            <View className="relative mr-3">
              <Image
                source={{ uri: user.avatar }}
                className="w-12 h-12 rounded-full border-2 border-[#C42720]"
              />
              {user.isLive && (
                <View className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#C42720] px-2 py-0.5 rounded-lg">
                  <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-[10px]">Live</Text>
                </View>
              )}
            </View>
            <View className="flex-1">
              <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-base">
                {user.name}
              </Text>
              <Text style={{ fontFamily: fonts.regular }} className="text-[#B0B0B0] text-xs">
                {user.followers} followers
              </Text>
            </View>
            <TouchableOpacity
              className={`py-2 rounded-full ${user.isFollowing ? 'bg-[#231010]' : 'bg-[#C42720]'} ml-2 flex-row items-center justify-center px-4`}
              style={{ minWidth: 110, height: 36 }}
            >
              {user.isFollowing ? (
                <>
                  <HugeiconsIcon icon={Tick01Icon} size={16} color="#C42720" strokeWidth={3} style={{ marginRight: 4 }} />
                  <Text style={{ fontFamily: fonts.semiBold }} className="text-sm text-white">
                    Following
                  </Text>
                </>
              ) : (
                <Text style={{ fontFamily: fonts.semiBold }} className="text-sm text-white text-center">
                  Follow
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
} 