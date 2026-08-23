import React, { useState, useEffect } from 'react';
import { getErrorMessage } from '../src/utils/errorMessage';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { selectCurrentUser } from '../src/store/authSlice';
import {
  useFollowUserMutation,
  useUnfollowUserMutation
} from '../src/store/followApi';
import { useGetUserProfileQuery } from '../src/store/usersApi';
import { useBlockUserMutation } from '../src/api/blockedApi';
import { useCreateUserReportMutation, useGetReportReasonsQuery } from '../src/api/reportsApi';
import ShareProfileModal from '../components/ShareProfileModal';
import { MEDIA_BASE_URL, buildProfilePictureURL, buildAvatarFallbackURL } from '../src/config/env';

// SVG Icons
const sentIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M14.0318 2.03561C12.5798 0.4719 1.65764 4.30246 1.66666 5.70099C1.67689 7.28692 5.93205 7.77479 7.11146 8.10572C7.82072 8.30466 8.01066 8.50866 8.17419 9.25239C8.91486 12.6207 9.28672 14.296 10.1343 14.3334C11.4852 14.3931 15.4489 3.56166 14.0318 2.03561Z" stroke="#EDEEF9" stroke-width="1.5"/>
<path d="M7.66666 8.33333L9.99999 6" stroke="#EDEEF9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const chatIcon = `<svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M22.25 11.5667C22.25 16.8499 17.7722 21.1334 12.25 21.1334C11.6007 21.1343 10.9532 21.0742 10.3154 20.9545C9.85633 20.8682 9.62678 20.8251 9.46653 20.8496C9.30627 20.8741 9.07918 20.9948 8.62499 21.2364C7.34014 21.9197 5.84195 22.161 4.40111 21.893C4.94874 21.2194 5.32275 20.4112 5.48778 19.5448C5.58778 19.0148 5.34 18.5 4.96889 18.1231C3.28333 16.4115 2.25 14.1051 2.25 11.5667C2.25 6.28357 6.72778 2 12.25 2C17.7722 2 22.25 6.28357 22.25 11.5667Z" stroke="#EDEEF9" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M12.2455 12H12.2545M16.241 12H16.25M8.25 12H8.25897" stroke="#EDEEF9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export default function UserProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const currentUser = useSelector(selectCurrentUser);

  // Get user ID from params
  const userId = params.userId as string;

  // Fetch user profile data
  const { data: userProfile, isLoading, error, refetch } = useGetUserProfileQuery(userId, {
    skip: !userId,
  });

  // Follow/Unfollow mutations
  const [followUser, { isLoading: followLoading }] = useFollowUserMutation();
  const [unfollowUser, { isLoading: unfollowLoading }] = useUnfollowUserMutation();
  const [blockUser, { isLoading: blockLoading }] = useBlockUserMutation();
  const [createUserReport, { isLoading: reportLoading }] = useCreateUserReportMutation();
  const { data: reportReasons = [], isLoading: reasonsLoading, refetch: refetchReasons } = useGetReportReasonsQuery();

  const [actionLoading, setActionLoading] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedReasonId, setSelectedReasonId] = useState<number | null>(null);
  const [reportDetails, setReportDetails] = useState('');

  const handleFollowToggle = async () => {
    if (!userProfile || actionLoading) return;

    setActionLoading(true);
    try {
      if (userProfile.is_following) {
        await unfollowUser({ user_id: parseInt(userId) }).unwrap();
      } else {
        await followUser({ user_id: parseInt(userId) }).unwrap();
      }

      // Refetch user profile to update follow status and counts
      refetch();
    } catch (error: any) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleMessage = () => {
    // Navigate to conversation screen with user ID as parameter
    // The conversation screen will handle creating a new conversation if none exists
    router.push({
      pathname: '/(tabs)/messages/[id]',
      params: { id: `new-${userId}` }
    });
  };

  const handleBlockUser = async () => {
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${userProfile?.full_name || userProfile?.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await blockUser({ user_id: parseInt(userId) }).unwrap();

              Alert.alert('Success', `${userProfile?.full_name || userProfile?.username} has been blocked`, [
                {
                  text: 'OK',
                  onPress: () => {
                    // Navigate to homepage immediately after blocking
                    router.replace('/(tabs)/home');
                  }
                }
              ]);

              // Also refetch data in case user stays on page
              refetch();
            } catch (error: any) {
              Alert.alert('Error', getErrorMessage(error));
            }
          }
        }
      ]
    );
  };

  const handleReportUser = () => {
    setSelectedReasonId(null);
    setReportDetails('');
    setReportModalVisible(true);
  };

  const submitReport = async () => {
    if (!selectedReasonId || !userProfile) return;

    try {
      await createUserReport({
        reported_user_id: userProfile.id,
        reason_id: selectedReasonId,
        custom_reason: reportDetails.trim() || undefined,
      }).unwrap();
      setReportModalVisible(false);
      Alert.alert('Report received', 'Thank you. Our moderation team will review it.');
    } catch (reportError: any) {
      const message = getErrorMessage(reportError);
      Alert.alert('Unable to report', message);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <StatusBar barStyle="light-content" backgroundColor="black" />
        <ActivityIndicator size="large" color="#ffffff" />
        <Text className="text-white mt-4">Loading profile...</Text>
      </View>
    );
  }

  if (error || !userProfile) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-4">
        <StatusBar barStyle="light-content" backgroundColor="black" />
        <Text className="text-white text-lg mb-4">Failed to load profile</Text>
        <TouchableOpacity
          onPress={() => refetch()}
          className="bg-red-600 px-6 py-3 rounded-full"
        >
          <Text className="text-white font-semibold">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const profileImageUrl = userProfile.profile_picture_url
    ? buildProfilePictureURL(userProfile.profile_picture_url)
    : null;

  return (
    <View className="flex-1 bg-black">
      <StatusBar barStyle="light-content" backgroundColor="black" />

      {/* Header with back button */}
      <View className="flex-row items-center justify-between px-4 pt-12 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Profile Content */}
      <View className="flex-1 items-center px-6">
        {/* Profile Picture */}
        <View className="w-32 h-32 rounded-full mb-6 overflow-hidden border-4 border-purple-500">
          {profileImageUrl ? (
            <Image
              source={{ uri: profileImageUrl }}
              className="w-full h-full"
              resizeMode="cover"
              onError={() => {
                // Silent image load failure
              }}
            />
          ) : (
            <View className="w-full h-full bg-gray-600 items-center justify-center">
              <Text className="text-white text-4xl font-bold">
                {userProfile.full_name?.charAt(0)?.toUpperCase() ||
                 userProfile.username?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
        </View>

        {/* Name and Username */}
        <Text className="text-white text-2xl font-bold mb-2">
          {userProfile.full_name || userProfile.username}
        </Text>
        <Text className="text-gray-400 text-lg mb-8">
          @{userProfile.username}
        </Text>

        {/* Action Buttons */}
        <View className="flex-row gap-4 mb-8">
          {/* Follow/Unfollow Button */}
          <TouchableOpacity
            onPress={handleFollowToggle}
            disabled={actionLoading || followLoading || unfollowLoading || blockLoading}
            className={`px-8 py-3 rounded-full flex-row items-center gap-2 ${
              userProfile.is_following ? 'bg-gray-600' : 'bg-red-600'
            }`}
          >
            {actionLoading || followLoading || unfollowLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <SvgXml xml={sentIcon} width="16" height="16" />
                <Text className="text-white font-semibold text-base">
                  {userProfile.is_following ? 'Unfollow' : 'Follow'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Message Button */}
          <TouchableOpacity
            onPress={handleMessage}
            className="bg-gray-700 px-8 py-3 rounded-full flex-row items-center gap-2"
          >
            <Text className="text-white font-semibold text-base">Message</Text>
            <SvgXml xml={chatIcon} width="18" height="18" />
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            onPress={() => setShareModalVisible(true)}
            className="bg-gray-700 w-12 h-12 rounded-full items-center justify-center"
          >
            <Ionicons name="share-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View className="flex-row justify-center items-center mb-12">
          {/* Following */}
          <View className="items-center">
            <Text className="text-white text-2xl font-bold">
              {userProfile.following_count}
            </Text>
            <Text className="text-gray-400 text-base">Following</Text>
          </View>

          {/* Pipe Separator */}
          <View className="mx-6 w-px h-12 bg-gray-600" />

          {/* Followers */}
          <View className="items-center">
            <Text className="text-white text-2xl font-bold">
              {userProfile.followers_count}
            </Text>
            <Text className="text-gray-400 text-base">Followers</Text>
          </View>

          {/* Pipe Separator */}
          <View className="mx-6 w-px h-12 bg-gray-600" />

          {/* Likes */}
          <View className="items-center">
            <Text className="text-white text-2xl font-bold">
              {userProfile.total_likes_count}
            </Text>
            <Text className="text-gray-400 text-base">Likes</Text>
          </View>
        </View>

        {/* Spacer to push bottom actions down */}
        <View className="flex-1" />

        {/* Bottom Actions */}
        <View className="w-full mb-8 bg-gray-800 rounded-lg p-4">
          {/* Block User */}
          <TouchableOpacity
            onPress={handleBlockUser}
            className="flex-row items-center py-3 px-2 rounded-lg mb-2"
          >
            <View className="w-8 h-8 bg-gray-700 rounded-full items-center justify-center mr-4">
              <Ionicons name="ban-outline" size={18} color="white" />
            </View>
            <Text className="text-white text-base">Block User</Text>
          </TouchableOpacity>

          {/* Report User */}
          <TouchableOpacity
            onPress={handleReportUser}
            className="flex-row items-center py-3 px-2 rounded-lg"
          >
            <View className="w-8 h-8 bg-gray-700 rounded-full items-center justify-center mr-4">
              <Ionicons name="flag-outline" size={18} color="white" />
            </View>
            <Text className="text-white text-base">Report User</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Share Profile Modal */}
      {userProfile && (
        <ShareProfileModal
          visible={shareModalVisible}
          onClose={() => setShareModalVisible(false)}
          userProfile={{
            id: userProfile.id,
            username: userProfile.username,
            full_name: userProfile.full_name,
            profile_picture_url: userProfile.profile_picture_url || undefined,
          }}
        />
      )}

      <Modal
        visible={reportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !reportLoading && setReportModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/70">
          <View className="bg-[#17181D] rounded-t-3xl px-5 pt-5 pb-8 max-h-[80%]">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-white text-xl font-bold">Report user</Text>
              <TouchableOpacity
                accessibilityLabel="Close report form"
                disabled={reportLoading}
                onPress={() => setReportModalVisible(false)}
                className="w-10 h-10 items-center justify-center"
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <Text className="text-gray-400 mb-5">
              Choose the reason that best describes the issue. Reports are confidential.
            </Text>

            {reasonsLoading ? (
              <ActivityIndicator color="#C42720" className="my-8" />
            ) : reportReasons.length === 0 ? (
              <View className="items-center py-6">
                <Text className="text-gray-300 mb-3">Report reasons could not be loaded.</Text>
                <TouchableOpacity onPress={() => refetchReasons()} className="bg-gray-700 px-5 py-3 rounded-full">
                  <Text className="text-white font-semibold">Try again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView className="mb-4" showsVerticalScrollIndicator={false}>
                {reportReasons.map((reason) => {
                  const selected = selectedReasonId === reason.id;
                  return (
                    <TouchableOpacity
                      key={reason.id}
                      onPress={() => setSelectedReasonId(reason.id)}
                      className={`border rounded-2xl p-4 mb-3 ${selected ? 'border-red-500 bg-red-950/30' : 'border-gray-700 bg-gray-900'}`}
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className="text-white font-semibold flex-1">{reason.name}</Text>
                        <Ionicons
                          name={selected ? 'radio-button-on' : 'radio-button-off'}
                          size={21}
                          color={selected ? '#EF4444' : '#71717A'}
                        />
                      </View>
                      {!!reason.description && (
                        <Text className="text-gray-400 text-sm mt-1">{reason.description}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <TextInput
              value={reportDetails}
              onChangeText={setReportDetails}
              editable={!reportLoading}
              maxLength={2000}
              multiline
              placeholder="Additional details (optional)"
              placeholderTextColor="#71717A"
              className="min-h-24 bg-gray-900 border border-gray-700 rounded-2xl p-4 text-white mb-4"
              textAlignVertical="top"
            />

            <TouchableOpacity
              disabled={!selectedReasonId || reportLoading}
              onPress={submitReport}
              className={`h-12 rounded-full items-center justify-center ${selectedReasonId && !reportLoading ? 'bg-red-600' : 'bg-gray-700'}`}
            >
              {reportLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold">Submit report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
