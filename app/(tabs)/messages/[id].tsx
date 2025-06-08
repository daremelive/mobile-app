import React, { useState } from 'react';
import { View, Text, SafeAreaView, TextInput, ScrollView, TouchableOpacity, Image, Modal, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CheckDoubleIcon } from '../../../components/icons/CheckDoubleIcon';
import { MoreVerticalIcon } from '../../../components/icons/MoreVerticalIcon';
import { SendIcon } from '../../../components/icons/SendIcon';
// import { NotificationOffIcon } from '../../../components/icons/NotificationOffIcon';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { NotificationOff03Icon, PinIcon, Delete02Icon, ArrowLeft02Icon, MoreHorizontalIcon } from '@hugeicons/core-free-icons';

const USER = {
  id: 1,
  name: 'Desmond Elliot',
  avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
  online: true,
};

const OTHER = {
  id: 2,
  name: 'Jane Doe',
  avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
};

const MESSAGES = [
  {
    id: 1,
    from: USER.id,
    text: "That's very nice place! you guys made a very good decision. Can't wait to go on vacation!",
    time: '12:30',
    outgoing: true,
    read: true,
  },
  {
    id: 2,
    from: OTHER.id,
    text: 'Hello dear',
    time: '12:30',
    outgoing: false,
    read: true,
  },
  {
    id: 3,
    from: OTHER.id,
    text: "That's very nice place! you guys made a very good decision. Can't wait to go on vacation!",
    time: '12:30',
    outgoing: false,
    read: true,
  },
  {
    id: 4,
    from: OTHER.id,
    text: "That's very nice place! you guys made a very good decision. Can't wait to go on vacation!",
    time: '12:30',
    outgoing: false,
    read: true,
  },
  {
    id: 5,
    from: USER.id,
    text: "That's very nice place! you guys made a very good decision. Can't wait to go on vacation!",
    time: '12:30',
    outgoing: true,
    read: true,
  },
];

export default function MessageDetailScreen() {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [input, setInput] = useState('');

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      {/* Header */}
      <View className="flex-row items-center px-4 pt-3 pb-3 border-b border-[#1A1A1A] relative">
        <TouchableOpacity onPress={() => router.push('/messages')} className="mr-4">
          <View className="w-14 h-14 bg-[#1A1A1A] rounded-full justify-center items-center">
          <HugeiconsIcon size={20} color="#ffffff" strokeWidth={1.5} icon={ArrowLeft02Icon} />
          </View>
        </TouchableOpacity>
        <Image source={{ uri: USER.avatar }} className="w-14 h-14 rounded-full border border-[#ffffff] mr-3" />
        <View className="flex-1">
          <Text className="text-white text-[16px] font-semibold">{USER.name}</Text>
          <Text className="text-[#B0B0B0] text-xs">Online</Text>
        </View>
        <TouchableOpacity onPress={() => setMenuVisible(true)}>
          <HugeiconsIcon size={40} color="#ffffff" strokeWidth={2} icon={MoreHorizontalIcon} />
        </TouchableOpacity>
        {/* Popup Menu */}
        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <Pressable className="flex-1" onPress={() => setMenuVisible(false)}>
            <View className="absolute right-4 top-[105px] w-44 bg-[#232325] rounded-xl shadow-lg p-2">
              <TouchableOpacity className="flex-row items-center px-3 py-2" onPress={() => {}}>
              <HugeiconsIcon
                icon={NotificationOff03Icon}
                size={20}
                color="#ffffff"
                strokeWidth={1.5}
              />
                <Text className="ml-3 text-white text-base">Mute</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-row items-center px-3 py-2" onPress={() => {}}>
              <HugeiconsIcon size={20} color="#ffffff" strokeWidth={1.5} icon={PinIcon} />
                <Text className="ml-3 text-white text-base">Pin Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-row items-center px-3 py-2 rounded-lg" onPress={() => {}}>
              <HugeiconsIcon size={20} color="#C42720" strokeWidth={1.5} icon={Delete02Icon} />
                <Text className="ml-3 text-[#C42720] text-base">Delete Chat</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      </View>

      {/* Conversation */}
      <ScrollView className="flex-1 px-4 py-4">
        {MESSAGES.map((msg, idx) => (
          <View key={msg.id} className={`mb-3 mt-3 flex-row ${msg.outgoing ? 'justify-end' : 'justify-start'}`}>
            {!msg.outgoing && (
              <Image source={{ uri: OTHER.avatar }} className="w-7 h-7 rounded-full mr-2 self-end" />
            )}
            <View className={`${msg.outgoing ? 'bg-[#C42720] rounded-xl' : 'bg-[#232325] rounded-xl'} px-4 py-3 max-w-[75%]`}>
              <Text className={`text-[15px] ${msg.outgoing ? 'text-white' : 'text-white'}`}>{msg.text}</Text>
            </View>
            {msg.outgoing && (
              <></>
            )}
          </View>
        ))}
        {/* Last message status */}
        <View className="flex-row items-center mt-1 mb-2">
          <CheckDoubleIcon size={16} color="#666666" />
          <Text className="text-[#666666] text-xs ml-1">12:30</Text>
        </View>
      </ScrollView>

      {/* Input Bar */}
      <View className="px-4 pb-4 pt-2 bg-transparent">
        <View className="flex-row items-center bg-[#1A1A1A] rounded-full px-4 h-12">
          <TextInput
            className="flex-1 text-white text-base"
            placeholder="Type a message"
            placeholderTextColor="#757688"
            value={input}
            onChangeText={setInput}
          />
          <TouchableOpacity className="ml-2" onPress={() => {}}>
            <SendIcon size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
} 