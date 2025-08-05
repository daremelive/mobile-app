import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';

// Base URL detection logic (same as authApi)
const getBaseUrl = () => {
  console.log('🔧 [LevelsAPI] Detecting API base URL...');
  
  if (__DEV__) {
    // For Expo Go development, Metro exposes the local IP
    // @ts-ignore
    const { manifest } = require('expo-constants').default;
    console.log('📱 [LevelsAPI] Expo manifest:', manifest);
    
    if (manifest?.debuggerHost) {
      const ip = manifest.debuggerHost.split(':')[0];
      const url = `http://${ip}:8000/api/levels/`;
      console.log(`🔗 [LevelsAPI] Auto-detected API URL from debuggerHost: ${url}`);
      return url;
    }
    
    // Alternative method: Check for localhost/development environment
    try {
      // In development, we can also check window.location if available
      if (typeof window !== 'undefined' && window.location?.hostname) {
        const ip = window.location.hostname;
        if (ip !== 'localhost' && ip !== '127.0.0.1') {
          const url = `http://${ip}:8000/api/levels/`;
          console.log(`🔗 [LevelsAPI] Using window hostname: ${url}`);
          return url;
        }
      }
    } catch (e) {
      // Ignore errors in React Native environment
      console.log('⚠️ [LevelsAPI] Window location not available (normal in React Native)');
    }
  }
  
  // Fallback for production or if IP detection fails
  const fallbackUrl = 'http://172.20.10.3:8000/api/levels/';
  console.log(`🔗 [LevelsAPI] Using fallback API URL: ${fallbackUrl}`);
  return fallbackUrl;
};

const baseQuery = fetchBaseQuery({
  baseUrl: getBaseUrl(),
  prepareHeaders: async (headers) => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
        console.log('🔑 [LevelsAPI] Added auth token to request');
      } else {
        console.warn('⚠️ [LevelsAPI] No auth token found');
      }
    } catch (error) {
      console.error('❌ [LevelsAPI] Error getting access token:', error);
    }
    return headers;
  },
});

export interface LevelTier {
  id: number;
  name: string;
  display_name: string;
  required_coins: number;
  coin_range_display: string;
  description: string;
  benefits: string[];
  color_hex: string;
  order: number;
  is_unlocked: boolean;
  is_current: boolean;
}

export interface UserLevelSummary {
  current_tier: {
    name: string;
    display_name: string;
    color_hex: string;
  };
  coins: {
    current: number;
    total_earned: number;
    needed_for_next: number;
  };
  progress: number;
  next_tier: {
    name: string;
    display_name: string;
    required_coins: number;
  } | null;
}

export interface UserCoins {
  current_coins: number;
  total_earned: number;
  total_spent: number;
  current_tier: LevelTier;
  next_tier: LevelTier | null;
  progress_to_next: number;
}

export interface CoinTransaction {
  id: number;
  amount: number;
  transaction_type: string;
  reason: string;
  created_at: string;
}

export const levelsApi = createApi({
  reducerPath: 'levelsApi',
  baseQuery,
  tagTypes: ['UserLevel', 'LevelTiers', 'CoinTransactions'],
  endpoints: (builder) => ({
    // Get user level summary
    getUserLevelSummary: builder.query<UserLevelSummary, void>({
      query: () => 'summary/',
      providesTags: ['UserLevel'],
    }),

    // Get user level status
    getUserLevelStatus: builder.query<UserCoins, void>({
      query: () => 'status/',
      providesTags: ['UserLevel'],
    }),

    // Get all level tiers
    getLevelTiers: builder.query<LevelTier[], void>({
      query: () => 'tiers/',
      transformResponse: (response: { results: LevelTier[] }) => response.results,
      providesTags: ['LevelTiers'],
    }),

    // Unlock a level
    unlockLevel: builder.mutation<
      { message: string; tier: LevelTier },
      { tier_id: number }
    >({
      query: (data) => ({
        url: 'unlock/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['UserLevel', 'LevelTiers'],
    }),

    // Add coins (for testing)
    addCoins: builder.mutation<
      { message: string; current_coins: number; total_earned: number },
      { amount: number; reason?: string }
    >({
      query: (data) => ({
        url: 'add-coins/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['UserLevel'],
    }),

    // Get coin transactions
    getCoinTransactions: builder.query<CoinTransaction[], void>({
      query: () => 'transactions/',
      transformResponse: (response: { results: CoinTransaction[] }) => response.results,
      providesTags: ['CoinTransactions'],
    }),
  }),
});

export const {
  useGetUserLevelSummaryQuery,
  useGetUserLevelStatusQuery,
  useGetLevelTiersQuery,
  useUnlockLevelMutation,
  useAddCoinsMutation,
  useGetCoinTransactionsQuery,
} = levelsApi;
