import { BRAND_GRADIENT } from '@/constants/Gradients';
import React, { ComponentProps, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Linking,
  Modal,
  PanResponder,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../constants/Fonts';
import logger from '../src/utils/logger';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface ShareContent {
  url: string;
  title: string;
  subtitle: string;
  description: string;
  linkLabel: string;
  dialogTitle: string;
  shareText: string;
  tweetText: string;
  telegramText: string;
}

interface ShareContentModalProps {
  visible: boolean;
  onClose: () => void;
  content: ShareContent;
}

interface ShareOption {
  id: string;
  name: string;
  icon: IconName;
  gradient: readonly [string, string] | readonly [string, string, string];
  action: () => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function ShareContentModal({ visible, onClose, content }: ShareContentModalProps) {
  const slide = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState('');

  const close = () => {
    Animated.parallel([
      Animated.spring(slide, {
        toValue: SCREEN_HEIGHT,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(onClose);
  };

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => (
      gesture.dy > 0 && Math.abs(gesture.dy) > Math.abs(gesture.dx)
    ),
    onPanResponderMove: (_, gesture) => {
      if (gesture.dy > 0) slide.setValue(gesture.dy);
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 100 || gesture.vy > 0.8) {
        close();
        return;
      }
      Animated.spring(slide, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    },
  }), [slide, opacity, onClose]);

  useEffect(() => {
    if (!visible) return;
    slide.setValue(SCREEN_HEIGHT);
    scale.setValue(0.9);
    opacity.setValue(0);
    setCopied(false);
    setFeedback('');
    Animated.parallel([
      Animated.spring(slide, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
        delay: 100,
      }),
    ]).start();
  }, [visible, slide, scale, opacity]);

  const showFeedback = (message: string) => {
    setFeedback(message);
    Vibration.vibrate(50);
    setTimeout(() => setFeedback(''), 2000);
  };

  const copyLink = async () => {
    try {
      await Clipboard.setStringAsync(content.url);
      setCopied(true);
      showFeedback('Link copied');
      setTimeout(() => setCopied(false), 3000);
      return true;
    } catch (error) {
      logger.error('Could not copy a share link', error);
      showFeedback('Could not copy link');
      return false;
    }
  };

  const openTarget = async (
    nativeUrl: string,
    fallbackUrl: string | undefined,
    openingMessage: string,
    unavailableMessage: string,
  ) => {
    try {
      const supported = await Linking.canOpenURL(nativeUrl);
      const target = supported ? nativeUrl : fallbackUrl;
      if (!target) {
        showFeedback(unavailableMessage);
        return;
      }
      await Linking.openURL(target);
      showFeedback(openingMessage);
      setTimeout(close, 1000);
    } catch (error) {
      logger.error(`Could not open ${openingMessage.toLowerCase()}`, error);
      showFeedback(unavailableMessage);
    }
  };

  const shareOptions: ShareOption[] = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: 'chatbubble',
      gradient: ['#25D366', '#128C7E'],
      action: () => void openTarget(
        `whatsapp://send?text=${encodeURIComponent(content.shareText)}`,
        undefined,
        'Opening WhatsApp',
        'WhatsApp is not available',
      ),
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: 'logo-twitter',
      gradient: ['#1DA1F2', '#0d8bd9'],
      action: () => void openTarget(
        `twitter://post?message=${encodeURIComponent(content.tweetText)}`,
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(content.tweetText)}`,
        'Opening Twitter',
        'Twitter is not available',
      ),
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: 'camera',
      gradient: ['#E4405F', '#5851DB', '#405DE6'],
      action: () => {
        void (async () => {
          const copiedLink = await copyLink();
          if (!copiedLink) return;
          await openTarget(
            'instagram://app',
            undefined,
            'Opening Instagram',
            'Instagram is not available',
          );
        })();
      },
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: 'logo-facebook',
      gradient: ['#4267B2', '#365492'],
      action: () => void openTarget(
        `fb://facewebmodal/f?href=${encodeURIComponent(content.url)}`,
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(content.url)}`,
        'Opening Facebook',
        'Facebook is not available',
      ),
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: 'paper-plane-outline',
      gradient: ['#0088cc', '#005577'],
      action: () => void openTarget(
        `tg://msg_url?url=${encodeURIComponent(content.url)}&text=${encodeURIComponent(content.telegramText)}`,
        undefined,
        'Opening Telegram',
        'Telegram is not available',
      ),
    },
    {
      id: 'copy',
      name: 'Copy Link',
      icon: copied ? 'checkmark-circle' : 'link-outline',
      gradient: copied ? ['#4CAF50', '#45a049'] : BRAND_GRADIENT,
      action: () => void copyLink(),
    },
  ];

  const moreOptions = async () => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(content.url, {
          dialogTitle: content.dialogTitle,
          mimeType: 'text/plain',
        });
        showFeedback('Share menu opened');
        setTimeout(close, 1000);
        return;
      }
      await copyLink();
    } catch (error) {
      logger.error('Could not open the system share menu', error);
      await copyLink();
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <View className="flex-1">
        <Animated.View style={{ opacity }} className="absolute inset-0">
          <TouchableOpacity activeOpacity={1} onPress={close} className="flex-1">
            <BlurView intensity={30} tint="dark" className="flex-1 bg-black/70" />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={{ transform: [{ translateY: slide }, { scale }], opacity }}
          className="absolute bottom-0 left-0 right-0"
          {...panResponder.panHandlers}
        >
          <View className="bg-[#090909] rounded-t-3xl overflow-hidden mx-2 mb-4 shadow-2xl">
            <View className="items-center py-4">
              <View className="w-12 h-1.5 bg-gray-600 rounded-full opacity-60" />
            </View>

            <View className="px-6 pb-6">
              <View className="flex-row items-center mb-3">
                <View className="w-12 h-12 bg-[#C42720] rounded-2xl items-center justify-center mr-4">
                  <Ionicons name="share-outline" size={24} color="white" />
                </View>
                <View className="flex-1">
                  <Text style={{ fontFamily: fonts.bold }} className="text-white text-xl mb-1">
                    {content.title}
                  </Text>
                  <Text style={{ fontFamily: fonts.medium }} className="text-[#C42720] text-sm">
                    {content.subtitle}
                  </Text>
                </View>
              </View>
              <Text style={{ fontFamily: fonts.regular }} className="text-gray-400 text-sm leading-6">
                {content.description}
              </Text>
            </View>

            {feedback ? (
              <View className="mx-6 mb-4 p-3 bg-[#1C1C1E] rounded-xl border border-gray-800">
                <Text style={{ fontFamily: fonts.medium }} className="text-white text-center text-sm">
                  {feedback}
                </Text>
              </View>
            ) : null}

            <View className="px-6 pb-6">
              <View className="flex-row flex-wrap justify-between">
                {shareOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    onPress={option.action}
                    className="items-center mb-6"
                    style={{ width: '30%' }}
                    activeOpacity={0.7}
                  >
                    <View className="relative">
                      <LinearGradient
                        colors={[...option.gradient]}
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
                        <Ionicons name={option.icon} size={28} color="white" />
                        <LinearGradient
                          colors={['rgba(255,255,255,0.25)', 'transparent', 'transparent']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          className="absolute inset-0 rounded-2xl"
                        />
                        <View className="absolute inset-0 rounded-2xl border border-white/10" />
                      </LinearGradient>
                      {option.id === 'copy' && copied ? (
                        <View className="absolute -top-2 -right-2 w-7 h-7 bg-green-500 rounded-full items-center justify-center border-2 border-[#090909]">
                          <Ionicons name="checkmark" size={16} color="white" />
                        </View>
                      ) : null}
                    </View>
                    <Text style={{ fontFamily: fonts.medium }} className="text-white text-xs text-center" numberOfLines={1}>
                      {option.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="mx-6 mb-6">
              <TouchableOpacity
                onPress={() => void copyLink()}
                activeOpacity={0.8}
                className="p-4 bg-[#1C1C1E] rounded-xl border border-gray-800"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-3">
                    <Text style={{ fontFamily: fonts.medium }} className="text-gray-400 text-xs mb-1">
                      {content.linkLabel}
                    </Text>
                    <Text style={{ fontFamily: fonts.regular }} className="text-white text-sm" numberOfLines={1} ellipsizeMode="middle">
                      {content.url}
                    </Text>
                  </View>
                  <LinearGradient
                    colors={copied ? ['#4CAF50', '#45a049'] : BRAND_GRADIENT}
                    className="w-12 h-12 rounded-xl items-center justify-center"
                  >
                    <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={20} color="white" />
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => void moreOptions()}
              className="mx-6 mb-6 p-4 bg-[#1C1C1E] rounded-xl border border-gray-800 flex-row items-center justify-center"
              activeOpacity={0.8}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#C42720" />
              <Text style={{ fontFamily: fonts.semiBold }} className="text-[#C42720] text-base ml-3">
                More Sharing Options
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={close}
              className="mx-6 mb-8 bg-gray-800 py-4 rounded-xl items-center border border-gray-700"
              activeOpacity={0.8}
            >
              <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-base">Cancel</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
