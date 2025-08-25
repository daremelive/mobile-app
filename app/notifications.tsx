import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, Switch, Image, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import { 
  useGetNotificationSettingsQuery,
  useUpdateNotificationSettingsMutation,
  useGetAccountNotificationSettingsQuery,
  useUpdateAccountNotificationSettingMutation,
} from '../src/api/notificationApi';
import { useGetFollowingQuery } from '../src/store/followApi';
import ipDetector from '../src/utils/ipDetector';

const NotificationScreen = () => {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [baseURL, setBaseURL] = React.useState<string>('');

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
        console.log('🔗 Notifications Base URL initialized:', url);
      } catch (error) {
        console.error('❌ Failed to detect IP in notifications:', error);
        setBaseURL('https://daremelive.pythonanywhere.com'); // Production fallback
      }
    };
    
    initializeBaseURL();
  }, []);

  // API hooks
  const { data: notificationSettings, isLoading: settingsLoading, refetch: refetchSettings } = useGetNotificationSettingsQuery();
  const { data: accountSettings, isLoading: accountSettingsLoading, refetch: refetchAccountSettings } = useGetAccountNotificationSettingsQuery();
  const { data: followingUsers, isLoading: followingLoading, refetch: refetchFollowing } = useGetFollowingQuery({ search: '' });
  
  const [updateNotificationSettings, { isLoading: isUpdatingSettings }] = useUpdateNotificationSettingsMutation();
  const [updateAccountNotificationSetting, { isLoading: isUpdatingAccountSetting }] = useUpdateAccountNotificationSettingMutation();

  // Refresh function
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchSettings(),
        refetchAccountSettings(),
        refetchFollowing(),
      ]);
    } catch (error) {
      console.error('❌ Failed to refresh notification settings:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle global notification setting changes
  const handleGlobalSettingChange = async (settingKey: 'live_notifications' | 'reward_notifications', value: boolean) => {
    try {
      await updateNotificationSettings({
        [settingKey]: value,
      }).unwrap();
      
      console.log(`✅ Updated ${settingKey} to ${value}`);
    } catch (error: any) {
      console.error(`❌ Failed to update ${settingKey}:`, error);
      Alert.alert(
        'Update Failed',
        error?.data?.message || `Failed to update ${settingKey.replace('_', ' ')} setting. Please try again.`
      );
    }
  };

  // Handle account-specific notification setting changes
  const handleAccountSettingChange = async (followingUserId: number, settingKey: 'live_notifications' | 'new_content_notifications', value: boolean) => {
    try {
      await updateAccountNotificationSetting({
        following_user_id: followingUserId,
        data: { [settingKey]: value }
      }).unwrap();
      
      console.log(`✅ Updated account ${followingUserId} ${settingKey} to ${value}`);
    } catch (error: any) {
      console.error(`❌ Failed to update account setting:`, error);
      Alert.alert(
        'Update Failed',
        error?.data?.message || 'Failed to update account notification setting. Please try again.'
      );
    }
  };

  // Get account setting for a specific user
  const getAccountSetting = (userId: number, settingKey: 'live_notifications' | 'new_content_notifications') => {
    const setting = accountSettings?.find(setting => setting.following_user.id === userId);
    return setting ? setting[settingKey] : true; // Default to true if no setting found
  };

  // Loading state
  if (settingsLoading || accountSettingsLoading || followingLoading) {
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
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#C42720" />
          <Text className="text-gray-400 mt-4">Loading notification settings...</Text>
        </View>
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

      <ScrollView 
        className="flex-1 px-4 mt-6"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#C42720"
            colors={['#C42720']}
            title="Refreshing..."
            titleColor="#ffffff"
          />
        }
      >
        {/* Global Notification Settings */}
        <View className="flex-row justify-between items-center mb-6">
          <View className="flex-1 mr-4">
            <Text className="text-white text-base">Live notifications from accounts you follow</Text>
            <Text className="text-gray-400 text-sm mt-1">Get notified when people you follow go live</Text>
          </View>
          <Switch
            trackColor={{ false: '#2C2C2E', true: '#A40000' }}
            thumbColor="#FFFFFF"
            onValueChange={(value) => handleGlobalSettingChange('live_notifications', value)}
            value={notificationSettings?.live_notifications ?? true}
            disabled={isUpdatingSettings}
          />
        </View>

        <View className="flex-row justify-between items-center mb-8">
          <View className="flex-1 mr-4">
            <Text className="text-white text-base">Live reward notifications</Text>
            <Text className="text-gray-400 text-sm mt-1">Get notified about rewards and gifts during streams</Text>
          </View>
          <Switch
            trackColor={{ false: '#2C2C2E', true: '#A40000' }}
            thumbColor="#FFFFFF"
            onValueChange={(value) => handleGlobalSettingChange('reward_notifications', value)}
            value={notificationSettings?.reward_notifications ?? true}
            disabled={isUpdatingSettings}
          />
        </View>

        {/* Account-Specific Settings */}
        <Text className="text-gray-400 mb-4">Accounts you follow ({followingUsers?.length || 0})</Text>

        {followingUsers && followingUsers.length > 0 ? (
          followingUsers.map(user => (
            <View key={user.id} className="flex-row justify-between items-center mb-6">
              <View className="flex-row items-center flex-1">
                <Image 
                  source={{ 
                    uri: user.profile_picture_url 
                      ? (user.profile_picture_url.startsWith('http') 
                          ? user.profile_picture_url 
                          : `${baseURL}${user.profile_picture_url}`)
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username)}&background=C42720&color=fff&size=100`
                  }} 
                  className="w-14 h-14 rounded-full mr-4 border-2 border-[#C42720]" 
                />
                <View className="flex-1">
                  <Text className="text-white text-base">{user.full_name || user.username}</Text>
                  <Text className="text-gray-400 text-sm">@{user.username}</Text>
                </View>
              </View>
              <Switch
                trackColor={{ false: '#2C2C2E', true: '#A40000' }}
                thumbColor="#FFFFFF"
                onValueChange={(value) => handleAccountSettingChange(user.id, 'live_notifications', value)}
                value={getAccountSetting(user.id, 'live_notifications')}
                disabled={isUpdatingAccountSetting}
              />
            </View>
          ))
        ) : (
          <View className="py-12 items-center">
            <Text className="text-gray-400 text-center">
              You're not following anyone yet.{'\n'}
              Follow some accounts to customize their notification settings.
            </Text>
          </View>
        )}

        {/* Loading indicator for updates */}
        {(isUpdatingSettings || isUpdatingAccountSetting) && (
          <View className="flex-row items-center justify-center py-4">
            <ActivityIndicator size="small" color="#C42720" />
            <Text className="text-gray-400 ml-2">Updating settings...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationScreen; 