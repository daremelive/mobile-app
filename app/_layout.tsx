import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { fontsToLoad } from '../constants/Fonts';
import { StoreProvider } from '../src/store/Provider';
import { NotificationProvider } from '../src/context/NotificationContext';
import { useStreamCleanup } from '../src/hooks/useStreamCleanup';
import { useAuthRouting } from '../src/hooks/useAuthRouting';
import { I18nextProvider } from 'react-i18next';
import i18n, { initializeLanguage } from '../src/i18n';
import '../global.css';

// Initialize Sentry for production error tracking
import '../sentry.config';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function AppLayout() {
  const { useAuthSession } = require('../src/hooks/useAuthSession');
  const { isLoading: authLoading } = useAuthSession();
  const [fontsLoaded] = useFonts(fontsToLoad);
  const [languageReady, setLanguageReady] = useState(false);
  
  // Stream cleanup system disabled - streams persist indefinitely for better UX
  useStreamCleanup();

  // Initialize i18n language preferences
  useEffect(() => {
    const setupLanguage = async () => {
      try {
        const selectedLanguage = await initializeLanguage();
        console.log('🎯 Language setup complete:', selectedLanguage);
        setLanguageReady(true);
      } catch (error) {
        console.error('Language setup failed:', error);
        setLanguageReady(true); // Continue anyway
      }
    };
    
    setupLanguage();
  }, []);

  // Only run auth routing after auth session is loaded
  const { isRoutingReady } = useAuthRouting(authLoading);

  useEffect(() => {
    // Only hide splash when all initialization is complete
    if (fontsLoaded && !authLoading && isRoutingReady && languageReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, authLoading, isRoutingReady, languageReady]);

  // Show splash screen while any loading is in progress
  if (!fontsLoaded || authLoading || !isRoutingReady || !languageReady) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="popular-channels" options={{ headerShown: false }} />
      <Stack.Screen name="wallet" options={{ headerShown: false }} />
      <Stack.Screen name="get-coins" options={{ headerShown: false }} />
      <Stack.Screen name="withdraw-money" options={{ headerShown: false }} />
      <Stack.Screen name="transactions" options={{ headerShown: false }} />
      <Stack.Screen name="unlock-level" options={{ headerShown: false }} />
      <Stack.Screen name="blocked-list" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="account" options={{ headerShown: false }} />
      <Stack.Screen name="language" options={{ headerShown: false }} />
      <Stack.Screen name="enter-bank-details" options={{ headerShown: false }} />
      <Stack.Screen name="identity-verification" options={{ headerShown: false }} />
      <Stack.Screen name="stream" options={{ headerShown: false }} />
      <Stack.Screen name="auth-debug" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <I18nextProvider i18n={i18n}>
      <StoreProvider>
        <NotificationProvider>
          <AppLayout />
        </NotificationProvider>
      </StoreProvider>
    </I18nextProvider>
  );
}
