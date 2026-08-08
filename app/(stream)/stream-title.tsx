import React, { useState, useRef, useEffect } from 'react';
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
  StyleSheet,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { buildProfilePictureURL } from '../../src/config/env';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../src/store/authSlice';
import { useGetProfileQuery } from '../../src/store/authApi';
import { useSearchUsersQuery } from '../../src/api/messagingApi';
import type { MessageUser } from '../../types/api/messaging';
import { fonts } from '../../constants/Fonts';

import CancelIcon from '../../assets/icons/cancel.svg';
import SearchIcon from '../../assets/icons/search.svg';
import SeatIcon from '../../assets/icons/seat-selector.svg';
import AddTeamIcon from '../../assets/icons/add-team.svg';
import MagicWandIcon from '../../assets/icons/magic-wand.svg';
import LogoIcon from '../../assets/icons/daremelive.svg';

/** Design tokens from the Stream Info design. */
const SURFACE = 'rgba(237,238,249,0.08)';
const SURFACE_BORDER = 'rgba(237,238,249,0.12)';
const PANEL = 'rgba(38,38,38,0.72)';
const CONTROL = 'rgba(38,38,38,0.5)';
const SCRIM = 'rgba(25,23,26,0.32)';
const DIVIDER = '#363636';
const PLACEHOLDER = '#757688';
const SELECTED_SURFACE = 'rgba(196,39,32,0.12)';
const SELECTED_BORDER = '#C42720';

/** Row in the guest search results. */
const GuestResult = ({
  user,
  selected,
  onPress,
}: {
  user: MessageUser;
  selected: boolean;
  onPress: () => void;
}) => {
  const avatar = buildProfilePictureURL(user.profile_picture_url || user.profile_picture);
  const name = user.full_name?.trim() || user.username;

  return (
    <TouchableOpacity
      className="flex-row items-center gap-2 rounded-lg px-2 py-2"
      style={{ backgroundColor: selected ? SELECTED_SURFACE : 'transparent' }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View className="h-6 w-6 overflow-hidden rounded-full bg-[#19171A]">
        {avatar ? (
          <Image source={{ uri: avatar }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Text className="text-[10px] text-[#EDEEF9]" style={{ fontFamily: fonts.semiBold }}>
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <View className="flex-1">
        <Text
          className="text-xs text-[#EDEEF9]"
          style={{ fontFamily: fonts.regular }}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text
          className="text-[10px]"
          style={{ color: PLACEHOLDER, fontFamily: fonts.regular }}
          numberOfLines={1}
        >
          @{user.username}
        </Text>
      </View>
      <Text
        className="text-xs"
        style={{ color: selected ? SELECTED_BORDER : PLACEHOLDER, fontFamily: fonts.medium }}
      >
        {selected ? 'Invited' : 'Invite'}
      </Text>
    </TouchableOpacity>
  );
};

/** Empty seat: a centred seat-selector chip, as shown for every unfilled slot. */
const EmptySeat = () => (
  <View className="flex-1 items-center justify-center py-4">
    <View
      className="rounded-full border p-[10px]"
      style={{ backgroundColor: SURFACE, borderColor: SURFACE_BORDER }}
    >
      <SeatIcon width={24} height={24} />
    </View>
  </View>
);

/** Circular control flanking the primary action in the bottom bar. */
const RoundControl = ({
  Icon,
  label,
  onPress,
}: {
  Icon: React.FC<any>;
  label: string;
  onPress?: () => void;
}) => (
  <TouchableOpacity
    className="rounded-[36px] p-3"
    style={{ backgroundColor: CONTROL }}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Icon width={24} height={24} />
  </TouchableOpacity>
);

export default function StreamTitleScreen() {
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

  // Get stream configuration from params with proper null checks
  const streamMode = (params.mode as string) || 'multi';
  const streamChannel = (params.channel as string) || 'video';
  const maxSeats = parseInt((params.seats as string) || '2') || 2;

  // State management
  const [title, setTitle] = useState('');
  const [guestQuery, setGuestQuery] = useState('');
  const [debouncedGuestQuery, setDebouncedGuestQuery] = useState('');
  const [selectedGuests, setSelectedGuests] = useState<MessageUser[]>([]);

  // The camera preview lets the host frame themselves before going live. It is
  // torn down the moment the screen loses focus, because expo-router keeps
  // pushed screens mounted and the streaming SDK cannot open a camera that this
  // preview still holds.
  const isFocused = useIsFocused();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const showCameraPreview = isFocused && !!cameraPermission?.granted;

  useEffect(() => {
    if (cameraPermission && !cameraPermission.granted && cameraPermission.canAskAgain) {
      requestCameraPermission();
    }
  }, [cameraPermission, requestCameraPermission]);

  // Typing shouldn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedGuestQuery(guestQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [guestQuery]);

  const { data: guestSearchData, isFetching: isSearchingGuests } = useSearchUsersQuery(
    { query: debouncedGuestQuery },
    { skip: debouncedGuestQuery.length < 2 }
  );

  // Animation references
  const fadeInAnimation = useRef(new Animated.Value(0)).current;
  const slideUpAnimation = useRef(new Animated.Value(50)).current;

  // The host occupies the first seat; the rest are shown empty until guests join.
  const seatRows = Array.from(
    { length: Math.ceil(maxSeats / 2) },
    (_, row) => [row * 2, row * 2 + 1].filter((index) => index < maxSeats)
  );

  // The host holds seat one, so that is how many guests there is room for.
  const guestCapacity = Math.max(maxSeats - 1, 0);
  const isGuestSelected = (user: MessageUser) =>
    selectedGuests.some((guest) => guest.id === user.id);

  const guestResults = (guestSearchData?.results ?? []).filter(
    (user) => String(user.id) !== String(currentUser?.id)
  );

  const toggleGuest = (user: MessageUser) => {
    setSelectedGuests((current) => {
      if (current.some((guest) => guest.id === user.id)) {
        return current.filter((guest) => guest.id !== user.id);
      }
      // Silently ignoring the tap would look broken, so the list caps instead.
      if (current.length >= guestCapacity) {
        return current;
      }
      return [...current, user];
    });
  };

  // Handle proceed action
  const handleProceed = () => {
    if (!title.trim()) {
      return;
    }

    // Animate out and navigate
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
      // Navigate to unified host screen for both single and multi streams
      router.push({
        pathname: '/stream/host',
        params: {
          mode: streamMode,
          channel: streamChannel,
          maxSeats: streamMode === 'single' ? '1' : maxSeats.toString(),
          title: title.trim(),
          // Invitations need a stream to point at, so the host screen sends
          // these once it has created one.
          guestIds: selectedGuests.map((guest) => guest.id).join(','),
          // Add a flag to indicate this came from the title screen
          fromTitleScreen: 'true'
        }
      });
    });
  };

  // Handle back action
  const handleBack = () => {
    router.back();
  };

  // Entrance animation
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

      {/* Seat grid sits behind the panel: the host tile plus the empty seats
          this stream was configured for. absoluteFillObject rather than
          `inset-0`, so the rows have a height to divide between them. */}
      <View style={StyleSheet.absoluteFillObject}>
        {seatRows.map((row, rowIndex) => (
          <View
            key={rowIndex}
            className="flex-1 flex-row"
            style={
              rowIndex > 0
                ? { borderTopWidth: 1, borderTopColor: DIVIDER }
                : undefined
            }
          >
            {row.map((seatIndex) => (
              <View
                key={seatIndex}
                className="flex-1"
                style={
                  seatIndex % 2 === 1
                    ? { borderLeftWidth: 1, borderLeftColor: DIVIDER }
                    : undefined
                }
              >
                {seatIndex === 0 ? (
                  <View className="flex-1">
                    {showCameraPreview ? (
                      <CameraView
                        style={StyleSheet.absoluteFillObject}
                        facing="front"
                      />
                    ) : profilePictureUrl ? (
                      // Falls back to the profile photo when the camera is
                      // unavailable, so the seat is never blank.
                      <Image
                        source={{ uri: profilePictureUrl }}
                        className="h-full w-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="h-full w-full bg-[#19171A]" />
                    )}
                    <View
                      className="absolute bottom-[18px] left-[10px] rounded-[68px] px-3 py-1"
                      style={{ backgroundColor: 'rgba(255,0,0,0.08)' }}
                    >
                      <Text
                        className="text-xs text-[#FF0000]"
                        style={{ fontFamily: fonts.regular, lineHeight: 12 }}
                      >
                        Host
                      </Text>
                    </View>
                  </View>
                ) : (
                  <EmptySeat />
                )}
              </View>
            ))}
            {row.length === 1 && <View className="flex-1" />}
          </View>
        ))}
      </View>

      {/* Scrim over the grid */}
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
                Stream Info
              </Text>
              <TouchableOpacity onPress={handleBack} accessibilityLabel="Close">
                <CancelIcon width={24} height={24} />
              </TouchableOpacity>
            </View>

            <View className="gap-5">
              {/* Title */}
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

              {/* Invite guests */}
              <View className="w-full gap-2">
                <Text
                  className="text-xs text-[#EDEEF9]"
                  style={{ fontFamily: fonts.regular, lineHeight: 12 }}
                >
                  Invite Guests
                </Text>
                <View
                  className="h-10 w-full flex-row items-center justify-between rounded-[36px] border px-4"
                  style={{ backgroundColor: SURFACE, borderColor: SURFACE_BORDER }}
                >
                  <TextInput
                    placeholder="Search Guest"
                    placeholderTextColor={PLACEHOLDER}
                    value={guestQuery}
                    onChangeText={setGuestQuery}
                    className="flex-1 text-sm text-[#EDEEF9]"
                    style={{ fontFamily: fonts.regular, lineHeight: 22.4 }}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  {isSearchingGuests ? (
                    <ActivityIndicator size="small" color={PLACEHOLDER} />
                  ) : (
                    <SearchIcon width={16} height={16} />
                  )}
                </View>

                {selectedGuests.length > 0 && (
                  <View className="gap-2">
                    <View className="flex-row flex-wrap gap-2">
                      {selectedGuests.map((guest) => (
                        <TouchableOpacity
                          key={guest.id}
                          className="flex-row items-center gap-1 rounded-[68px] border px-2 py-1"
                          style={{
                            backgroundColor: SELECTED_SURFACE,
                            borderColor: SELECTED_BORDER,
                          }}
                          onPress={() => toggleGuest(guest)}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${guest.username}`}
                        >
                          <Text
                            className="text-[10px] text-[#EDEEF9]"
                            style={{ fontFamily: fonts.regular }}
                          >
                            {guest.full_name?.trim() || guest.username}
                          </Text>
                          <CancelIcon width={10} height={10} />
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text
                      className="text-[10px]"
                      style={{ color: PLACEHOLDER, fontFamily: fonts.regular }}
                    >
                      {selectedGuests.length} of {guestCapacity} guest seat
                      {guestCapacity === 1 ? '' : 's'} chosen — invited when you go live
                    </Text>
                  </View>
                )}

                {debouncedGuestQuery.length >= 2 && (
                  <View
                    className="max-h-[168px] w-full overflow-hidden rounded-lg border"
                    style={{ backgroundColor: SURFACE, borderColor: SURFACE_BORDER }}
                  >
                    {guestResults.length === 0 && !isSearchingGuests ? (
                      <Text
                        className="p-3 text-center text-xs"
                        style={{ color: PLACEHOLDER, fontFamily: fonts.regular }}
                      >
                        No one found for "{debouncedGuestQuery}"
                      </Text>
                    ) : (
                      <ScrollView keyboardShouldPersistTaps="handled">
                        {guestResults.map((user) => (
                          <GuestResult
                            key={user.id}
                            user={user}
                            selected={isGuestSelected(user)}
                            onPress={() => toggleGuest(user)}
                          />
                        ))}
                      </ScrollView>
                    )}
                  </View>
                )}
              </View>
            </View>
          </BlurView>
        </Animated.View>

        <View className="flex-1" />

        {/* Bottom action bar */}
        <View className="flex-row items-center gap-3 px-4 pb-6">
          <RoundControl Icon={MagicWandIcon} label="Beautify" />

          <TouchableOpacity
            className="flex-1"
            onPress={handleProceed}
            disabled={!title.trim()}
          >
            {/* The design's gradient runs red -> #330000 between 46.4% and
                166.2%, so only the first ~45% of the ramp is on screen: the
                right edge lands on #A40000, not full #330000. */}
            <LinearGradient
              colors={['#FF0000', '#FF0000', '#A40000']}
              locations={[0, 0.464, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{
                height: 48,
                width: '100%',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                paddingHorizontal: 24,
                borderRadius: 48,
              }}
            >
              <Text
                className="text-sm text-[#EDEEF9]"
                style={{ fontFamily: fonts.medium, lineHeight: 14 }}
              >
                Start Live Now
              </Text>
              <LogoIcon width={9} height={16} />
            </LinearGradient>
          </TouchableOpacity>

          <RoundControl Icon={AddTeamIcon} label="Add guests" />
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
