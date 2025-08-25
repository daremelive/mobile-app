import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, Image, RefreshControl, Alert, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch (error) {
  // ImagePicker not available
}

// Import SVG assets
import ArrowLeftIcon from '../../../assets/icons/arrow-left.svg';
import EditIcon from '../../../assets/icons/edit-icon.svg';
import ChevronRightIcon from '../../../assets/icons/chevron-down.svg';
import ShareIcon from '../../../assets/icons/ShareIcon.svg';
import AccountIcon from '../../../assets/icons/user.svg';
import LanguageIcon from '../../../assets/icons/language-circle.svg';
import ProfileNotificationIcon from '../../../assets/icons/notification-02.svg';
import BlockedIcon from '../../../assets/icons/blocked.svg';
import UnlockIcon from '../../../assets/icons/lock-key.svg';
import WalletIcon from '../../../assets/icons/wallet-04.svg';
import PayoutIcon from '../../../assets/icons/payout.svg';
import IdentityIcon from '../../../assets/icons/user-id-verification.svg';
import TransactionIcon from '../../../assets/icons/transaction.svg';
import LogoutIcon from '../../../assets/icons/logout-01.svg';
import SentIcon from '../../../assets/icons/sent.svg';
import { useLogoutMutation, useGetProfileQuery, useUploadProfilePictureMutation } from '../../../src/store/authApi';
import { useGetMyStreamsQuery, useStreamActionMutation, streamsApi } from '../../../src/store/streamsApi';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectRefreshToken, selectCurrentUser } from '../../../src/store/authSlice';
import LogoutConfirmationModal from '../../../components/modals/LogoutConfirmationModal';
import ipDetector from '../../../src/utils/ipDetector';

type MenuItem = {
  title: string;
  Icon: React.FC<{ width: number; height: number }>;
  route?: string;
};

const ProfileScreen = () => {
  const router = useRouter();
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const dispatch = useDispatch();
  const refreshToken = useSelector(selectRefreshToken);
  const currentUser = useSelector(selectCurrentUser);
  const [logoutMutation, { isLoading: isLoggingOut }] = useLogoutMutation();
  const { data: profileData, isLoading: isLoadingProfile, refetch: refetchProfile } = useGetProfileQuery();
  const [uploadProfilePicture, { isLoading: isUploadingPicture }] = useUploadProfilePictureMutation();
  const { data: myStreams } = useGetMyStreamsQuery();
  const [streamAction] = useStreamActionMutation();

  const isImagePickerAvailable = ImagePicker && ImagePicker.requestMediaLibraryPermissionsAsync;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchProfile();
    } catch (error) {
      // Handle refresh error silently
    } finally {
      setRefreshing(false);
    }
  };

  const handleProfilePictureUpload = async () => {
    try {
      if (!isImagePickerAvailable) {
        Alert.alert(
          'Development Build Required', 
          'Profile picture upload requires a development build with expo-image-picker. This feature is not available in Expo Go.\n\nTo enable this feature:\n1. Run "npx expo run:ios --device" to create a development build\n2. Install the build on your device\n3. Connect to this development server',
          [
            { text: 'OK', style: 'default' }
          ]
        );
        return;
      }

      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'You need to enable permission to access photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const image = result.assets[0];
        
        const formData = new FormData();
        formData.append('profile_picture', {
          uri: image.uri,
          type: image.type || 'image/jpeg',
          name: 'profile.jpg',
        } as any);

        await uploadProfilePicture(formData).unwrap();
        
        refetchProfile();
        
        Alert.alert('Success', 'Profile picture updated successfully!');
      }
    } catch (error: any) {
      Alert.alert(
        'Upload Failed', 
        error?.data?.error || 'Failed to upload profile picture. Please try again.'
      );
    }
  };

  const handleLogout = async () => {
    try {
      // First, end any active streams
      if (myStreams && myStreams.length > 0) {
        const activeStreams = myStreams.filter(stream => stream.status === 'live');
        
        if (activeStreams.length > 0) {
          console.log(`Ending ${activeStreams.length} active stream(s) before logout...`);
          
          // End all active streams
          for (const stream of activeStreams) {
            try {
              await streamAction({ 
                streamId: stream.id, 
                action: { action: 'end' } 
              }).unwrap();
              console.log(`Stream ${stream.id} ended successfully`);
            } catch (streamError) {
              console.error(`Failed to end stream ${stream.id}:`, streamError);
              // Continue with logout even if stream ending fails
            }
          }
          
          // Invalidate streams cache
          dispatch(streamsApi.util.invalidateTags(['Stream']));
        }
      }

      // Then proceed with normal logout
      if (refreshToken) {
        await logoutMutation({ refresh: refreshToken }).unwrap();
      }
    } catch (error) {
      console.error('Logout process error:', error);
      // Continue with logout even if server call fails
    } finally {
      dispatch(logout());
      setLogoutModalVisible(false);
      router.replace('/(auth)/signin');
    }
  };

  const handleShare = async () => {
    try {
      const detection = await ipDetector.detectIP();
      let baseUrl;
      
      if (detection.ip === 'daremelive.pythonanywhere.com') {
        baseUrl = `https://${detection.ip}`;
      } else {
        baseUrl = `http://${detection.ip}:8000`;
      }
      
      const profileUrl = `${baseUrl}/profile/${profileData?.username || currentUser?.username}?utm_source=mobile_share&utm_medium=social`;
      const userName = profileData?.full_name || currentUser?.full_name || profileData?.username || currentUser?.username;
      
      await Share.share({
        message: `Check out ${userName}'s profile on DareMe! 🎬🔥\n\nFollow them for amazing live streams and content!\n\n${profileUrl}`,
        url: profileUrl,
      });
    } catch (error) {
      console.error('Failed to share profile:', error);
      Alert.alert('Share Failed', 'Unable to share profile. Please try again.');
    }
  };

  const menuItems: MenuItem[] = [
    { title: 'Account', Icon: AccountIcon, route: '/account' },
    { title: 'Language', Icon: LanguageIcon, route: '/language' },
    { title: 'Notification', Icon: ProfileNotificationIcon, route: '/notifications' },
    { title: 'Blocked List', Icon: BlockedIcon, route: '/blocked-list' },
    { title: 'Unlock level', Icon: UnlockIcon, route: '/unlock-level'},
  ];

  const walletItems: MenuItem[] = [
    { title: 'Wallet', Icon: WalletIcon, route: '/wallet'},
    { title: 'Transactions', Icon: TransactionIcon, route: '/transactions'},
    { title: 'Payout', Icon: PayoutIcon, route: '/enter-bank-details'},
    { title: 'Identity Verification', Icon: IdentityIcon, route: '/identity-verification'},
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

      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }} // Add sufficient bottom padding for tab bar
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF0000"
            colors={["#FF0000"]}
            progressBackgroundColor="#1A1A1A"
          />
        }
      >
        <View className="items-center px-4">
          <View className="relative">
            {(profileData?.profile_picture_url || currentUser?.profile_picture_url) ? (
              <Image
                source={{ 
                  uri: profileData?.profile_picture_url || currentUser?.profile_picture_url || ''
                }}
                className="w-28 h-28 rounded-full border-2 border-[#C42720]"
              />
            ) : (
              <View className="w-28 h-28 rounded-full border-2 border-[#C42720] bg-[#2A2A2A] items-center justify-center">
                <Text className="text-white text-3xl font-bold">
                  {(() => {
                    const firstName = profileData?.first_name || currentUser?.first_name || '';
                    const lastName = profileData?.last_name || currentUser?.last_name || '';
                    const username = profileData?.username || currentUser?.username || '';
                    
                    if (firstName && lastName) {
                      return `${firstName[0]}${lastName[0]}`.toUpperCase();
                    } else if (firstName) {
                      return firstName[0].toUpperCase();
                    } else if (username) {
                      return username[0].toUpperCase();
                    }
                    return 'U';
                  })()}
                </Text>
              </View>
            )}
            <TouchableOpacity 
              className="absolute bottom-0 right-0"
              onPress={handleProfilePictureUpload}
              disabled={isUploadingPicture || !isImagePickerAvailable}
            >
               <View className={`w-8 h-8 rounded-full items-center justify-center ${
                 isUploadingPicture ? 'bg-gray-400' : 
                 !isImagePickerAvailable ? 'bg-gray-500' : 
                 'bg-gray-600'
               }`}>
                <EditIcon width={20} height={20} />
              </View>
            </TouchableOpacity>
          </View>

          <Text className="text-white text-2xl font-bold mt-4">
            {profileData ? `${profileData.first_name} ${profileData.last_name}` : currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Loading...'}
          </Text>
          <Text className="text-[#666] text-base">
            @{profileData?.username || currentUser?.username || 'loading'}
          </Text>
          
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
               onPress={handleShare}
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
              <Text className="text-white text-lg font-bold">
                {profileData?.following_count || currentUser?.following_count || 0}
              </Text>
              <Text className="text-[#666]">Following</Text>
            </View>
            <View className="items-center">
              <Text className="text-white text-lg font-bold">
                {profileData?.followers_count || currentUser?.followers_count || 0}
              </Text>
              <Text className="text-[#666]">Followers</Text>
            </View>
            <View className="items-center">
              <Text className="text-white text-lg font-bold">
                {profileData?.total_likes_count || currentUser?.total_likes_count || 0}
              </Text>
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
                  router.push('/wallet');
                } else if (item.title === 'Transactions') {
                  router.push('/transactions');
                } else if (item.route) {
                  router.push(item.route as any);
                }
              }}
                disabled={!item.route && item.title !== 'Wallet' && item.title !== 'Transactions'}
              >
                <View className="w-8 h-8 p-6 rounded-full justify-center items-center mr-4 bg-[#2A2A2A]">
                  <item.Icon width={20} height={20}/>
                </View>
                <Text className="text-white text-base flex-1">{item.title}</Text>
                <ChevronRightIcon width={24} height={24} fill="#666" style={{ transform: [{ rotate: '-90deg' }] }} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity 
            className="bg-[#1A1A1A] w-full rounded-lg mt-4 mb-4 p-4 flex-row items-center"
            onPress={() => setLogoutModalVisible(true)}
          >
            <View className="w-8 h-8 p-6 rounded-full justify-center items-center mr-4 bg-[#2A2A2A]">
                <LogoutIcon width={20} height={20} />
            </View>
            <Text className="text-white text-base flex-1">Log Out</Text>
            <ChevronRightIcon width={24} height={24} style={{ transform: [{ rotate: '-90deg' }] }} />
          </TouchableOpacity>
        </View>
      </ScrollView>
      <LogoutConfirmationModal
        visible={isLogoutModalVisible}
        onClose={() => setLogoutModalVisible(false)}
        onConfirm={handleLogout}
        hasActiveStreams={myStreams ? myStreams.some(stream => stream.status === 'live') : false}
      />
    </SafeAreaView>
  );
};

export default ProfileScreen; 