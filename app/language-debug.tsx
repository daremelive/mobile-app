import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from '../src/hooks/useTranslation';
import { SUPPORTED_LANGUAGES, saveLanguagePreference, initializeLanguage } from '../src/i18n';
import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LanguageDebugScreen() {
  const { t, currentLanguage, changeLanguage } = useTranslation();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    const getDebugInfo = async () => {
      try {
        // Get saved language
        const savedLang = await AsyncStorage.getItem('@user_language');
        
        // Get device info
        let deviceInfo = {};
        
        try {
          const RNLocalize = require('react-native-localize');
          const locales = RNLocalize.getLocales();
          deviceInfo = {
            locales: locales,
            primaryLanguage: locales?.[0]?.languageCode,
            platform: Platform.OS,
            nativeModules: {
              hasRNLocalize: true,
            }
          };
        } catch (error) {
          deviceInfo = {
            platform: Platform.OS,
            error: 'RNLocalize not available',
            nativeModules: {
              hasRNLocalize: false,
              settingsManager: !!NativeModules.SettingsManager,
              i18nManager: !!NativeModules.I18nManager,
            }
          };
        }

        setDebugInfo({
          currentLanguage,
          savedLanguage: savedLang,
          deviceInfo,
          supportedLanguages: SUPPORTED_LANGUAGES.map(l => l.code),
        });
      } catch (error) {
        setDebugInfo({ error: (error as Error).message });
      }
    };

    getDebugInfo();
  }, [currentLanguage]);

  const handleForceLanguageDetection = async () => {
    setIsChanging(true);
    try {
      console.log('🔄 Force detecting language...');
      await AsyncStorage.removeItem('@user_language'); // Clear saved preference
      const detectedLang = await initializeLanguage();
      console.log('✅ Force detection result:', detectedLang);
    } catch (error) {
      console.error('❌ Force detection failed:', error);
    } finally {
      setIsChanging(false);
    }
  };

  const handleSetSpanish = async () => {
    setIsChanging(true);
    try {
      await saveLanguagePreference('es');
      await changeLanguage('es');
      console.log('🇪🇸 Manually set to Spanish');
    } catch (error) {
      console.error('❌ Failed to set Spanish:', error);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      
      <ScrollView className="p-4">
        <Text className="text-white text-2xl font-bold mb-6 text-center">
          🔍 Language Debug
        </Text>

        {/* Current Status */}
        <View className="bg-[#1A1A1A] rounded-xl p-4 mb-4">
          <Text className="text-white text-lg font-semibold mb-2">Current Status:</Text>
          <Text className="text-green-400">Language: {currentLanguage}</Text>
          <Text className="text-gray-300">Welcome: {t('auth.welcomeBack') as string}</Text>
          <Text className="text-gray-300">Settings: {t('settings.languageSettings') as string}</Text>
        </View>

        {/* Debug Info */}
        <View className="bg-[#1A1A1A] rounded-xl p-4 mb-4">
          <Text className="text-white text-lg font-semibold mb-2">Debug Info:</Text>
          <Text className="text-gray-300 text-xs font-mono">
            {JSON.stringify(debugInfo, null, 2)}
          </Text>
        </View>

        {/* Test Actions */}
        <View className="space-y-3">
          <TouchableOpacity
            className="bg-[#FF0000] rounded-xl p-4"
            onPress={handleForceLanguageDetection}
            disabled={isChanging}
          >
            <Text className="text-white text-center font-semibold">
              {isChanging ? '⏳ Detecting...' : '🔄 Force Language Detection'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-[#FF6600] rounded-xl p-4"
            onPress={handleSetSpanish}
            disabled={isChanging}
          >
            <Text className="text-white text-center font-semibold">
              {isChanging ? '⏳ Setting...' : '🇪🇸 Force Set Spanish'}
            </Text>
          </TouchableOpacity>

          {/* Quick Language Tests */}
          <View className="bg-[#333] rounded-xl p-4">
            <Text className="text-white font-semibold mb-2">Quick Language Test:</Text>
            {SUPPORTED_LANGUAGES.slice(0, 4).map((lang) => (
              <TouchableOpacity
                key={lang.code}
                className={`p-2 rounded mb-1 ${currentLanguage === lang.code ? 'bg-[#FF0000]' : 'bg-[#555]'}`}
                onPress={() => changeLanguage(lang.code)}
              >
                <Text className="text-white text-sm">
                  {lang.code.toUpperCase()}: {lang.nativeName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
