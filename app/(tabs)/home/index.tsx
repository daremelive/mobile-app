import React from 'react';
import { View, Text, SafeAreaView, ScrollView, TextInput, Image, TouchableOpacity } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { fonts } from '../../../constants/Fonts';

const categories = ['All', 'Video', 'Game', 'Truth/Dare', 'Banter'];

const followingUsers = [
  { id: 1, image: 'https://picsum.photos/200', isLive: false },
  { id: 2, image: 'https://picsum.photos/201', isLive: true },
  { id: 3, image: 'https://picsum.photos/202', isLive: false },
  { id: 4, image: 'https://picsum.photos/203', isLive: true },
  { id: 5, image: 'https://picsum.photos/204', isLive: false },
];

const popularChannels = [
  {
    id: 1,
    title: 'Marriage Sacrifices',
    username: '@judennam',
    viewers: '8.9k',
    image: 'https://picsum.photos/400/500',
  },
  {
    id: 2,
    title: 'Marriage Sacrifices',
    username: '@judennam',
    viewers: '8.9k',
    image: 'https://picsum.photos/400/501',
  },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#090909' }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 16 }}>
          {/* Header */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ 
              color: '#FFFFFF', 
              fontSize: 24, 
              fontWeight: '600',
              marginBottom: 4,
              fontFamily: fonts.semiBold,
            }}>
              Connect with your
            </Text>
            <Text style={{ 
              color: '#C42720', 
              fontSize: 24, 
              fontWeight: '700',
              fontFamily: fonts.bold,
            }}>
              Favorite Streamers!
            </Text>
          </View>

          {/* Search Bar */}
          <View style={{ 
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: '#353638',
            paddingHorizontal: 12,
            marginBottom: 24,
            height: 44,
          }}>
            <HugeiconsIcon icon={Search01Icon} size={20} color="#FFFFFF" />
            <TextInput
              placeholder="Search"
              placeholderTextColor="#757688"
              style={{
                flex: 1,
                color: '#FFFFFF',
                marginLeft: 8,
                fontSize: 16,
                fontFamily: fonts.regular,
              }}
            />
          </View>

          {/* Categories */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 32 }}
          >
            {categories.map((category, index) => (
              <TouchableOpacity
                key={category}
                style={{
                  backgroundColor: index === 0 ? '#FFFFFF' : '#1C1C1E',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 10,
                  marginRight: 8,
                }}
              >
                <Text
                  style={{
                    color: index === 0 ? '#000000' : '#FFFFFF',
                    fontSize: 14,
                    fontFamily: fonts.bold,
                  }}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Following Section */}
          <View style={{ marginBottom: 32 }}>
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Text style={{ 
                color: '#FFFFFF', 
                fontSize: 18, 
                fontFamily: fonts.semiBold,
              }}>
                Following
              </Text>
              <TouchableOpacity 
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center',
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  borderRadius: 6,
                }}
              >
                <Text style={{ 
                  color: '#666666', 
                  fontSize: 14, 
                  marginRight: 4, 
                  fontFamily: fonts.bold,
                }}>
                  View All
                </Text>
                <MaterialIcons name="north-east" size={16} color="#666666" />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, marginBottom: 12 }}>
              {followingUsers.map((user) => (
                <View key={user.id} style={{ marginRight: 12, position: 'relative' }}>
                  <Image
                    source={{ uri: user.image }}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 30,
                      borderWidth: 2,
                      borderColor: '#C42720',
                    }}
                  />
                  {user.isLive && (
                    <View style={{
                      position: 'absolute',
                      bottom: -4,
                      alignSelf: 'center',
                      backgroundColor: '#C42720',
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 10,
                    }}>
                      <Text style={{ 
                        color: '#FFFFFF', 
                        fontSize: 10, 
                        fontWeight: '600',
                        fontFamily: fonts.semiBold,
                      }}>
                        Live
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Popular Channels */}
          <View>
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Text style={{ 
                color: '#FFFFFF', 
                fontSize: 18, 
                fontFamily: fonts.semiBold,
              }}>
                Popular Channels
              </Text>
              <TouchableOpacity 
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center',
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  borderRadius: 6,
                }}
              >
                <Text style={{ 
                  color: '#666666', 
                  fontSize: 14, 
                  marginRight: 4, 
                  fontFamily: fonts.extraBold,
                }}>
                  View All
                </Text>
                <MaterialIcons name="north-east" size={16} color="#666666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {popularChannels.map((channel) => (
                <View 
                  key={channel.id}
                  style={{
                    width: 190,
                    height: 260,
                    borderRadius: 12,
                    overflow: 'hidden',
                    backgroundColor: '#1C1C1E',
                  }}
                >
                  <View style={{ position: 'relative', flex: 1 }}>
                    <Image
                      source={{ uri: channel.image }}
                      style={{
                        width: '100%',
                        height: '100%',
                      }}
                    />
                    <View style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                    }}>
                      <Text style={{ 
                        color: '#FFFFFF', 
                        fontSize: 12,
                        fontFamily: fonts.regular,
                      }}>
                        {channel.viewers}
                      </Text>
                    </View>
                    <BlurView
                      intensity={30}
                      tint="dark"
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: 12,
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      <Text style={{ 
                        color: '#FFFFFF',
                        fontSize: 16,
                        fontWeight: '600',
                        marginBottom: 4,
                        fontFamily: fonts.semiBold,
                      }}>
                        {channel.title}
                      </Text>
                      <Text style={{ 
                        color: '#666666', 
                        fontSize: 14,
                        fontFamily: fonts.regular,
                      }}>
                        {channel.username}
                      </Text>
                    </BlurView>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
