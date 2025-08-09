import React, { useState, useRef, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, Image, ActivityIndicator, RefreshControl, Alert, Animated, Dimensions, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import { useGetInboxNotificationsQuery, useMarkInboxNotificationAsReadMutation, useClearAllInboxNotificationsMutation, useClearInboxNotificationMutation } from '../src/api/notificationApi';
import { useNotificationContext } from '../src/context/NotificationContext';
import { fonts } from '../constants/Fonts';

const { width: screenWidth } = Dimensions.get('window');

// Notification type categories with beautiful icons and colors
const NOTIFICATION_CATEGORIES = [
  { 
    id: 'all', 
    label: 'All', 
    icon: 'notifications',
    gradient: ['#FF6B6B', '#4ECDC4'],
    count: 0 
  },
  { 
    id: 'stream_invitation', 
    label: 'Streams', 
    icon: 'live-tv',
    gradient: ['#FF9A9E', '#FECFEF'],
    count: 0 
  },
  { 
    id: 'stream_invite', 
    label: 'Invites', 
    icon: 'live-tv',
    gradient: ['#FF9A9E', '#FECFEF'],
    count: 0 
  },
  { 
    id: 'follow', 
    label: 'Followers', 
    icon: 'person-add',
    gradient: ['#A8EDEA', '#FED6E3'],
    count: 0 
  },
  { 
    id: 'gift', 
    label: 'Gifts', 
    icon: 'card-giftcard',
    gradient: ['#FFECD2', '#FCB69F'],
    count: 0 
  },
  { 
    id: 'like', 
    label: 'Likes', 
    icon: 'favorite',
    gradient: ['#FF8A80', '#FF80AB'],
    count: 0 
  }
];

const NotificationInboxScreen = () => {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // RTK Query hooks
  const { data, isLoading, refetch } = useGetInboxNotificationsQuery();
  const notifications = data?.notifications || [];
  const [markAsRead] = useMarkInboxNotificationAsReadMutation();
  const [clearAllNotifications] = useClearAllInboxNotificationsMutation();
  const [clearNotification] = useClearInboxNotificationMutation();

  // Real-time notification context
  const { stats: realtimeStats, isConnected } = useNotificationContext();

  // Compute derived state instead of using useState + useEffect
  const categories = React.useMemo(() => {
    return NOTIFICATION_CATEGORIES.map(cat => {
      if (cat.id === 'all') {
        return { ...cat, count: notifications.length };
      }
      const count = notifications.filter(n => n.notification_type === cat.id).length;
      return { ...cat, count };
    });
  }, [notifications]);

  const filteredNotifications = React.useMemo(() => {
    if (selectedCategory === 'all') {
      return notifications;
    } else {
      return notifications.filter(n => n.notification_type === selectedCategory);
    }
  }, [notifications, selectedCategory]);

  // Entrance animation (only runs once)
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []); // Empty dependency array - only run once

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleClearAll = () => {
    if (notifications.length === 0) {
      Alert.alert('No Notifications', 'There are no notifications to clear.');
      return;
    }

    Alert.alert(
      'Clear All Notifications',
      `Are you sure you want to permanently delete all ${notifications.length} notifications? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllNotifications().unwrap();
              Alert.alert('Success', 'All notifications have been cleared.');
            } catch (error) {
              console.error('Error clearing notifications:', error);
              Alert.alert('Error', 'Failed to clear notifications. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleClearNotification = (notificationId: number, title: string) => {
    Alert.alert(
      'Delete Notification',
      `Delete "${title}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearNotification(notificationId).unwrap();
            } catch (error) {
              console.error('Error clearing notification:', error);
              Alert.alert('Error', 'Failed to delete notification. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleNotificationPress = async (notification: any) => {
    try {
      console.log('🔔 Notification clicked:', {
        type: notification.notification_type,
        extra_data: notification.extra_data,
        related_object: notification.related_object,
        title: notification.title,
        message: notification.message
      });

      // Mark as read with beautiful animation
      if (!notification.is_read) {
        await markAsRead(notification.id).unwrap();
      }

      // Handle different notification types with smooth navigation
      switch (notification.notification_type) {
        case 'stream_invitation':
  case 'stream_invite':
          if (notification.related_object?.stream_id || notification.extra_data?.stream_id) {
            const streamId = notification.related_object?.stream_id || notification.extra_data?.stream_id;
            const streamMode = notification.extra_data?.stream_mode || 'single';
            
            // For guest invitations to multi-streams, navigate to participant page
            if (streamMode === 'multi') {
              router.push(`/stream/multi/${streamId}` as any);
            } else {
              // For single streams or viewer invitations, go to viewer page
              router.push(`/stream/viewer/${streamId}` as any);
            }
          }
          break;
        case 'follow':
          if (notification.sender?.username) {
            router.push(`/profile/${notification.sender.username}` as any);
          }
          break;
        default:
          console.log('Notification pressed:', notification);
      }
    } catch (error) {
      console.error('Error handling notification:', error);
      Alert.alert('Error', 'Failed to open notification');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'stream_invitation':
      case 'stream_invite': return 'live-tv';
      case 'follow': return 'person-add';
      case 'gift': return 'card-giftcard';
      case 'like': return 'favorite';
      case 'comment': return 'chat-bubble';
      default: return 'notifications';
    }
  };

  const getNotificationGradient = (type: string): [string, string] => {
    switch (type) {
      case 'stream_invitation':
      case 'stream_invite': return ['#667eea', '#764ba2'];
      case 'follow': return ['#f093fb', '#f5576c'];
      case 'gift': return ['#4facfe', '#00f2fe'];
      case 'like': return ['#fa709a', '#fee140'];
      case 'comment': return ['#a8edea', '#fed6e3'];
      default: return ['#667eea', '#764ba2'];
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date().getTime();
    const notificationTime = new Date(dateString).getTime();
    const diffInHours = Math.floor((now - notificationTime) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return `${Math.floor(diffInDays / 7)}w ago`;
  };

  const renderCategoryTab = ({ item, index }: { item: any, index: number }) => {
    const isSelected = selectedCategory === item.id;
    
    return (
      <TouchableOpacity
        onPress={() => setSelectedCategory(item.id)}
        className="mr-3"
        style={{ 
          transform: [{ 
            scale: isSelected ? 1.05 : 1 
          }]
        }}
      >
        <View className={`px-4 py-3 rounded-2xl ${isSelected ? 'shadow-lg' : ''}`}>
          {isSelected ? (
            <LinearGradient
              colors={item.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="absolute inset-0 rounded-2xl"
            />
          ) : (
            <View className="absolute inset-0 bg-gray-800/40 rounded-2xl" />
          )}
          
          <View className="flex-row items-center">
            <MaterialIcons 
              name={item.icon} 
              size={20} 
              color={isSelected ? '#FFFFFF' : '#9CA3AF'} 
            />
            <Text 
              className={`ml-2 font-semibold ${isSelected ? 'text-white' : 'text-gray-400'}`}
              style={{ fontFamily: fonts.semiBold }}
            >
              {item.label}
            </Text>
            {item.count > 0 && (
              <View className={`ml-2 px-2 py-1 rounded-full ${isSelected ? 'bg-white/20' : 'bg-red-500'}`}>
                <Text 
                  className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-white'}`}
                  style={{ fontFamily: fonts.bold }}
                >
                  {item.count > 99 ? '99+' : item.count}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderNotificationCard = ({ item, index }: { item: any, index: number }) => {
    return (
      <View className="mb-4">
        <TouchableOpacity
          onPress={() => handleNotificationPress(item)}
          activeOpacity={0.9}
        >
          <View className="bg-gray-900/60 backdrop-blur-xl rounded-3xl p-4 border border-gray-700/30">
            <BlurView intensity={20} className="absolute inset-0 rounded-3xl" />
            
            <View className="flex-row items-start space-x-4">
              {/* Notification Icon with Gradient */}
              <View className="relative">
                <View className="w-14 h-14 rounded-2xl overflow-hidden">
                  <LinearGradient
                    colors={getNotificationGradient(item.notification_type)}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="w-full h-full items-center justify-center"
                  >
                    <MaterialIcons 
                      name={getNotificationIcon(item.notification_type)} 
                      size={28} 
                      color="white" 
                    />
                  </LinearGradient>
                </View>
                
                {!item.is_read && (
                  <View className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-gray-900" />
                )}
              </View>

              {/* Notification Content */}
              <View className="flex-1">
                <Text 
                  className={`text-lg font-bold mb-1 ${!item.is_read ? 'text-white' : 'text-gray-300'}`}
                  style={{ fontFamily: fonts.bold }}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                
                <Text 
                  className={`text-sm mb-2 leading-5 ${!item.is_read ? 'text-gray-200' : 'text-gray-400'}`}
                  style={{ fontFamily: fonts.regular }}
                  numberOfLines={2}
                >
                  {item.message}
                </Text>

                {/* Sender Info */}
                {item.sender && (
                  <View className="flex-row items-center mb-3">
                    <View className="w-6 h-6 rounded-full bg-red-500 items-center justify-center mr-2">
                      <Text 
                        className="text-white text-xs font-bold"
                        style={{ fontFamily: fonts.bold }}
                      >
                        {item.sender.username?.charAt(0).toUpperCase() || 'U'}
                      </Text>
                    </View>
                    <Text 
                      className="text-gray-400 text-sm font-medium"
                      style={{ fontFamily: fonts.medium }}
                    >
                      From @{item.sender.username || 'unknown'}
                    </Text>
                  </View>
                )}

                {/* Time and Action */}
                <View className="flex-row items-center justify-between">
                  <Text 
                    className="text-gray-500 text-xs"
                    style={{ fontFamily: fonts.regular }}
                  >
                    {formatTimeAgo(item.created_at)}
                  </Text>
                  
                  <TouchableOpacity
                    onPress={() => handleNotificationPress(item)}
                    className="px-4 py-2 rounded-full overflow-hidden"
                  >
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      className="px-4 py-2 items-center justify-center"
                    >
                      <Text 
                        className="text-white text-xs font-semibold"
                        style={{ fontFamily: fonts.semiBold }}
                      >
                        View
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <StatusBar style="light" />
        <View className="flex-1 items-center justify-center">
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
          >
            <ActivityIndicator size="large" color="white" />
          </LinearGradient>
          <Text className="text-gray-400 text-lg font-medium" style={{ fontFamily: fonts.medium }}>
            Loading your notifications...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0B0B0B]">
      <StatusBar style="light" />
      
      {/* Minimal Header */}
      <Animated.View
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        <View className="border-b border-[#1E1E1E] px-6 pt-4 pb-5 flex-row items-center justify-between">
        <TouchableOpacity 
          onPress={() => router.back()} 
            className="w-10 h-10 rounded-full bg-[#151515] items-center justify-center"
        >
          <ArrowLeftIcon width={20} height={20} />
        </TouchableOpacity>
        
          <View className="items-center">
            <View className="flex-row items-center">
              <Text style={{ fontFamily: fonts.bold }} className="text-white text-xl">
                Notifications
              </Text>
              {/* Real-time connection indicator */}
              <View className={`ml-2 w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            </View>
            <Text style={{ fontFamily: fonts.medium }} className="text-[#8A8A8A] text-xs mt-1">
              {realtimeStats.total_notifications || notifications.length} total • {realtimeStats.unread_notifications || 0} unread
            </Text>
          </View>

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={onRefresh}
              className="w-10 h-10 rounded-full bg-[#151515] items-center justify-center"
            >
              <MaterialIcons name="refresh" size={20} color="#C42720" />
            </TouchableOpacity>
            
            {notifications.length > 0 && (
              <TouchableOpacity
                onPress={handleClearAll}
                className="w-10 h-10 rounded-full bg-[#151515] items-center justify-center"
              >
                <MaterialIcons name="clear-all" size={20} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>

      {/* Category Tabs */}
      <Animated.View style={{ opacity: fadeAnim }} className="py-3">
        <FlatList
          data={categories}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item.id;
            return (
              <TouchableOpacity
                onPress={() => setSelectedCategory(item.id)}
                className={`mr-2 px-4 py-2 rounded-full ${
                  isSelected ? 'bg-[#C42720]' : 'bg-[#151515]'
                }`}
              >
                <View className="flex-row items-center">
                  <MaterialIcons
                    name={item.icon as any}
                    size={16}
                    color={isSelected ? '#FFFFFF' : '#9CA3AF'}
                  />
                  <Text 
                    style={{ fontFamily: fonts.semiBold }} 
                    className={`ml-2 text-sm ${isSelected ? 'text-white' : 'text-[#CFCFCF]'}`}
                  >
                    {item.label}
                  </Text>
                  {item.count > 0 && (
                    <View
                      className={`ml-2 px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-white/15' : 'bg-[#232323]'
                      }`}
                    >
                  <Text 
                        style={{ fontFamily: fonts.bold }}
                        className={`text-2xs ${isSelected ? 'text-white' : 'text-[#A5A5A5]'}`}
                      >
                        {item.count > 99 ? '99+' : item.count}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        />
      </Animated.View>

      {/* Notifications List */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          flex: 1,
        }}
        className="flex-1"
      >
        {filteredNotifications.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <MaterialIcons name="notifications-none" size={56} color="#6B7280" />
            <Text
              className="text-white text-xl font-semibold mt-4"
              style={{ fontFamily: fonts.semiBold }}
            >
              You're all caught up
            </Text>
            <Text className="text-[#9CA3AF] mt-2 text-center" style={{ fontFamily: fonts.regular }}>
              New notifications will show up here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredNotifications}
            renderItem={({ item }) => (
              <View className="mb-3 px-4">
                <TouchableOpacity
                  onPress={() => handleNotificationPress(item)}
                  activeOpacity={0.9}
                >
                  <View className="bg-[#121212] border border-[#1E1E1E] rounded-2xl p-5">
                    <View className="flex-row items-start">
                      {/* Icon */}
                      <View className="w-10 h-10 rounded-full bg-[#1E1E1E] items-center justify-center mr-3">
                        <MaterialIcons name={getNotificationIcon(item.notification_type) as any} size={20} color="#9CA3AF" />
                      </View>
                      <View className="flex-1">
                        <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-base mb-1">
                          {item.title}
                        </Text>
                        <Text style={{ fontFamily: fonts.regular }} className="text-[#B3B3B3] text-sm mb-3">
                          {item.message}
                        </Text>
                        {item.sender && (
                          <Text style={{ fontFamily: fonts.medium }} className="text-[#8A8A8A] text-xs mb-3">
                            From @{item.sender.username || 'unknown'}
                          </Text>
                        )}
                        <View className="flex-row items-center justify-between">
                          <Text style={{ fontFamily: fonts.regular }} className="text-[#6B7280] text-xs">
                            {formatTimeAgo(item.created_at)}
                          </Text>
                          <MaterialIcons name="chevron-right" size={22} color="#6B7280" />
                        </View>
                      </View>
                      
                      <View className="flex-col items-center gap-2 ml-2">
                        {!item.is_read && <View className="w-2 h-2 bg-[#C42720] rounded-full" />}
                        <TouchableOpacity
                          onPress={() => handleClearNotification(item.id, item.title)}
                          className="w-8 h-8 rounded-full bg-[#1A1A1A] items-center justify-center"
                        >
                          <MaterialIcons name="close" size={16} color="#8A8A8A" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            )}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#C42720"
                colors={['#C42720']}
                progressBackgroundColor="#1A1A1A"
              />
            }
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

export default NotificationInboxScreen;