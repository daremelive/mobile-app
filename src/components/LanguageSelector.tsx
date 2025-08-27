import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  SafeAreaView,
  I18nManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';
import { SUPPORTED_LANGUAGES, saveLanguagePreference, isRTLLanguage } from '../i18n';

interface LanguageSelectorProps {
  visible: boolean;
  onClose: () => void;
  onLanguageChange?: (languageCode: string) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  visible,
  onClose,
  onLanguageChange,
}) => {
  const { t, currentLanguage, changeLanguage } = useTranslation();
  const [isChanging, setIsChanging] = useState(false);

  const handleLanguageSelect = async (languageCode: string) => {
    if (languageCode === currentLanguage) {
      onClose();
      return;
    }

    setIsChanging(true);
    
    try {
      // Save language preference
      await saveLanguagePreference(languageCode);
      
      // Change i18n language
      await changeLanguage(languageCode);
      
      // Handle RTL layout changes
      const isRTL = isRTLLanguage(languageCode);
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
      
      // Notify parent component
      onLanguageChange?.(languageCode);
      
      // Close modal
      onClose();
      
      // Note: For full RTL support, app restart might be needed
      if (isRTL !== I18nManager.isRTL) {
        // You might want to show a restart prompt here
        console.log('RTL layout change requires app restart for full effect');
      }
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setIsChanging(false);
    }
  };

  const getCurrentLanguageName = () => {
    const currentLang = SUPPORTED_LANGUAGES.find(lang => lang.code === currentLanguage);
    return currentLang?.nativeName || currentLang?.name || 'English';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>{t('settings.selectLanguage') as string}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Current Language */}
        <View style={styles.currentSection}>
          <Text style={styles.currentLabel}>{t('common.current') as string}:</Text>
          <Text style={styles.currentLanguage}>{getCurrentLanguageName()}</Text>
        </View>

        {/* Language List */}
        <ScrollView style={styles.languageList} showsVerticalScrollIndicator={false}>
          {SUPPORTED_LANGUAGES.map((language) => (
            <TouchableOpacity
              key={language.code}
              style={[
                styles.languageItem,
                currentLanguage === language.code && styles.selectedLanguage,
              ]}
              onPress={() => handleLanguageSelect(language.code)}
              disabled={isChanging}
            >
              <View style={styles.languageInfo}>
                <Text style={[
                  styles.languageName,
                  currentLanguage === language.code && styles.selectedText,
                ]}>
                  {language.nativeName}
                </Text>
                <Text style={[
                  styles.languageEnglishName,
                  currentLanguage === language.code && styles.selectedSubText,
                ]}>
                  {language.name}
                </Text>
              </View>
              
              {currentLanguage === language.code && (
                <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
              )}
              
              {isChanging && currentLanguage !== language.code && (
                <View style={styles.loadingDot} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('settings.languageAutoDetected', 'Language is auto-detected from your device') as string}
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 32,
  },
  currentSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  currentLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  currentLanguage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  languageList: {
    flex: 1,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedLanguage: {
    backgroundColor: '#F0F8FF',
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  languageEnglishName: {
    fontSize: 14,
    color: '#666',
  },
  selectedText: {
    color: '#007AFF',
  },
  selectedSubText: {
    color: '#5A9BD4',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CCC',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
    backgroundColor: '#F8F9FA',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default LanguageSelector;
