import React from 'react';
import { Tabs } from 'expo-router';
import { View, Platform, Image } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { AuthGuard } from '../../src/components/AuthGuard';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../src/store/authSlice';
import { useGetProfileQuery } from '../../src/store/authApi';
import { 
  Home04Icon, 
  Search01Icon, 
  Add01Icon, 
  Message01Icon
} from '@hugeicons/core-free-icons';

export default function TabLayout() {
  const currentUser = useSelector(selectCurrentUser);
  const { data: profileData } = useGetProfileQuery();

  return (
    <AuthGuard>
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#090909',
          borderTopColor: '#353638',
          height: Platform.OS === 'ios' ? 85 : 65,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 10,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#C42720',
        tabBarInactiveTintColor: '#FFFFFF',
      }}
    >
      <Tabs.Screen
        name="home/index"
        options={{
          tabBarIcon: ({ focused }) => (
            <HugeiconsIcon 
              icon={Home04Icon}
              size={30}
              color={focused ? '#C42720' : '#FFFFFF'}
              strokeWidth={2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search/index"
        options={{
          tabBarIcon: ({ focused }) => (
            <HugeiconsIcon 
              icon={Search01Icon}
              size={30}
              color={focused ? '#C42720' : '#FFFFFF'}
              strokeWidth={2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="create/index"
        options={{
          tabBarIcon: ({ focused }) => (
            <View className={`w-[70px] h-[70px] rounded-full justify-center items-center shadow-lg ${Platform.OS === 'ios' ? 'mb-14' : ''} ${focused ? 'bg-[#C42720]' : 'bg-[#353638]'}`}>
              <HugeiconsIcon 
                icon={Add01Icon}
                size={30}
                color="#FFFFFF"
                strokeWidth={2}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages/index"
        options={{
          tabBarIcon: ({ focused }) => (
            <HugeiconsIcon 
              icon={Message01Icon}
              size={30}
              color={focused ? '#C42720' : '#FFFFFF'}
              strokeWidth={2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          tabBarIcon: ({ focused }) => (
            <View className={`w-8 h-8 rounded-full justify-center items-center bg-white border ${focused ? 'border-[#530774]' : 'border-transparent'}`}>
              <View className="w-7 h-7 rounded-full overflow-hidden">
                <Image
                  source={{ 
                    uri: profileData?.profile_picture_url || 
                         currentUser?.profile_picture_url || 
                         'https://picsum.photos/200' 
                  }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="messages/new"
        options={{ href: null }}
      />
    </Tabs>
    </AuthGuard>
  );
}
