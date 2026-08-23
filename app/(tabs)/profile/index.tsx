import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND_GRADIENT } from '@/constants/Gradients';
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, RefreshControl, Alert, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '../../../src/hooks/useTranslation';

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
import { logout, setUser, selectRefreshToken, selectCurrentUser } from '../../../src/store/authSlice';
import LogoutConfirmationModal from '../../../components/modals/LogoutConfirmationModal';
import { MEDIA_BASE_URL } from '../../../src/config/env';
import { logger } from '../../../src/utils/logger';

let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch (error) {
  // ImagePicker not available
}

type MenuItem = {
  title: string;
  Icon: React.FC<{ width: number; height: number }>;
  route?: string;
  comingSoon?: boolean;
};

const ProfileScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const dispatch = useDispatch();
  const refreshToken = useSelector(selectRefreshToken);
  const currentUser = useSelector(selectCurrentUser);
  const [logoutMutation, { isLoading: isLoggingOut }] = useLogoutMutation();
  const { data: profileData, isLoading: isLoadingProfile, refetch: refetchProfile } = useGetProfileQuery();
  const [uploadProfilePicture, { isLoading: isUploadingPicture }] = useUploadProfilePictureMutation();
  // Locally picked image, shown immediately so the new avatar appears without
  // waiting for the upload round trip. Cleared once the server copy lands.
  const [pendingPictureUri, setPendingPictureUri] = useState<string | null>(null);
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
        setPendingPictureUri(image.uri);

        const formData = new FormData();
        formData.append('profile_picture', {
          uri: image.uri,
          type: image.type || 'image/jpeg',
          name: 'profile.jpg',
        } as any);

        const { user } = await uploadProfilePicture(formData).unwrap();

        // Push the updated user into the auth slice as well as the query cache:
        // screens read the picture from either, and a stale slice leaves the
        // old avatar on screen until the next sign-in.
        dispatch(setUser(user));
        // Keep showing the local preview until the refreshed profile has landed,
        // otherwise the stale cached URL flashes back for a frame.
        await refetchProfile();
        setPendingPictureUri(null);

        Alert.alert('Success', 'Profile picture updated successfully!');
      }
    } catch (error: any) {
      setPendingPictureUri(null);
      Alert.alert(
        'Upload Failed',
        error?.data?.error || 'Failed to upload profile picture. Please try again.'
      );
    }
  };

  const handleLogout = async () => {
    try {
      // First, end any active streams with timeout
      if (myStreams && myStreams.length > 0) {
        const activeStreams = myStreams.filter(stream => stream.status === 'live');

        if (activeStreams.length > 0) {

          // End all active streams with individual timeouts
          const streamEndPromises = activeStreams.map(stream =>
            Promise.race([
              streamAction({ streamId: stream.id, action: { action: 'end' } }).unwrap(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Stream end timeout')), 3000))
            ]).catch(error => {
              logger.error(`Failed to end stream ${stream.id}:`, error);
            })
          );

          await Promise.allSettled(streamEndPromises);

          // Invalidate streams cache
          dispatch(streamsApi.util.invalidateTags(['Stream']));
        }
      }

      // Then proceed with normal logout with timeout
      if (refreshToken) {
        await Promise.race([
          logoutMutation({ refresh: refreshToken }).unwrap(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Logout API timeout')), 5000)
          )
        ]).catch(error => {
        });
      }
    } catch (error) {
      logger.error('Logout process error:', error);
      // Continue with logout even if server call fails
    } finally {
      // Always perform local logout regardless of API status
      dispatch(logout());
      setLogoutModalVisible(false);
      router.replace('/(auth)/signin');
    }
  };

  const handleShare = async () => {
    try {
      const username = profileData?.username || currentUser?.username || '';
      const profileUrl = `${MEDIA_BASE_URL}/profile/${username}?utm_source=mobile_share&utm_medium=social`;
      const userName = profileData?.full_name || currentUser?.full_name || profileData?.username || currentUser?.username;

      await Share.share({
        message: `Check out ${userName}'s profile on DareMe.\n\nFollow them for live streams and content.\n\n${profileUrl}`,
        url: profileUrl,
      });
    } catch (error) {
      logger.error('Failed to share profile:', error);
      Alert.alert('Share Failed', 'Unable to share profile. Please try again.');
    }
  };

  const menuItems: MenuItem[] = [
    { title: t('profile.account', 'Account') as string, Icon: AccountIcon, route: '/account' },
    { title: t('common.language', 'Language') as string, Icon: LanguageIcon, route: '/language' },
    { title: t('profile.notification', 'Notification') as string, Icon: ProfileNotificationIcon, route: '/notifications' },
    { title: t('profile.blockedList', 'Blocked List') as string, Icon: BlockedIcon, route: '/blocked-list' },
    { title: t('profile.unlockLevel', 'Unlock level') as string, Icon: UnlockIcon, route: '/unlock-level'},
  ];

  const walletItems: MenuItem[] = [
    { title: t('wallet.wallet', 'Wallet') as string, Icon: WalletIcon, route: '/wallet'},
    { title: t('wallet.transactions', 'Transactions') as string, Icon: TransactionIcon, route: '/transactions'},
    { title: t('profile.payout', 'Payout') as string, Icon: PayoutIcon, route: '/withdraw-money'},
    { title: 'Identity Verification', Icon: IdentityIcon, route: undefined, comingSoon: true },
  ];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      <View className="flex-row items-center relative px-4 pt-3 pb-3 mb-3">
        <TouchableOpacity onPress={() => router.back()} className="absolute left-4 z-10">
          <View className="w-14 h-14 bg-[#1A1A1A] rounded-full justify-center items-center">
            <ArrowLeftIcon width={24} height={24} />
          </View>
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-white text-[20px] font-semibold">{t('profile.yourProfile', 'Your Profile') as string}</Text>
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
            {(pendingPictureUri || profileData?.profile_picture_url || currentUser?.profile_picture_url) ? (
              <Image
                source={{
                  uri:
                    pendingPictureUri ||
                    profileData?.profile_picture_url ||
                    currentUser?.profile_picture_url ||
                    ''
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
             colors={BRAND_GRADIENT}
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
                 <Text className="text-white text-xl font-semibold">{t('profile.shareProfileLink', 'Share Profile Link') as string}</Text>
                 <View className="w-6 h-6 rounded-full justify-center items-center">
                   <SentIcon width={24} height={24} />
                 </View>
               </View>
              </TouchableOpacity>
           </LinearGradient>
         </View>

          <View className="flex-row justify-between w-full mt-6">
            <View className="items-center">
              <Text className="text-white text-[20px] font-bold mb-1">
                {profileData?.following_count || currentUser?.following_count || 0}
              </Text>
              <Text className="text-[#666]">{t('profile.following', 'Following') as string}</Text>
            </View>

            <View className="items-center">
              <Text className="text-white text-[20px] font-bold mb-1">
                {profileData?.followers_count || currentUser?.followers_count || 0}
              </Text>
              <Text className="text-[#666]">{t('profile.followers', 'Followers') as string}</Text>
            </View>

            <View className="items-center">
              <Text className="text-white text-[20px] font-bold mb-1">
                {profileData?.total_likes_count || currentUser?.total_likes_count || 0}
              </Text>
              <Text className="text-[#666]">{t('profile.likes', 'Likes') as string}</Text>
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
                className={`flex-row items-center p-4 ${item.comingSoon ? 'opacity-50' : ''}`}
                onPress={() => {
                  if (item.comingSoon) {
                    Alert.alert('Coming Soon', 'Identity Verification will be available in a future update.');
                    return;
                  }
                  if (item.title === 'Wallet') {
                    router.push('/wallet');
                  } else if (item.title === 'Transactions') {
                    router.push('/transactions');
                  } else if (item.route) {
                    router.push(item.route as any);
                  }
                }}
                disabled={!!item.comingSoon}
              >
                <View className="w-8 h-8 p-6 rounded-full justify-center items-center mr-4 bg-[#2A2A2A]">
                  <item.Icon width={20} height={20}/>
                </View>
                <Text className="text-white text-base flex-1">{item.title}</Text>
                {item.comingSoon && (
                  <View className="bg-gray-700 px-3 py-1 rounded-full ml-2">
                    <Text className="text-xs text-white font-semibold">Coming Soon</Text>
                  </View>
                )}
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
