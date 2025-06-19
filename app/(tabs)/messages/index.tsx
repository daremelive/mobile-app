import React from 'react';
import { View, Text, SafeAreaView, TextInput, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SearchIcon } from '../../../components/icons/SearchIcon';
import { CheckDoubleIcon } from '../../../components/icons/CheckDoubleIcon';
import { ArrowLeftIcon } from '../../../components/icons/ArrowLeftIcon';

const DUMMY_MESSAGES = [
  {
    id: 1,
    name: 'Desmond Elliot',
    message: 'Lorem ipsum dolor sit amet consectetur...',
    time: '12:30',
    unread: 2,
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    isLive: false
  },
  {
    id: 2,
    name: 'John Smith',
    message: 'Lorem ipsum dolor sit amet consectetur...',
    time: '12:30',
    unread: 0,
    avatar: 'https://randomuser.me/api/portraits/men/33.jpg',
    isLive: false
  },
  {
    id: 3,
    name: 'Sarah Johnson',
    message: 'Lorem ipsum dolor sit amet consectetur...',
    time: '12:30',
    unread: 0,
    avatar: 'https://randomuser.me/api/portraits/women/32.jpg',
    isLive: false
  },
  {
    id: 4,
    name: 'Mike Anderson',
    message: 'Lorem ipsum dolor sit amet consectetur...',
    time: '12:30',
    unread: 0,
    avatar: 'https://randomuser.me/api/portraits/men/34.jpg',
    isLive: false
  },
  {
    id: 5,
    name: 'Emma Wilson',
    message: 'Lorem ipsum dolor sit amet consectetur...',
    time: '12:30',
    unread: 0,
    avatar: 'https://randomuser.me/api/portraits/women/33.jpg',
    isLive: false
  },
  {
    id: 6,
    name: 'David Brown',
    message: 'Lorem ipsum dolor sit amet consectetur...',
    time: '12:30',
    unread: 2,
    avatar: 'https://randomuser.me/api/portraits/men/35.jpg',
    isLive: false
  }
];

const STORY_USERS = [
  {
    id: 1,
    name: 'Desmond Elliot',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    isLive: true
  },
  {
    id: 2,
    name: 'John Smith',
    avatar: 'https://randomuser.me/api/portraits/men/33.jpg',
    isLive: true
  },
  {
    id: 3,
    name: 'Sarah Johnson',
    avatar: 'https://randomuser.me/api/portraits/women/32.jpg',
    isLive: false
  },
  {
    id: 4,
    name: 'Mike Anderson',
    avatar: 'https://randomuser.me/api/portraits/men/34.jpg',
    isLive: true
  },
  {
    id: 5,
    name: 'Emma Wilson',
    avatar: 'https://randomuser.me/api/portraits/women/33.jpg',
    isLive: false
  }
];

export default function MessagesScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredMessages = DUMMY_MESSAGES.filter(message => 
    message.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      
      {/* Header */}
      <View className="flex-row items-center relative px-4 pt-3 pb-3 mb-6">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="absolute left-4 z-10"
        >
          <View className="w-14 h-14 bg-[#1A1A1A] rounded-full justify-center items-center">
            <ArrowLeftIcon size={24} color="white" />
          </View>
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-white text-[20px] font-semibold">Messages</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View className="px-4 mb-2">
        <View className="flex-row items-center border border-[#757688] rounded-full px-3 h-11">
          <SearchIcon size={20} color="#ffffff" />
          <TextInput
            placeholder="Search"
            placeholderTextColor="#666666"
            className="flex-1 text-white ml-2 text-base"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Main Content */}
      <View className="flex-1">
        {/* Stories */}
        <View className="mb-2 mt-4">
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            className="pl-4 pb-2"
          >
            {STORY_USERS.map((user, index) => (
              <View key={user.id} className="mr-4">
                <LinearGradient
                  colors={['#FF4D67', '#FF8C5B']}
                  style={{ width: 64, height: 64, borderRadius: 32, padding: 2 }}
                >
                  <View className="bg-[#090909] rounded-full p-0.5 w-full h-full overflow-hidden">
                    <Image
                      source={{ uri: user.avatar }}
                      className="w-full h-full rounded-full"
                    />
                  </View>
                </LinearGradient>
                {user.isLive && (
                  <View className="absolute -bottom-1 self-center bg-[#C42720] px-2 py-0.5 rounded-md">
                    <Text className="text-white text-[10px] font-medium">Live</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Messages List */}
        <ScrollView className="flex-1 mt-2">
          {filteredMessages.map((message, index) => (
            <TouchableOpacity 
              key={message.id}
              className="flex-row p-4 border-b border-[#1A1A1A]"
              onPress={() => router.push(`/messages/${message.id}`)}
            >
              <View className="relative">
                <Image
                  source={{ uri: message.avatar }}
                  className="w-12 h-12 rounded-full"
                />
                {message.isLive && (
                  <View className="absolute -bottom-1 self-center bg-[#FF4D67] px-2 py-0.5 rounded-md">
                    <Text className="text-white text-[10px] font-medium">Live</Text>
                  </View>
                )}
              </View>
              
              <View className="flex-1 ml-3">
                <View className="flex-row justify-between items-center">
                  <Text className="text-white text-[16px] font-semibold">{message.name}</Text>
                  <Text className="text-[#666666] text-xs">{message.time}</Text>
                </View>
                
                <View className="flex-row items-center mt-1">
                  <CheckDoubleIcon size={16} color="#666666" />
                  <Text className="flex-1 text-[#666666] text-[14px] ml-1" numberOfLines={1}>
                    {message.message}
                  </Text>
                  {message.unread > 0 && (
                    <View className="bg-[#C42720] w-5 h-5 rounded-full justify-center items-center ml-2">
                      <Text className="text-white text-xs">{message.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
} 