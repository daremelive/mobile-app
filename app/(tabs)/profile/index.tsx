import React from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

// Import SVG assets
import ArrowLeftIcon from '../../../assets/icons/arrow-left.svg';
import EditIcon from '../../../assets/icons/edit-icon.svg'; // Assuming edit-icon.svg exists
import ChevronRightIcon from '../../../assets/icons/chevron-down.svg'; // Assuming chevron-right.svg exists and needs transform
import ShareIcon from '../../../assets/icons/ShareIcon.svg';
import AccountIcon from '../../../assets/icons/user.svg';
import LanguageIcon from '../../../assets/icons/language-circle.svg';
import ProfileNotificationIcon from '../../../assets/icons/notification-02.svg';
import BlockedIcon from '../../../assets/icons/blocked.svg';
import UnlockIcon from '../../../assets/icons/lock-key.svg';
import WalletIcon from '../../../assets/icons/wallet-04.svg';
import PayoutIcon from '../../../assets/icons/payout.svg';
import IdentityIcon from '../../../assets/icons/user-id-verification.svg';
import LogoutIcon from '../../../assets/icons/logout-01.svg';
import SentIcon from '../../../assets/icons/sent.svg';

type MenuItem = {
  title: string;
  Icon: React.FC<{ width: number; height: number }>;
  route?: string;
};

const ProfileScreen = () => {
  const router = useRouter();

  const menuItems: MenuItem[] = [
    { title: 'Account', Icon: AccountIcon, route: '/account' },
    { title: 'Language', Icon: LanguageIcon, route: '/language' },
    { title: 'Notification', Icon: ProfileNotificationIcon},
    { title: 'Blocked List', Icon: BlockedIcon},
    { title: 'Unlock level', Icon: UnlockIcon},
  ];

  const walletItems: MenuItem[] = [
    { title: 'Wallet', Icon: WalletIcon, route: '../../../wallet'},
    { title: 'Payout', Icon: PayoutIcon},
    { title: 'Identity Verification', Icon: IdentityIcon},
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      <View className="flex-row items-center relative px-4 pt-3 pb-3 mb-3">
        <TouchableOpacity onPress={() => router.back()} className="absolute left-4 z-10">
          <View className="w-14 h-14 bg-[#1A1A1A] rounded-full justify-center items-center">
            <ArrowLeftIcon width={24} height={24} />
          </View>
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-white text-[20px] font-semibold">Your Profile</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="items-center px-4">
          <View className="relative">
            <Image
              source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }}
              className="w-28 h-28 rounded-full border-2 border-[#C42720]"
            />
            <TouchableOpacity className="absolute bottom-0 right-0">
               <View className="w-8 h-8 bg-gray-600 rounded-full items-center justify-center">
                <EditIcon width={20} height={20} />
              </View>
            </TouchableOpacity>
          </View>

          <Text className="text-white text-2xl font-bold mt-4">Modesta Ekeh</Text>
          <Text className="text-[#666] text-base">@momo</Text>
          
          <View className="w-[70%] h-[52px] rounded-full overflow-hidden mt-4 mb-6">
           <LinearGradient
             colors={['#FF0000', '#330000']}
             locations={[0, 1]}
             start={{ x: 0, y: 0 }}
             end={{ x: 1, y: 0 }}
             className="w-full h-full"
           >
             <TouchableOpacity 
               className="w-full h-full items-center justify-center"
               onPress={() => router.push('/')}
             >
               <View className="flex-row items-center gap-3">
                 <Text className="text-white text-xl font-semibold">Share Profile Link</Text>
                 <View className="w-6 h-6 rounded-full justify-center items-center">
                   <SentIcon width={24} height={24} />
                 </View>
               </View>
              </TouchableOpacity>
           </LinearGradient>
         </View>

          <View className="flex-row justify-between w-full mt-6">
            <View className="items-center">
              <Text className="text-white text-lg font-bold">720</Text>
              <Text className="text-[#666]">Following</Text>
            </View>
            <View className="items-center">
              <Text className="text-white text-lg font-bold">720</Text>
              <Text className="text-[#666]">Followers</Text>
            </View>
            <View className="items-center">
              <Text className="text-white text-lg font-bold">720</Text>
              <Text className="text-[#666]">Likes</Text>
            </View>
          </View>

          <View className="bg-[#1A1A1A] w-full rounded-lg mt-6">
            {menuItems.map((item, index) => (
              <TouchableOpacity 
                key={index} 
                className="flex-row items-center p-4"
                onPress={() => item.route && router.push(item.route as any)}
                disabled={!item.route}
              >
                <View className="w-8 h-8 p-6 rounded-full justify-center items-center mr-4 bg-[#2A2A2A]">
                  <item.Icon width={20} height={20} />
                </View>
                <Text className="text-white text-base flex-1">{item.title}</Text>
                <ChevronRightIcon width={24} height={24} fill="#666" style={{ transform: [{ rotate: '-90deg' }] }} />
              </TouchableOpacity>
            ))}
          </View>

          <View className="bg-[#1A1A1A] w-full rounded-lg mt-4">
            {walletItems.map((item, index) => (
              <TouchableOpacity 
                key={index} 
                className="flex-row items-center p-4"
                onPress={() => {
                  if (item.title === 'Wallet') {
                    router.push('/wallet' as any);
                  }
                }}
              >
                <View className="w-8 h-8 p-6 rounded-full justify-center items-center mr-4 bg-[#2A2A2A]">
                  <item.Icon width={20} height={20}/>
                </View>
                <Text className="text-white text-base flex-1">{item.title}</Text>
                <ChevronRightIcon width={24} height={24} fill="#666" style={{ transform: [{ rotate: '-90deg' }] }} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity className="bg-[#1A1A1A] w-full rounded-lg mt-4 mb-8 p-4 flex-row items-center">
            <View className="w-8 h-8 p-6 rounded-full justify-center items-center mr-4 bg-[#2A2A2A]">
                <LogoutIcon width={20} height={20} />
            </View>
            <Text className="text-white text-base flex-1">Log Out</Text>
            <ChevronRightIcon width={24} height={24} style={{ transform: [{ rotate: '-90deg' }] }} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen; 