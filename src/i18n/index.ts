import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';

// Import language resources
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import pt from './locales/pt.json';
import ar from './locales/ar.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import hi from './locales/hi.json';
import ru from './locales/ru.json';
import { logger } from '../utils/logger';

// Award-winning language detection with fallback
const getDeviceLanguage = (): string => {
  try {
    // Try to get react-native-localize if available
    const RNLocalize = require('react-native-localize');
    const deviceLocales = RNLocalize.getLocales();
    if (deviceLocales && deviceLocales.length > 0) {
      const primaryLocale = deviceLocales[0];
      return primaryLocale.languageCode;
    }
  } catch (error) {
  }

  // Fallback to platform-specific detection
  let deviceLanguage = 'en';
  
  if (Platform.OS === 'ios') {
    // iOS fallback
    const locale = NativeModules.SettingsManager?.settings?.AppleLocale || 
                   NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
                   'en';
    deviceLanguage = locale.split('_')[0];
  } else if (Platform.OS === 'android') {
    // Android fallback
    const locale = NativeModules.I18nManager?.localeIdentifier || 'en';
    deviceLanguage = locale.split('_')[0];
  }

  return deviceLanguage;
};

// RTL language support
export const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

// Resources configuration
const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  pt: { translation: pt },
  ar: { translation: ar },
  zh: { translation: zh },
  ja: { translation: ja },
  hi: { translation: hi },
  ru: { translation: ru },
};

// Supported languages
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
];

// Initialize i18n with award-winning configuration
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Start with English, then detect device language
    fallbackLng: 'en',
    debug: __DEV__,
    
    // Professional interpolation
    interpolation: {
      escapeValue: false,
      formatSeparator: ',',
    },
    
    // Award-winning performance
    load: 'languageOnly',
    preload: ['en', 'es'], // Preload common languages
    
    // Advanced features
    saveMissing: __DEV__,
    saveMissingTo: 'current',
    
    react: {
      useSuspense: false,
    },
  });

// Language persistence utilities
export const saveLanguagePreference = async (languageCode: string) => {
  try {
    await AsyncStorage.setItem('@user_language', languageCode);
    await i18n.changeLanguage(languageCode);
  } catch (error) {
    logger.error('Failed to save language preference:', error);
  }
};

export const loadLanguagePreference = async () => {
  try {
    
    // First, check for saved language preference
    const savedLanguage = await AsyncStorage.getItem('@user_language');
    
    if (savedLanguage && SUPPORTED_LANGUAGES.find(lang => lang.code === savedLanguage)) {
      await i18n.changeLanguage(savedLanguage);
      return savedLanguage;
    }
    
    // If no saved preference, detect device language
    const deviceLang = getDeviceLanguage();
    
    // Check if device language is supported
    if (SUPPORTED_LANGUAGES.find(lang => lang.code === deviceLang)) {
      await i18n.changeLanguage(deviceLang);
      // Save the detected language for next time
      await AsyncStorage.setItem('@user_language', deviceLang);
      return deviceLang;
    }
    
    return 'en'; // Ultimate fallback
  } catch (error) {
    logger.error('Failed to load language preference:', error);
    return 'en';
  }
};

// Check if language is RTL
export const isRTLLanguage = (languageCode: string): boolean => {
  return RTL_LANGUAGES.includes(languageCode);
};

// Initial language setup - call this when app starts
export const initializeLanguage = async () => {
  try {
    const selectedLanguage = await loadLanguagePreference();
    return selectedLanguage;
  } catch (error) {
    logger.error('Language initialization failed:', error);
    return 'en';
  }
};

export default i18n;
