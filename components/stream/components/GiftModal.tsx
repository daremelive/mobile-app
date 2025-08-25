import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, RefreshControl, Image, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CancelIcon from '../../../assets/icons/cancel.svg';
import GiftModalIcon from '../../../assets/icons/gift-modal.svg';
import GiftIcon from '../../../assets/icons/gift.svg';

interface Gift {
  id: number;
  name: string;
  icon_url: string;
  cost: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface GiftModalProps {
  visible: boolean;
  onClose: () => void;
  gifts: Gift[];
  onSendGift: (gift: Gift) => void;
  onBuyCoins: () => void;
  walletBalance: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  baseURL: string;
}

export const GiftModal = ({
  visible,
  onClose,
  gifts,
  onSendGift,
  onBuyCoins,
  walletBalance,
  isRefreshing,
  onRefresh,
  baseURL
}: GiftModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter gifts based on search query
  const filteredGifts = gifts.filter(gift =>
    gift.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-[#1A1A1A]/80 rounded-t-3xl" style={{ height: '70%' }}>
          {/* Header */}
          <View className="items-center py-6">
            <View className="w-12 h-1 bg-gray-600 rounded-full mb-4" />
            
            {/* Close Button */}
            <TouchableOpacity
              onPress={onClose}
              className="absolute top-4 right-4 w-12 h-12 rounded-full bg-gray-500 items-center justify-center"
            >
              <CancelIcon width={20} height={20} />
            </TouchableOpacity>
            
            {/* Gift Icon */}
            <View className="mb-2">
              <GiftModalIcon width={40} height={40} />
            </View>
            
            {/* Title */}
            <Text className="text-white text-xl font-bold mb-2">Send Gift</Text>
            
            {/* Total Balance */}
            <View className="flex-row items-center bg-gray-800/50 px-4 py-2 rounded-full">
              <Text className="text-gray-300 text-sm mr-2">Your Balance:</Text>
              <Ionicons name="diamond" size={18} color="#60A5FA" />
              <Text className="text-yellow-400 font-bold ml-1 text-lg">{walletBalance}</Text>
              <Text className="text-gray-400 text-sm ml-1">Riz</Text>
            </View>
          </View>

          {/* Search Bar */}
          <View className="px-6 mb-4">
            <View className="bg-gray-800/60 rounded-full border border-gray-700 px-4 py-2 flex-row items-center">
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                placeholder="Search"
                placeholderTextColor="#62636E"
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 text-white ml-3 text-base"
              />
            </View>
          </View>

          {/* Gifts Grid */}
          <ScrollView
            className="flex-1 px-6"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor="#fff"
              />
            }
          >
            <View className="flex-row flex-wrap justify-between pb-8" style={{ gap: 16 }}>
              {filteredGifts.map((gift) => (
                <TouchableOpacity
                  key={gift.id}
                  onPress={() => onSendGift(gift)}
                  style={{ width: '22%' }}
                  activeOpacity={0.7}
                >
                  <View className="items-center relative">
                    {/* Insufficient funds overlay */}
                    {walletBalance < gift.cost && (
                      <View className="absolute top-0 left-0 right-0 bottom-0 z-10 items-center justify-center">
                        <View className="bg-black/60 rounded-full px-2 py-1">
                          <Text className="text-orange-400 text-xs font-semibold">
                            Need {gift.cost - walletBalance} more
                          </Text>
                        </View>
                      </View>
                    )}
                    
                    {/* Circular Gift Icon Container */}
                    <View 
                      className="rounded-full bg-gray-700/60 items-center justify-center mb-2"
                      style={{ width: 64, height: 64 }}
                    >
                      <Image
                        source={{ uri: gift.icon_url }}
                        style={{ width: 30, height: 30 }}
                        resizeMode="contain"
                        onError={(error) => {
                          // Gift image failed to load - error handling without debug logs
                        }}
                        onLoad={() => {
                          // Gift image loaded successfully
                        }}
                      />
                    </View>
                    
                    {/* Gift Name */}
                    <Text 
                      className="text-white text-xs font-medium text-center mb-1" 
                      numberOfLines={1}
                      style={{ fontSize: 11 }}
                    >
                      {gift.name}
                    </Text>
                    
                    {/* Cost with Diamond Icon */}
                    <View className="flex-row items-center">
                      <Ionicons name="diamond" size={12} color="#60A5FA" />
                      <Text className="text-blue-400 text-xs font-semibold ml-1">
                        {gift.cost}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Helpful tip */}
            <View className="mt-4 mb-2 px-4 py-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Text className="text-blue-300 text-center text-sm">
                💡 Tap any gift to send it! Need more Riz? Use the button below.
              </Text>
            </View>

            {/* Get More Coins Button */}
            <View className="px-6 pb-8">
              <TouchableOpacity onPress={onBuyCoins} activeOpacity={0.8}>
                <View className="bg-white py-4 rounded-full items-center shadow-lg">
                  <Text className="text-black text-lg font-bold">Get More Riz</Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
