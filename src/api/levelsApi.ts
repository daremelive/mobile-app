import { createApi } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../config/env';
import { createAuthenticatedBaseQuery } from './authenticatedBaseQuery';

// Import centralized types
import type {
  LevelTier,
  UserLevelSummary,
  UserCoins,
  CoinTransaction,
  StreamChannel,
  StreamPrivileges,
  UnlockLevelRequest,
  LevelTiersResponse,
  CoinTransactionsResponse,
  UnlockLevelResponse,
} from '../../types/api/levels';

// Re-export for backward compatibility
export type {
  LevelTier,
  UserLevelSummary,
  UserCoins,
  CoinTransaction,
  StreamChannel,
  StreamPrivileges,
};

// Create base query for levels endpoints
const baseQuery = createAuthenticatedBaseQuery(`${API_BASE_URL}levels/`);

export const levelsApi = createApi({
  reducerPath: 'levelsApi',
  baseQuery: baseQuery,
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
      transformResponse: (response: LevelTiersResponse) => response.results,
      providesTags: ['LevelTiers'],
    }),

    getUserStreamPrivileges: builder.query<StreamPrivileges, void>({
      query: () => 'privileges/',
      providesTags: ['StreamPrivileges'],
    }),

    unlockLevel: builder.mutation<UnlockLevelResponse, UnlockLevelRequest>({
      query: (data: UnlockLevelRequest) => ({
        url: 'unlock/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['UserLevel', 'LevelTiers', 'StreamPrivileges'],
    }),

    getCoinTransactions: builder.query<CoinTransaction[], void>({
      query: () => 'transactions/',
      transformResponse: (response: CoinTransactionsResponse) => response.results,
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
