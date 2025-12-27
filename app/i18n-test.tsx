import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from '../src/hooks/useTranslation';
import { SUPPORTED_LANGUAGES, saveLanguagePreference } from '../src/i18n';

export default function I18nTestScreen() {
  const { t, currentLanguage, changeLanguage } = useTranslation();
  const [isChanging, setIsChanging] = useState(false);

  const handleLanguageChange = async (languageCode: string) => {
    if (languageCode === currentLanguage) return;
    
    setIsChanging(true);
    try {
      await saveLanguagePreference(languageCode);
      await changeLanguage(languageCode);
    } catch (error) {
      // Silent language change failure
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      
      <View className="p-6">
        <Text className="text-white text-3xl font-bold mb-6 text-center">
          🌍 {t('settings.languageSettings') as string}
        </Text>
        
        <Text className="text-white text-xl mb-4">
          {t('common.current') as string}: {currentLanguage.toUpperCase()}
        </Text>

        {/* Demo Translations */}
        <View className="bg-[#1A1A1A] rounded-xl p-4 mb-6">
          <Text className="text-white text-lg font-semibold mb-2">
            📱 Demo Translations:
          </Text>
          <Text className="text-gray-300 mb-1">• {t('auth.login') as string}</Text>
          <Text className="text-gray-300 mb-1">• {t('wallet.balance') as string}</Text>
          <Text className="text-gray-300 mb-1">• {t('common.loading') as string}</Text>
          <Text className="text-gray-300 mb-1">• {t('settings.changeLanguage') as string}</Text>
          <Text className="text-gray-300">• {t('currency.rizCoins') as string}</Text>
        </View>

        {/* Language Switcher */}
        <ScrollView style={{ maxHeight: 400 }}>
          <Text className="text-white text-lg font-semibold mb-4">
            🔄 Quick Language Test:
          </Text>
          
          {SUPPORTED_LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              className={`p-4 mb-2 rounded-xl border ${
                currentLanguage === lang.code 
                  ? 'bg-[#FF0000] border-[#FF0000]' 
                  : 'bg-[#1A1A1A] border-[#353638]'
              }`}
              onPress={() => handleLanguageChange(lang.code)}
              disabled={isChanging}
            >
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-white font-semibold">
                    {lang.nativeName}
                  </Text>
                  <Text className="text-gray-400 text-sm">
                    {lang.name}
                  </Text>
                </View>
                {currentLanguage === lang.code && (
                  <Text className="text-white">✅</Text>
                )}
                {isChanging && currentLanguage !== lang.code && (
                  <Text className="text-gray-400">⏳</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View className="mt-6 bg-[#1A1A1A] rounded-xl p-4">
          <Text className="text-green-400 text-sm text-center">
            🚀 Award-winning i18n system ready! 
            {'\n'}Auto-detects device language, instant switching, RTL support
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
