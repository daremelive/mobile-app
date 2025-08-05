import { createApi, fetchBaseQuery, BaseQueryFn } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';
import IPDetector from '../utils/ipDetector';

// Dynamic base query that handles IP detection
const dynamicBaseQuery: BaseQueryFn = async (args, api, extraOptions) => {
  let baseUrl = 'http://192.168.1.100:8000/api/levels/'; // Default fallback
  
  if (__DEV__) {
    try {
      baseUrl = await IPDetector.getAPIBaseURL('levels');
      console.log('🔗 [LevelsAPI] Using detected URL:', baseUrl);
    } catch (error) {
      console.error('❌ [LevelsAPI] IP detection failed, using fallback:', error);
    }
  }
  
  // Create a temporary baseQuery with the detected URL
  const baseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: async (headers) => {
      try {
        const token = await SecureStore.getItemAsync('accessToken');
        if (token) {
          headers.set('authorization', `Bearer ${token}`);
        }
      } catch (error) {
        console.error('❌ [LevelsAPI] Error getting auth token:', error);
      }
      return headers;
    },
  });
  
  return baseQuery(args, api, extraOptions);
};

// Level tier interface
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
  baseQuery: dynamicBaseQuery,
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
      query: (data: { tier_id: number }) => ({
        url: 'unlock/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['UserLevel', 'LevelTiers'],
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
  useGetCoinTransactionsQuery,
} = levelsApi;
