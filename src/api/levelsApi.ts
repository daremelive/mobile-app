import { createApi, fetchBaseQuery, BaseQueryFn } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';
import IPDetector from '../utils/ipDetector';

// Dynamic base query that handles IP detection
const dynamicBaseQuery: BaseQueryFn = async (args, api, extraOptions) => {
  let baseUrl = 'http://172.20.10.2:8000/api/levels/'; // Updated fallback IP
  
  if (__DEV__) {
    try {
      const detectedUrl = await IPDetector.getAPIBaseURL();
      baseUrl = `${detectedUrl}levels/`;
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

export interface StreamPrivileges {
  can_create_streams: boolean;
  can_join_streams: boolean;
  accessible_channels: Array<{
    code: string;
    name: string;
  }>;
  max_stream_duration_minutes: number;
  tier_name: string;
  tier_display_name: string;
}

export const levelsApi = createApi({
  reducerPath: 'levelsApi',
  baseQuery: dynamicBaseQuery,
  tagTypes: ['UserLevel', 'LevelTiers', 'CoinTransactions', 'StreamPrivileges'],
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

    // Get user's streaming privileges
    getUserStreamPrivileges: builder.query<StreamPrivileges, void>({
      query: () => 'privileges/',
      providesTags: ['StreamPrivileges'],
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
      invalidatesTags: ['UserLevel', 'LevelTiers', 'StreamPrivileges'],
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
  useGetUserStreamPrivilegesQuery,
  useUnlockLevelMutation,
  useGetCoinTransactionsQuery,
} = levelsApi;
