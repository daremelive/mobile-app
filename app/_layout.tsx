import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { fontsToLoad } from '../constants/Fonts';
import { StoreProvider } from '../src/store/Provider';
import '../global.css';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function AppLayout() {
  const { useAuthSession } = require('../src/hooks/useAuthSession');
  const { isLoading: authLoading } = useAuthSession();
  const [fontsLoaded] = useFonts(fontsToLoad);

  useEffect(() => {
    if (fontsLoaded && !authLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, authLoading]);

  if (!fontsLoaded || authLoading) {
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
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <StoreProvider>
      <AppLayout />
    </StoreProvider>
  );
}
