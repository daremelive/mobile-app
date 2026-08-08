import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar,
  SafeAreaView,
  StyleSheet
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import { buildProfilePictureURL } from '../../src/config/env';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../src/store/authSlice';
import { useGetProfileQuery } from '../../src/store/authApi';
import { fonts } from '../../constants/Fonts';

import CancelIcon from '../../assets/icons/cancel.svg';

/** Design tokens from the Stream Title design. */
const PANEL = 'rgba(38,38,38,0.72)';
const SCRIM = 'rgba(25,23,26,0.32)';
const PLACEHOLDER = '#757688';
const PROCEED = '#EDEEF9';
const PROCEED_LABEL = '#262626';

/**
 * Title step of the single-live flow.
 *
 * Multi-live has its own title screen ({@link ./stream-title}) because it also
 * previews the seat grid and invites guests; a single stream only needs a title.
 */
export default function SingleStreamTitleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const storedUser = useSelector(selectCurrentUser) as any;
  // The query cache is refreshed whenever the User tag is invalidated (e.g.
  // after a picture upload), so prefer it and fall back to the auth slice.
  const { data: profile } = useGetProfileQuery();
  const currentUser = profile ?? storedUser;
  // buildProfilePictureURL handles both absolute URLs and stored relative paths.
  const profilePictureUrl = buildProfilePictureURL(
    currentUser?.profile_picture_url || currentUser?.profile_picture
  );

  const streamChannel = (params.channel as string) || 'video';

  const [title, setTitle] = useState('');

  const fadeInAnimation = useRef(new Animated.Value(0)).current;
  const slideUpAnimation = useRef(new Animated.Value(50)).current;

  const handleProceed = () => {
    if (!title.trim()) {
      return;
    }

    Animated.parallel([
      Animated.timing(fadeInAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnimation, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      // The host screen raises the screen-broadcast sheet itself for channels
      // that broadcast, since the picker needs a joined call behind it.
      router.push({
        pathname: '/stream/host',
        params: {
          mode: 'single',
          channel: streamChannel,
          maxSeats: '1',
          title: title.trim(),
          fromTitleScreen: 'true'
        }
      });
    });
  };

  const handleBack = () => {
    router.back();
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeInAnimation, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnimation, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#090909]"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />

      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: SCRIM }]} />

      <SafeAreaView className="flex-1">
        <Animated.View
          className="items-center px-4 pt-7"
          style={{
            opacity: fadeInAnimation,
            transform: [{ translateY: slideUpAnimation }]
          }}
        >
          <BlurView
            intensity={8}
            tint="dark"
            /* NativeWind does not style third-party components, so the panel's
               layout is set here rather than with className. */
            style={{
              width: '100%',
              gap: 20,
              padding: 12,
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor: PANEL,
            }}
          >
            <View className="flex-row items-start justify-between">
              <Text
                className="text-lg text-[#EDEEF9]"
                style={{ fontFamily: fonts.semiBold }}
              >
                Stream Title
              </Text>
              <TouchableOpacity onPress={handleBack} accessibilityLabel="Close">
                <CancelIcon width={24} height={24} />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center gap-1">
              <View className="h-8 w-8 overflow-hidden rounded-full bg-[#19171A]">
                {profilePictureUrl ? (
                  <Image
                    source={{ uri: profilePictureUrl }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="h-full w-full items-center justify-center">
                    <Text
                      className="text-sm text-[#EDEEF9]"
                      style={{ fontFamily: fonts.semiBold }}
                    >
                      {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
              </View>
              <TextInput
                placeholder="Add a title to chat"
                placeholderTextColor={PLACEHOLDER}
                value={title}
                onChangeText={setTitle}
                className="flex-1 text-sm text-[#EDEEF9]"
                style={{ fontFamily: fonts.regular, lineHeight: 22.4 }}
                autoCorrect={false}
                maxLength={100}
                multiline={false}
              />
            </View>
          </BlurView>
        </Animated.View>

        <View className="flex-1" />

        <View className="px-8 pb-6">
          <TouchableOpacity
            className="h-12 w-full items-center justify-center rounded-[48px] px-6"
            style={{ backgroundColor: PROCEED }}
            onPress={handleProceed}
            disabled={!title.trim()}
          >
            <Text
              className="text-sm"
              style={{
                color: PROCEED_LABEL,
                fontFamily: fonts.medium,
                lineHeight: 14,
              }}
            >
              Proceed
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
