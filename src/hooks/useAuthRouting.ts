import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { selectIsAuthenticated, selectCurrentUser } from '../store/authSlice';

/**
 * 🚀 INDUSTRY-STANDARD AUTH ROUTING HOOK
 * 
 * Handles sophisticated authentication routing based on user state:
 * - New user (first time) → Get Started (onboarding)
 * - Returning user (has account, logged out) → Login screen
 * - Authenticated user → Home screen (tabs)
 * 
 * Features:
 * - Persistent tracking of first-time users
 * - Graceful handling of edge cases (app reinstall, cache clear)
 * - Optimized performance with minimal storage checks
 * - Waits for auth session to load before routing
 */

const AUTH_STORAGE_KEYS = {
  HAS_SEEN_ONBOARDING: 'hasSeenOnboarding',
  HAS_CREATED_ACCOUNT: 'hasCreatedAccount',
} as const;

interface AuthRoutingProps {
  authLoading?: boolean;
}

export const useAuthRouting = (authLoading: boolean = false) => {
  const [isRoutingReady, setIsRoutingReady] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);

  useEffect(() => {
    // Don't run routing while auth is still loading
    if (authLoading) {
      console.log('⏳ Auth still loading, waiting...');
      return;
    }

    // Prevent multiple navigation attempts
    if (hasNavigated) {
      setIsRoutingReady(true);
      return;
    }

    const handleAuthRouting = async () => {
      try {
        // Add small delay to let the app settle
        await new Promise(resolve => setTimeout(resolve, 100));

        // Get user history from storage
        const [hasSeenOnboarding, hasCreatedAccount] = await Promise.all([
          AsyncStorage.getItem(AUTH_STORAGE_KEYS.HAS_SEEN_ONBOARDING),
          AsyncStorage.getItem(AUTH_STORAGE_KEYS.HAS_CREATED_ACCOUNT),
        ]);

        console.log('🔍 Auth Routing Debug:', {
          isAuthenticated,
          hasUser: !!currentUser,
          hasSeenOnboarding: !!hasSeenOnboarding,
          hasCreatedAccount: !!hasCreatedAccount,
          userId: currentUser?.id,
          authLoading,
        });

        // Case 1: User is fully authenticated - go to main app
        if (isAuthenticated && currentUser) {
          console.log('✅ Authenticated user - navigating to home');
          setHasNavigated(true);
          setTimeout(() => router.replace('/(tabs)/home'), 50);
          return;
        }

        // Case 2: User has created account before (even if logged out) - go to login
        if (hasCreatedAccount) {
          console.log('🔄 Returning user - navigating to login');
          setHasNavigated(true);
          setTimeout(() => router.replace('/(auth)/signin'), 50);
          return;
        }

        // Case 3: User has seen onboarding but no account created - go to login first
        if (hasSeenOnboarding) {
          console.log('📝 Seen onboarding - navigating to login (can switch to signup)');
          setHasNavigated(true);
          setTimeout(() => router.replace('/(auth)/signin'), 50);
          return;
        }

        // Case 4: Brand new user - stay on onboarding (default)
        console.log('🆕 First-time user - staying on onboarding');
        // No navigation needed - user is already on index.tsx (onboarding)

      } catch (error) {
        console.error('❌ Auth routing error:', error);
        // Fallback: treat as new user if storage fails
        console.log('⚠️ Storage error - defaulting to onboarding');
      } finally {
        setIsRoutingReady(true);
      }
    };

    handleAuthRouting();
  }, [isAuthenticated, currentUser, hasNavigated, authLoading]);

  return { isRoutingReady };
};

/**
 * 🏷️ STORAGE TRACKING UTILITIES
 * 
 * Call these functions at appropriate points in your auth flow
 * to track user progress and enable smart routing
 */

export const markOnboardingSeen = async () => {
  try {
    await AsyncStorage.setItem(AUTH_STORAGE_KEYS.HAS_SEEN_ONBOARDING, 'true');
    console.log('✓ Onboarding marked as seen');
  } catch (error) {
    console.error('❌ Failed to mark onboarding as seen:', error);
  }
};

export const markAccountCreated = async () => {
  try {
    await AsyncStorage.setItem(AUTH_STORAGE_KEYS.HAS_CREATED_ACCOUNT, 'true');
    console.log('✓ Account creation marked');
  } catch (error) {
    console.error('❌ Failed to mark account creation:', error);
  }
};

export const clearAuthHistory = async () => {
  try {
    await Promise.all([
      AsyncStorage.removeItem(AUTH_STORAGE_KEYS.HAS_SEEN_ONBOARDING),
      AsyncStorage.removeItem(AUTH_STORAGE_KEYS.HAS_CREATED_ACCOUNT),
    ]);
    console.log('✓ Auth history cleared');
  } catch (error) {
    console.error('❌ Failed to clear auth history:', error);
  }
};

/**
 * 🔧 UTILITY FUNCTIONS
 * 
 * Helper functions for checking user state without triggering navigation
 */

export const getAuthState = async () => {
  try {
    const [hasSeenOnboarding, hasCreatedAccount] = await Promise.all([
      AsyncStorage.getItem(AUTH_STORAGE_KEYS.HAS_SEEN_ONBOARDING),
      AsyncStorage.getItem(AUTH_STORAGE_KEYS.HAS_CREATED_ACCOUNT),
    ]);

    return {
      hasSeenOnboarding: !!hasSeenOnboarding,
      hasCreatedAccount: !!hasCreatedAccount,
    };
  } catch (error) {
    console.error('❌ Failed to get auth state:', error);
    return {
      hasSeenOnboarding: false,
      hasCreatedAccount: false,
    };
  }
};
