import { useTranslation as useI18nTranslation } from 'react-i18next';
import { useCallback, useState, useEffect } from 'react';

// Award-winning translation hook with enhanced features and forced re-rendering
export const useTranslation = (namespace?: string) => {
  const { t, i18n } = useI18nTranslation(namespace);
  const [, forceUpdate] = useState({});

  // Force component re-render when language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      console.log('🔄 [useTranslation] Language changed, forcing re-render:', i18n.language);
      forceUpdate({}); // Force re-render
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  // Enhanced translation function with fallbacks
  const translate = useCallback((key: string, options?: any) => {
    try {
      const translation = t(key, options);
      // If translation returns the key itself, it means it's missing
      if (translation === key && !options?.fallback) {
        console.warn(`Missing translation for key: ${key} (current language: ${i18n.language})`);
        return key.split('.').pop() || key; // Return last part of key as fallback
      }
      return translation;
    } catch (error) {
      console.error(`Translation error for key: ${key}`, error);
      return key;
    }
  }, [t, i18n.language]); // Add i18n.language dependency to re-create when language changes

  // Language utilities
  const changeLanguage = useCallback(async (languageCode: string) => {
    try {
      console.log('🌍 [useTranslation] Changing language to:', languageCode);
      await i18n.changeLanguage(languageCode);
      console.log('✅ [useTranslation] Language changed successfully to:', languageCode);
    } catch (error) {
      console.error('❌ [useTranslation] Failed to change language:', error);
    }
  }, [i18n]);

  const getCurrentLanguage = useCallback(() => {
    return i18n.language || 'en';
  }, [i18n.language]);

  const isRTL = useCallback(() => {
    const currentLang = getCurrentLanguage();
    return ['ar', 'he', 'fa', 'ur'].includes(currentLang);
  }, [getCurrentLanguage]);

  return {
    t: translate,
    i18n,
    changeLanguage,
    currentLanguage: getCurrentLanguage(),
    isRTL: isRTL(),
    ready: i18n.isInitialized,
  };
};

export default useTranslation;
