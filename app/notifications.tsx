import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, Switch, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import { 
  useGetNotificationSettingsQuery,
  useUpdateNotificationSettingsMutation,
  useGetAccountNotificationSettingsQuery,
  useUpdateAccountNotificationSettingMutation,
} from '../src/api/notificationApi';

const NotificationScreen = () => {
  const router = useRouter();
  
  // RTK Query hooks
  const { data: notificationSettings, isLoading: settingsLoading } = useGetNotificationSettingsQuery();
  const { data: accountSettings, isLoading: accountSettingsLoading } = useGetAccountNotificationSettingsQuery();
  const [updateNotificationSettings] = useUpdateNotificationSettingsMutation();
  const [updateAccountNotificationSetting] = useUpdateAccountNotificationSettingMutation();

  // Local state for switches (will be initialized from API data)
  const [liveNotifications, setLiveNotifications] = useState(true);
  const [rewardNotifications, setRewardNotifications] = useState(true);
  const [accountToggles, setAccountToggles] = useState<{ [key: string]: boolean }>({});

  // Initialize local state when API data is loaded
  useEffect(() => {
    if (notificationSettings) {
      setLiveNotifications(notificationSettings.live_notifications);
      setRewardNotifications(notificationSettings.reward_notifications);
    }
  }, [notificationSettings]);

  useEffect(() => {
    if (accountSettings) {
      const toggles: { [key: string]: boolean } = {};
      accountSettings.forEach(setting => {
        toggles[setting.following_user.id.toString()] = setting.live_notifications;
      });
      setAccountToggles(toggles);
    }
  }, [accountSettings]);

  const handleLiveNotificationToggle = async (value: boolean) => {
    setLiveNotifications(value);
    try {
      await updateNotificationSettings({ live_notifications: value }).unwrap();
    } catch (error) {
      // Revert on error
      setLiveNotifications(!value);
      console.error('Failed to update live notifications:', error);
    }
  };

  const handleRewardNotificationToggle = async (value: boolean) => {
    setRewardNotifications(value);
    try {
      await updateNotificationSettings({ reward_notifications: value }).unwrap();
    } catch (error) {
      // Revert on error
      setRewardNotifications(!value);
      console.error('Failed to update reward notifications:', error);
    }
  };

  const toggleAccountSwitch = async (followingUserId: string) => {
    const currentValue = accountToggles[followingUserId];
    const newValue = !currentValue;
    
    // Optimistic update
    setAccountToggles(prev => ({ ...prev, [followingUserId]: newValue }));
    
    try {
      await updateAccountNotificationSetting({
        following_user_id: parseInt(followingUserId),
        data: { live_notifications: newValue }
      }).unwrap();
    } catch (error) {
      // Revert on error
      setAccountToggles(prev => ({ ...prev, [followingUserId]: currentValue }));
      console.error('Failed to update account notification:', error);
    }
  };

  if (settingsLoading || accountSettingsLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black justify-center items-center">
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#A40000" />
      </SafeAreaView>
    );
  }

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
            onValueChange={handleLiveNotificationToggle}
            value={liveNotifications}
          />
        </View>
        <View className="flex-row justify-between items-center mb-8">
          <Text className="text-white text-base">Live reward notifications</Text>
          <Switch
            trackColor={{ false: '#2C2C2E', true: '#A40000' }}
            thumbColor="#FFFFFF"
            onValueChange={handleRewardNotificationToggle}
            value={rewardNotifications}
          />
        </View>

        <Text className="text-gray-400 mb-4">Accounts you follow</Text>

        {accountSettings?.map(setting => (
          <View key={setting.id} className="flex-row justify-between items-center mb-6">
            <View className="flex-row items-center">
              <Image 
                source={{ uri: setting.following_user.avatar || `https://randomuser.me/api/portraits/men/${30 + (setting.following_user.id % 10)}.jpg` }} 
                className="w-14 h-14 rounded-full mr-4 border-2 border-[#ffffff]" 
              />
              <Text className="text-white text-base">{setting.following_user.username}</Text>
            </View>
            <Switch
              trackColor={{ false: '#2C2C2E', true: '#A40000' }}
              thumbColor="#FFFFFF"
              onValueChange={() => toggleAccountSwitch(setting.following_user.id.toString())}
              value={accountToggles[setting.following_user.id.toString()] || false}
            />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationScreen; 