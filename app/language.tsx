import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import { useTranslation } from '../src/hooks/useTranslation';
import LanguageSelector from '../src/components/LanguageSelector';
import { SUPPORTED_LANGUAGES } from '../src/i18n';

const LanguageScreen = () => {
  const router = useRouter();
  const { t, currentLanguage } = useTranslation();
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  const getCurrentLanguageName = () => {
    const currentLang = SUPPORTED_LANGUAGES.find(lang => lang.code === currentLanguage);
    return currentLang?.nativeName || currentLang?.name || 'English';
  };

  const handleLanguageChange = (languageCode: string) => {
    // Could trigger a success toast here
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      
      {/* Header */}
      <View className="flex-row items-center relative px-4 pt-3 pb-3">
        <TouchableOpacity onPress={() => router.back()} className="absolute left-4 z-10">
          <View className="w-14 h-14 bg-[#1A1A1A] rounded-full justify-center items-center">
            <ArrowLeftIcon width={24} height={24}/>
          </View>
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-white text-[20px] font-semibold">
            {t('settings.languageSettings') as string}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 mt-6">
        {/* Current Language Section */}
        <View className="mb-8">
          <Text className="text-white text-lg font-semibold mb-4">
            {t('settings.currentLanguage', 'Current Language') as string}
          </Text>
          <View className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#353638]">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-white text-base font-medium">
                  {getCurrentLanguageName()}
                </Text>
                <Text className="text-gray-400 text-sm mt-1">
                  {t('settings.activeLanguage', 'Active language') as string}
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={24} color="#00C851" />
            </View>
          </View>
        </View>

        {/* Change Language Section */}
        <View className="mb-8">
          <Text className="text-white text-lg font-semibold mb-4">
            {t('settings.changeLanguage', 'Change Language') as string}
          </Text>
          <TouchableOpacity
            className="bg-[#FF0000] rounded-2xl p-4 flex-row items-center justify-between"
            onPress={() => setShowLanguageSelector(true)}
          >
            <View className="flex-row items-center">
              <Ionicons name="language" size={24} color="#fff" />
              <Text className="text-white text-base font-medium ml-3">
                {t('settings.selectLanguage') as string}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Language Features */}
        <View className="mb-8">
          <Text className="text-white text-lg font-semibold mb-4">
            {t('settings.languageFeatures', 'Language Features') as string}
          </Text>
          
          <View className="space-y-3">
            <View className="bg-[#1A1A1A] rounded-xl p-4 border border-[#353638]">
              <View className="flex-row items-center mb-2">
                <Ionicons name="globe" size={20} color="#00C851" />
                <Text className="text-white text-base font-medium ml-3">
                  {t('settings.autoDetection', 'Auto Detection') as string}
                </Text>
              </View>
              <Text className="text-gray-400 text-sm">
                {t('settings.autoDetectionDesc', 'Language is automatically detected from your device settings') as string}
              </Text>
            </View>

            <View className="bg-[#1A1A1A] rounded-xl p-4 border border-[#353638]">
              <View className="flex-row items-center mb-2">
                <Ionicons name="swap-horizontal" size={20} color="#007AFF" />
                <Text className="text-white text-base font-medium ml-3">
                  {t('settings.instantSwitching', 'Instant Switching') as string}
                </Text>
              </View>
              <Text className="text-gray-400 text-sm">
                {t('settings.instantSwitchingDesc', 'Changes apply immediately without restarting the app') as string}
              </Text>
            </View>

            <View className="bg-[#1A1A1A] rounded-xl p-4 border border-[#353638]">
              <View className="flex-row items-center mb-2">
                <Ionicons name="text" size={20} color="#FF9500" />
                <Text className="text-white text-base font-medium ml-3">
                  {t('settings.rtlSupport', 'RTL Support') as string}
                </Text>
              </View>
              <Text className="text-gray-400 text-sm">
                {t('settings.rtlSupportDesc', 'Full support for right-to-left languages like Arabic') as string}
              </Text>
            </View>
          </View>
        </View>

        {/* Supported Languages Preview */}
        <View className="mb-8">
          <Text className="text-white text-lg font-semibold mb-4">
            {t('settings.supportedLanguages', 'Supported Languages') as string}
          </Text>
          <Text className="text-gray-400 text-sm mb-4">
            {t('settings.supportedLanguagesCount', `We support ${SUPPORTED_LANGUAGES.length} languages worldwide`) as string}
          </Text>
          
          <View className="bg-[#1A1A1A] rounded-xl p-4 border border-[#353638]">
            <View className="flex-row flex-wrap">
              {SUPPORTED_LANGUAGES.slice(0, 6).map((lang, index) => (
                <View key={lang.code} className="mr-3 mb-2">
                  <Text className="text-gray-300 text-sm">
                    {lang.nativeName}
                    {index < 5 && index < SUPPORTED_LANGUAGES.slice(0, 6).length - 1 ? ' •' : ''}
                  </Text>
                </View>
              ))}
              {SUPPORTED_LANGUAGES.length > 6 && (
                <Text className="text-gray-400 text-sm">
                  +{SUPPORTED_LANGUAGES.length - 6} {t('common.more', 'more') as string}
                </Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Language Selector Modal */}
      <LanguageSelector
        visible={showLanguageSelector}
        onClose={() => setShowLanguageSelector(false)}
        onLanguageChange={handleLanguageChange}
      />
    </SafeAreaView>
  );
};

export default LanguageScreen;
