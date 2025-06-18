import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, Switch, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';

const NotificationScreen = () => {
  const router = useRouter();
  const [liveNotifications, setLiveNotifications] = useState(true);
  const [rewardNotifications, setRewardNotifications] = useState(true);

  const followedAccounts = [
    { id: '1', name: 'Desmond Elliot', image: 'https://randomuser.me/api/portraits/men/32.jpg' },
    { id: '2', name: 'Desmond Elliot', image: 'https://randomuser.me/api/portraits/men/33.jpg' },
    { id: '3', name: 'Desmond Elliot', image: 'https://randomuser.me/api/portraits/men/34.jpg' },
    { id: '4', name: 'Desmond Elliot', image: 'https://randomuser.me/api/portraits/men/35.jpg' },
    { id: '5', name: 'Desmond Elliot', image: 'https://randomuser.me/api/portraits/men/36.jpg' },
    { id: '6', name: 'Desmond Elliot', image: 'https://randomuser.me/api/portraits/men/37.jpg' },
    { id: '7', name: 'Desmond Elliot', image: 'https://randomuser.me/api/portraits/men/38.jpg' },
  ];

  // Use a state object to manage toggles for each account
  const [accountToggles, setAccountToggles] = useState<{ [key: string]: boolean }>(
    followedAccounts.reduce((acc, account) => ({ ...acc, [account.id]: true }), {})
  );

  const toggleAccountSwitch = (id: string) => {
    setAccountToggles(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      <View className="flex-row items-center relative px-4 pt-3 pb-3">
        <TouchableOpacity onPress={() => router.back()} className="absolute left-4 z-10 bg-[#1E1E1E] w-14 h-14 rounded-full justify-center items-center">
          <ArrowLeftIcon width={24} height={24} />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-white text-xl font-semibold">Notifications</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 mt-6">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-white text-base">Live notifications from accounts you follow</Text>
          <Switch
            trackColor={{ false: '#2C2C2E', true: '#A40000' }}
            thumbColor="#FFFFFF"
            onValueChange={() => setLiveNotifications(previousState => !previousState)}
            value={liveNotifications}
          />
        </View>
        <View className="flex-row justify-between items-center mb-8">
          <Text className="text-white text-base">Live reward notifications</Text>
          <Switch
            trackColor={{ false: '#2C2C2E', true: '#A40000' }}
            thumbColor="#FFFFFF"
            onValueChange={() => setRewardNotifications(previousState => !previousState)}
            value={rewardNotifications}
          />
        </View>

        <Text className="text-gray-400 mb-4">Accounts you follow</Text>

        {followedAccounts.map(account => (
          <View key={account.id} className="flex-row justify-between items-center mb-6">
            <View className="flex-row items-center">
              <Image source={{ uri: account.image }} className="w-14 h-14 rounded-full mr-4 border-2 border-[#ffffff]" />
              <Text className="text-white text-base">{account.name}</Text>
            </View>
            <Switch
              trackColor={{ false: '#2C2C2E', true: '#A40000' }}
              thumbColor="#FFFFFF"
              onValueChange={() => toggleAccountSwitch(account.id)}
              value={accountToggles[account.id]}
            />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationScreen; 