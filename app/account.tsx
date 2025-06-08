import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, SectionList } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import ChevronRightIcon from '../assets/icons/chevron-down.svg';
import BlockedIcon from '../assets/icons/blocked.svg';
import DeactivateAccountConfirmationModal from '../components/modals/DeactivateAccountConfirmationModal';

const SECTIONS = [
  {
    title: 'Personal Information',
    data: [
      { key: '1', label: 'Full Name', value: 'Modesta Ekeh', route: '/edit-name' },
      { key: '2', label: 'Username', value: 'momo', route: '/edit-username' },
      { key: '3', label: 'Phone', value: '+234 810 1010 1010', route: '/edit-phone' },
      { key: '4', label: 'Country', value: 'Nigeria' },
    ],
  },
  {
    title: 'Privacy',
    data: [
      { key: '5', label: 'Password', value: '**********', route: '/edit-password' },
      { key: '6', label: 'Enable Two-step Verification', value: '' },
    ],
  },
];

const AccountScreen = () => {
  const router = useRouter();
  const [isModalVisible, setModalVisible] = useState(false);

  const handleDeactivate = () => {
    setModalVisible(true);
  };

  const handleConfirmDeactivation = () => {
    console.log('Account deactivation confirmed');
    // Add logic to deactivate account
    setModalVisible(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      <View className="flex-row items-center relative px-4 pt-3 pb-3 mb-6">
        <TouchableOpacity onPress={() => router.back()} className="absolute left-4 z-10">
          <View className="w-14 h-14 bg-[#1A1A1A] rounded-full justify-center items-center">
            <ArrowLeftIcon width={24} height={24}/>
          </View>
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-white text-[20px] font-semibold">Account</Text>
        </View>
      </View>

      <SectionList
        sections={SECTIONS}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <TouchableOpacity 
            className="flex-row items-center justify-between px-4 py-4 bg-[#1A1A1A] border-b border-[#333]"
            onPress={() => item.route && router.push(item.route as any)}
            disabled={!item.route}
          >
            <Text className="text-white text-base">{item.label}</Text>
            <View className="flex-row items-center">
              <Text className="text-[#666] text-base mr-2">{item.value}</Text>
              <ChevronRightIcon width={24} height={24} fill="#666" style={{ transform: [{ rotate: '-90deg' }]}} />
            </View>
          </TouchableOpacity>
        )}
        renderSectionHeader={({ section: { title } }) => (
          <Text className="text-[#666] text-sm font-semibold px-4 py-2 mt-4">{title}</Text>
        )}
        ListFooterComponent={
            <View className="rounded-md mt-8">
                <TouchableOpacity className="flex-row items-center bg-[#1A1A1A] p-4 rounded-lg" onPress={handleDeactivate}>
                    <View className="w-8 h-8 p-6 rounded-full justify-center items-center mr-4 bg-[#2A2A2A]">
                        <BlockedIcon width={20} height={20} />
                    </View>
                    <Text className="text-[#666] text-base ml-3 flex-1">Deactivate Account</Text>
                    <ChevronRightIcon width={24} height={24} style={{ transform: [{ rotate: '-90deg' }]}} />
                </TouchableOpacity>
            </View>
        }
        contentContainerStyle={{ marginHorizontal: 10 }}
      />
      <DeactivateAccountConfirmationModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        onConfirm={handleConfirmDeactivation}
      />
    </SafeAreaView>
  );
};

export default AccountScreen; 