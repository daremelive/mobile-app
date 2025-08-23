import { createApi, fetchBaseQuery, BaseQueryFn } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';
import IPDetector from '../utils/ipDetector';
import { AppConfig } from '../config/env';

const dynamicBaseQuery: BaseQueryFn = async (args, api, extraOptions) => {
  let baseUrl = `${AppConfig.PRODUCTION_API_URL}/levels/`;
  
  if (__DEV__) {
    try {
      const detectedUrl = await IPDetector.getAPIBaseURL();
      baseUrl = `${detectedUrl}levels/`;
    } catch (error) {
      // Silent fallback to production URL
    }
  }
  
  const baseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: async (headers) => {
      try {
        const token = await SecureStore.getItemAsync('accessToken');
        if (token) {
          headers.set('authorization', `Bearer ${token}`);
        }
      } catch (error) {
        // Silent error handling
      }
      return headers;
    },
  });
  
  return baseQuery(args, api, extraOptions);
};

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

export interface StreamChannel {
  id: number;
  code: string;
  name: string;
  description?: string;
  image_url?: string;
  max_participants: number;
  allow_recording: boolean;
  required_tiers: string[];
  required_tiers_display: string;
  is_accessible: boolean;
  is_locked: boolean;
  unlock_tier?: string;
  coins_needed_to_unlock: number;
  unlock_message?: string;
}

export interface StreamPrivileges {
  can_create_streams: boolean;
  can_join_streams: boolean;
  all_channels: StreamChannel[];
  accessible_channels: StreamChannel[];
  locked_channels: StreamChannel[];
  max_stream_duration_minutes: number;
  tier_name: string;
  tier_display_name: string;
  current_coins: number;
  current_tier_display: string;
}

export const levelsApi = createApi({
  reducerPath: 'levelsApi',
  baseQuery: dynamicBaseQuery,
  tagTypes: ['UserLevel', 'LevelTiers', 'CoinTransactions', 'StreamPrivileges'],
  endpoints: (builder) => ({
    getUserLevelSummary: builder.query<UserLevelSummary, void>({
      query: () => 'summary/',
      providesTags: ['UserLevel'],
    }),

    getUserLevelStatus: builder.query<UserCoins, void>({
      query: () => 'status/',
      providesTags: ['UserLevel'],
    }),

    getLevelTiers: builder.query<LevelTier[], void>({
      query: () => 'tiers/',
      transformResponse: (response: { results: LevelTier[] }) => response.results,
      providesTags: ['LevelTiers'],
    }),

    getUserStreamPrivileges: builder.query<StreamPrivileges, void>({
      query: () => 'privileges/',
      providesTags: ['StreamPrivileges'],
    }),

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
