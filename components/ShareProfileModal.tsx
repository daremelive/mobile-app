import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  Linking,
  Dimensions,
  Animated,
  PanResponder,
  Vibration,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../constants/Fonts';
import ipDetector from '../src/utils/ipDetector';

interface ShareProfileModalProps {
  visible: boolean;
  onClose: () => void;
  userProfile: {
    id: string | number;
    username: string;
    full_name?: string;
    profile_picture_url?: string;
  };
}

interface ShareOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  gradient: [string, string] | [string, string, string];
  action: () => void;
  description: string;
}

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

export default function ShareProfileModal({ visible, onClose, userProfile }: ShareProfileModalProps) {
  const [slideAnim] = useState(new Animated.Value(screenHeight));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  const [opacityAnim] = useState(new Animated.Value(0));
  const [profileUrl, setProfileUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string>('');

  // Initialize profile URL with IP detection
  useEffect(() => {
    const initializeProfileUrl = async () => {
      try {
        const detection = await ipDetector.detectIP();
        let baseUrl;
        // Check if it's production domain or local IP
        if (detection.ip === 'daremelive.pythonanywhere.com') {
          baseUrl = `https://${detection.ip}`;
        } else {
          baseUrl = `http://${detection.ip}:8000`;
        }
        // Use a more user-friendly URL structure for profile sharing
        const url = `${baseUrl}/profile/${userProfile.username}?utm_source=mobile_share&utm_medium=social`;
        setProfileUrl(url);
      } catch (error) {
        console.error('❌ Failed to detect IP for sharing:', error);
        setProfileUrl(`https://daremelive.pythonanywhere.com/profile/${userProfile.username}?utm_source=mobile_share&utm_medium=social`);
      }
    };
    
    if (visible && userProfile.username) {
      initializeProfileUrl();
    }
  }, [visible, userProfile.username]);

  // Animation handlers
  useEffect(() => {
    if (visible) {
      // Reset animations
      slideAnim.setValue(screenHeight);
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
      
      // Staggered animation entrance
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 8,
          delay: 100,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: screenHeight,
          useNativeDriver: true,
          tension: 65,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Pan responder for swipe to close
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return gestureState.dy > 0 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        slideAnim.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100 || gestureState.vy > 0.8) {
        handleClose();
      } else {
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    },
  });

  const handleClose = () => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: screenHeight,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const showActionFeedback = (message: string) => {
    setActionFeedback(message);
    Vibration.vibrate(50); // Subtle haptic feedback
    setTimeout(() => setActionFeedback(''), 2000);
  };

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(profileUrl);
      setCopied(true);
      showActionFeedback('✅ Link copied!');
      
      // Reset copied state after 3 seconds
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error('❌ Failed to copy to clipboard:', error);
      showActionFeedback('❌ Copy failed');
    }
  };

  const handleWhatsAppShare = () => {
    const message = `Hey! Check out ${userProfile.full_name || userProfile.username}'s amazing content on DareMe! 🎬🔥\n\nThey create incredible live streams that you'll love! Follow them here:\n${profileUrl}\n\n#DareMe #LiveStreaming #ContentCreator`;
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(whatsappUrl).then((supported) => {
      if (supported) {
        Linking.openURL(whatsappUrl);
        showActionFeedback('📱 Opening WhatsApp...');
        setTimeout(handleClose, 1000);
      } else {
        showActionFeedback('❌ WhatsApp not available');
      }
    });
  };

  const handleTwitterShare = () => {
    const text = `🔥 Just discovered ${userProfile.full_name || userProfile.username} on @DareMeLive! \n\nIncredible content creator with amazing live streams! 🎬✨\n\nFollow them now: ${profileUrl}\n\n#DareMe #LiveStreaming #ContentCreator #MustFollow`;
    const twitterUrl = `twitter://post?message=${encodeURIComponent(text)}`;
    const webTwitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    
    Linking.canOpenURL(twitterUrl).then((supported) => {
      if (supported) {
        Linking.openURL(twitterUrl);
      } else {
        Linking.openURL(webTwitterUrl);
      }
      showActionFeedback('🐦 Opening Twitter...');
      setTimeout(handleClose, 1000);
    });
  };

  const handleInstagramShare = () => {
    const instagramUrl = 'instagram://app';
    
    Linking.canOpenURL(instagramUrl).then((supported) => {
      if (supported) {
        handleCopyLink();
        Linking.openURL(instagramUrl);
        showActionFeedback('📸 Link copied! Opening Instagram...');
      } else {
        showActionFeedback('❌ Instagram not available');
      }
      setTimeout(handleClose, 1000);
    });
  };

  const handleFacebookShare = () => {
    const facebookUrl = `fb://facewebmodal/f?href=${encodeURIComponent(profileUrl)}`;
    const webFacebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`;
    
    Linking.canOpenURL(facebookUrl).then((supported) => {
      if (supported) {
        Linking.openURL(facebookUrl);
      } else {
        Linking.openURL(webFacebookUrl);
      }
      showActionFeedback('📘 Opening Facebook...');
      setTimeout(handleClose, 1000);
    });
  };

  const handleTelegramShare = () => {
    const message = `🎬 Discovered an amazing content creator on DareMe!\n\n${userProfile.full_name || userProfile.username} creates incredible live streams that you'll absolutely love! 🔥\n\nCheck them out and follow for amazing content! ✨`;
    const telegramUrl = `tg://msg_url?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(telegramUrl).then((supported) => {
      if (supported) {
        Linking.openURL(telegramUrl);
        showActionFeedback('✈️ Opening Telegram...');
        setTimeout(handleClose, 1000);
      } else {
        showActionFeedback('❌ Telegram not available');
      }
    });
  };

  const handleMoreOptions = async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(profileUrl, {
          dialogTitle: `Share ${userProfile.full_name || userProfile.username}'s Profile`,
          mimeType: 'text/plain',
        });
        showActionFeedback('📤 Share menu opened...');
        setTimeout(handleClose, 1000);
      } else {
        handleCopyLink();
        showActionFeedback('✅ Link copied to share manually!');
      }
    } catch (error) {
      console.error('❌ Sharing failed:', error);
      handleCopyLink();
      showActionFeedback('✅ Link copied as backup!');
    }
  };

  const shareOptions: ShareOption[] = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: (
        <View className="items-center justify-center rounded-full">
          <Ionicons name="chatbubble" size={28} color="white" />
        </View>
      ),
      gradient: ['#25D366', '#128C7E'],
      action: handleWhatsAppShare,
      description: 'Share via WhatsApp'
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: (
        <View className="items-center justify-center rounded-full">
          <Ionicons name="logo-twitter" size={28} color="white" />
        </View>
      ),
      gradient: ['#1DA1F2', '#0d8bd9'],
      action: handleTwitterShare,
      description: 'Tweet about this profile'
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: (
        <View className="items-center justify-center rounded-full">
          <Ionicons name="camera" size={28} color="white" />
        </View>
      ),
      gradient: ['#E4405F', '#5851DB', '#405DE6'],
      action: handleInstagramShare,
      description: 'Share on Instagram'
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: (
        <View className="items-center justify-center rounded-full">
          <Ionicons name="logo-facebook" size={28} color="white" />
        </View>
      ),
      gradient: ['#4267B2', '#365492'],
      action: handleFacebookShare,
      description: 'Share on Facebook'
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: (
        <View className="items-center justify-center rounded-full">
          <Ionicons name="paper-plane-outline" size={26} color="white" />
        </View>
      ),
      gradient: ['#0088cc', '#005577'],
      action: handleTelegramShare,
      description: 'Share via Telegram'
    },
    {
      id: 'copy',
      name: 'Copy Link',
      icon: (
        <View className="items-center justify-center rounded-full">
          {copied ? (
            <Ionicons name="checkmark-circle" size={28} color="white" />
          ) : (
            <Ionicons name="link-outline" size={26} color="white" />
          )}
        </View>
      ),
      gradient: copied ? ['#4CAF50', '#45a049'] : ['#C42720', '#8B1A13'],
      action: handleCopyLink,
      description: copied ? 'Copied!' : 'Copy Link'
    }
  ];

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View className="flex-1">
        {/* Backdrop */}
        <Animated.View 
          style={{ opacity: opacityAnim }}
          className="absolute inset-0"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleClose}
            className="flex-1"
          >
            <BlurView intensity={30} tint="dark" className="flex-1 bg-black/70" />
          </TouchableOpacity>
        </Animated.View>

        {/* Share Modal */}
        <Animated.View
          style={{
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ],
            opacity: opacityAnim,
          }}
          className="absolute bottom-0 left-0 right-0"
          {...panResponder.panHandlers}
        >
          {/* Modal Container */}
          <View className="bg-[#090909] rounded-t-3xl overflow-hidden mx-2 mb-4 shadow-2xl">
            {/* Drag Handle */}
            <View className="items-center py-4">
              <View className="w-12 h-1.5 bg-gray-600 rounded-full opacity-60" />
            </View>

            {/* Header Section */}
            <View className="px-6 pb-6">
              <View className="flex-row items-center mb-3">
                <View className="w-12 h-12 bg-[#C42720] rounded-2xl items-center justify-center mr-4">
                  <Ionicons name="share-outline" size={24} color="white" />
                </View>
                <View className="flex-1">
                  <Text style={{ fontFamily: fonts.bold }} className="text-white text-xl mb-1">
                    Share Profile
                  </Text>
                  <Text style={{ fontFamily: fonts.medium }} className="text-[#C42720] text-sm">
                    Spread the word!
                  </Text>
                </View>
              </View>
              <Text style={{ fontFamily: fonts.regular }} className="text-gray-400 text-sm leading-6">
                Help {userProfile.full_name || userProfile.username} grow by sharing their amazing content with your friends and followers!
              </Text>
            </View>

            {/* Action Feedback */}
            {actionFeedback ? (
              <View className="mx-6 mb-4 p-3 bg-[#1C1C1E] rounded-xl border border-gray-800">
                <Text style={{ fontFamily: fonts.medium }} className="text-white text-center text-sm">
                  {actionFeedback}
                </Text>
              </View>
            ) : null}

            {/* Share Options Grid */}
            <View className="px-6 pb-6">
              <View className="flex-row flex-wrap justify-between">
                {shareOptions.map((option, index) => (
                  <TouchableOpacity
                    key={option.id}
                    onPress={option.action}
                    className="items-center mb-6"
                    style={{ width: '30%' }}
                    activeOpacity={0.7}
                  >
                    {/* Icon Container with App's Design Language */}
                    <View className="relative">
                      <LinearGradient
                        colors={option.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        className="w-20 h-20 rounded-2xl items-center justify-center mb-3"
                        style={{
                          shadowColor: option.gradient[0],
                          shadowOffset: { width: 0, height: 8 },
                          shadowOpacity: 0.35,
                          shadowRadius: 12,
                          elevation: 15,
                        }}
                      >
                        {option.icon}
                        
                        {/* Subtle shine effect for premium look */}
                        <LinearGradient
                          colors={['rgba(255,255,255,0.25)', 'transparent', 'transparent']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          className="absolute inset-0 rounded-2xl"
                        />
                        
                        {/* Inner border for depth */}
                        <View 
                          className="absolute inset-0 rounded-2xl border border-white/10"
                        />
                      </LinearGradient>
                      
                      {/* Special indicator for copied state */}
                      {option.id === 'copy' && copied && (
                        <View className="absolute -top-2 -right-2 w-7 h-7 bg-green-500 rounded-full items-center justify-center border-2 border-[#090909]">
                          <Ionicons name="checkmark" size={16} color="white" />
                        </View>
                      )}
                    </View>
                    
                    {/* Label */}
                    <Text 
                      style={{ fontFamily: fonts.medium }} 
                      className="text-white text-xs text-center"
                      numberOfLines={1}
                    >
                      {option.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Profile URL Preview Card */}
            <View className="mx-6 mb-6">
              <TouchableOpacity
                onPress={handleCopyLink}
                activeOpacity={0.8}
                className="p-4 bg-[#1C1C1E] rounded-xl border border-gray-800"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-3">
                    <Text style={{ fontFamily: fonts.medium }} className="text-gray-400 text-xs mb-1">
                      Profile Link
                    </Text>
                    <Text 
                      style={{ fontFamily: fonts.regular }} 
                      className="text-white text-sm"
                      numberOfLines={1}
                      ellipsizeMode="middle"
                    >
                      {profileUrl || 'Generating secure link...'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleCopyLink}
                    className="w-12 h-12 rounded-xl items-center justify-center overflow-hidden"
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={copied ? ['#4CAF50', '#45a049'] : ['#C42720', '#8B1A13']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      className="w-full h-full items-center justify-center"
                    >
                      <Ionicons 
                        name={copied ? "checkmark" : "copy-outline"} 
                        size={20} 
                        color="white" 
                      />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>

            {/* More Options Button */}
            <View className="mx-6 mb-6">
              <TouchableOpacity
                onPress={handleMoreOptions}
                className="p-4 bg-[#1C1C1E] rounded-xl border border-gray-800 flex-row items-center justify-center"
                activeOpacity={0.8}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#C42720" />
                <Text style={{ fontFamily: fonts.semiBold }} className="text-[#C42720] text-base ml-3">
                  More Sharing Options
                </Text>
              </TouchableOpacity>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              onPress={handleClose}
              className="mx-6 mb-8 bg-gray-800 py-4 rounded-xl items-center border border-gray-700"
              activeOpacity={0.8}
            >
              <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-base">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
