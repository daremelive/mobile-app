import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, Image, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import { useGetInboxNotificationsQuery, useMarkNotificationAsReadMutation } from '../src/api/notificationApi';
import { fonts } from '../constants/Fonts';

const NotificationInboxScreen = () => {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  
  // RTK Query hooks
  const { data: notifications = [], isLoading, refetch } = useGetInboxNotificationsQuery();
  const [markAsRead] = useMarkNotificationAsReadMutation();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: any) => {
    try {
      // Mark notification as read
      if (!notification.is_read) {
        await markAsRead(notification.id).unwrap();
      }

      // Handle different notification types
      switch (notification.notification_type) {
        case 'stream_invite':
          const streamData = notification.extra_data;
          Alert.alert(
            'Stream Invitation',
            `Join ${streamData.host_username}'s live stream: "${streamData.stream_title}"?`,
            [
              {
                text: 'Decline',
                style: 'cancel',
              },
              {
                text: 'Join Stream',
                onPress: () => {
                  router.push({
                    pathname: '/stream/viewer',
                    params: { 
                      streamId: streamData.stream_id,
                      hostUsername: streamData.host_username,
                      streamTitle: streamData.stream_title
                    }
                  });
                },
              },
            ]
          );
          break;
        case 'follow':
          // Navigate to sender's profile
          router.push({
            pathname: '/profile',
            params: { userId: notification.sender?.id }
          });
          break;
        default:
          // For other notifications, just mark as read
          break;
      }
    } catch (error) {
      console.error('Error handling notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'stream_invite':
        return '🎥';
      case 'follow':
        return '👤';
      case 'gift':
        return '🎁';
      case 'live_start':
        return '📺';
      case 'reward':
        return '🏆';
      default:
        return '🔔';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const notificationDate = new Date(dateString);
    const diffInMs = now.getTime() - notificationDate.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return notificationDate.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black justify-center items-center">
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#C42720" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-3 pb-4 border-b border-gray-800">
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="w-10 h-10 rounded-full bg-[#1E1E1E] justify-center items-center"
        >
          <ArrowLeftIcon width={20} height={20} />
        </TouchableOpacity>
        
        <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-lg">
          Notifications
        </Text>
        
        <View className="w-10" />
      </View>

      {/* Notifications List */}
      <ScrollView
        className="flex-1 px-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#C42720"
            colors={['#C42720']}
          />
        }
      >
        {notifications.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-6xl mb-4">🔔</Text>
            <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-xl mb-2">
              No notifications yet
            </Text>
            <Text style={{ fontFamily: fonts.regular }} className="text-gray-400 text-center">
              Stream invitations and updates will appear here
            </Text>
          </View>
        ) : (
          <View className="py-4">
            {notifications.map((notification: any) => (
              <TouchableOpacity
                key={notification.id}
                onPress={() => handleNotificationPress(notification)}
                className={`flex-row items-start p-4 rounded-xl mb-3 ${
                  notification.is_read ? 'bg-[#1A1A1A]' : 'bg-[#2A1A1A]'
                }`}
              >
                {/* Notification Icon */}
                <View className="w-12 h-12 rounded-full bg-[#C42720]/20 items-center justify-center mr-3">
                  <Text className="text-xl">
                    {getNotificationIcon(notification.notification_type)}
                  </Text>
                </View>

                {/* Notification Content */}
                <View className="flex-1">
                  <Text 
                    style={{ fontFamily: fonts.semiBold }} 
                    className={`text-base mb-1 ${notification.is_read ? 'text-gray-300' : 'text-white'}`}
                  >
                    {notification.title}
                  </Text>
                  
                  <Text 
                    style={{ fontFamily: fonts.regular }} 
                    className={`text-sm mb-2 ${notification.is_read ? 'text-gray-500' : 'text-gray-400'}`}
                  >
                    {notification.message}
                  </Text>

                  {/* Sender Info for specific notification types */}
                  {notification.sender && (
                    <View className="flex-row items-center mb-2">
                      <View className="w-6 h-6 rounded-full bg-gray-600 mr-2 overflow-hidden">
                        {notification.sender.profile_picture_url ? (
                          <Image 
                            source={{ uri: `http://192.168.1.117:8000${notification.sender.profile_picture_url}` }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="w-full h-full bg-[#C42720] items-center justify-center">
                            <Text className="text-white text-xs font-bold">
                              {(notification.sender.first_name || notification.sender.username || 'U').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontFamily: fonts.regular }} className="text-gray-500 text-xs">
                        From @{notification.sender.username}
                      </Text>
                    </View>
                  )}

                  <Text style={{ fontFamily: fonts.regular }} className="text-gray-600 text-xs">
                    {formatTimeAgo(notification.created_at)}
                  </Text>
                </View>

                {/* Unread Indicator */}
                {!notification.is_read && (
                  <View className="w-2 h-2 bg-[#C42720] rounded-full ml-2" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationInboxScreen;
