import React from 'react';
import { Tabs } from 'expo-router';
import { View, Platform, Image } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { 
  Home04Icon, 
  Search01Icon, 
  AddCircleHalfDotIcon, 
  BubbleChatIcon
} from '@hugeicons/core-free-icons';

// Import custom SVG icons
// import HomeIcon from '../../assets/icons/home-icon.svg';
// import SearchIcon from '../../assets/icons/search-icon.svg';
// import AddIcon from '../../assets/icons/add-icon.svg';
// import ChatIcon from '../../assets/icons/chat-icon.svg';

const TAB_ICON_SIZE = 30;
const ACTIVE_COLOR = '#C42720';
const INACTIVE_COLOR = '#FFFFFF';
const TAB_BAR_BACKGROUND = '#090909';
const CREATE_BUTTON_SIZE = 70;
const PROFILE_IMAGE_SIZE = 28;
const PROFILE_BORDER_COLOR = '#530774';
const PROFILE_BORDER_WIDTH = 1;
const PROFILE_PADDING = 1;
const CREATE_BUTTON_INACTIVE_COLOR = '#353638';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: TAB_BAR_BACKGROUND,
          // borderTopWidth: 1,
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
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
      }}
    >
      <Tabs.Screen
        name="home/index"
        options={{
          tabBarIcon: ({ focused }) => (
            <HugeiconsIcon 
              icon={Home04Icon}
              size={TAB_ICON_SIZE}
              color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
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
              size={TAB_ICON_SIZE}
              color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
              strokeWidth={2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="create/index"
        options={{
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                backgroundColor: focused ? ACTIVE_COLOR : CREATE_BUTTON_INACTIVE_COLOR,
                borderRadius: CREATE_BUTTON_SIZE / 2,
                width: CREATE_BUTTON_SIZE,
                height: CREATE_BUTTON_SIZE,
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
                marginBottom: Platform.OS === 'ios' ? 55 : 0,
                position: 'relative',
              }}
            > 
              <HugeiconsIcon 
                icon={AddCircleHalfDotIcon}
                size={TAB_ICON_SIZE}
                color="#FFFFFF"
                strokeWidth={2}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{
          tabBarIcon: ({ focused }) => (
            <HugeiconsIcon 
              icon={BubbleChatIcon}
              size={TAB_ICON_SIZE}
              color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
              strokeWidth={2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: PROFILE_IMAGE_SIZE + (PROFILE_BORDER_WIDTH + PROFILE_PADDING) * 2,
                height: PROFILE_IMAGE_SIZE + (PROFILE_BORDER_WIDTH + PROFILE_PADDING) * 2,
                borderRadius: (PROFILE_IMAGE_SIZE + (PROFILE_BORDER_WIDTH + PROFILE_PADDING) * 2) / 2,
                borderWidth: PROFILE_BORDER_WIDTH,
                borderColor: focused ? PROFILE_BORDER_COLOR : 'transparent',
                backgroundColor: '#FFFFFF',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: PROFILE_IMAGE_SIZE,
                  height: PROFILE_IMAGE_SIZE,
                  borderRadius: PROFILE_IMAGE_SIZE / 2,
                  overflow: 'hidden',
                }}
              >
                <Image
                  source={{ uri: 'https://picsum.photos/200' }}
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                  resizeMode="cover"
                />
              </View>
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
