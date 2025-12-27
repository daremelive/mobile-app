import { createApi, fetchBaseQuery, BaseQueryFn } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config/env';

// Import centralized types
import type {
  CoinPackage,
  WalletSummary,
  WalletAnalytics,
  WalletTransaction,
  CoinExchangeRate,
  PurchaseCoinsRequest,
  AddTestCoinsRequest,
  AddTestBalanceRequest,
  WithdrawMoneyRequest,
  CoinPackagesResponse,
  WalletTransactionsResponse,
  PurchaseCoinsResponse,
  WithdrawMoneyResponse,
  TestResponse,
} from '../../types/api/wallet';

// Re-export for backward compatibility
export type {
  CoinPackage,
  WalletSummary,
  WalletAnalytics,
  WalletTransaction,
  CoinExchangeRate,
  PurchaseCoinsRequest,
  AddTestCoinsRequest,
  AddTestBalanceRequest,
  WithdrawMoneyRequest,
  PurchaseCoinsResponse,
  WithdrawMoneyResponse,
  TestResponse,
};

// Create base query for wallet endpoints
const baseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE_URL}wallet/`,
  timeout: 30000, // 30 second timeout
  prepareHeaders: async (headers) => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
    } catch (error) {
      console.error('❌ [WalletAPI] Error getting auth token:', error);
    }
    return headers;
  },
});

export const walletApi = createApi({
  reducerPath: 'walletApi',
  baseQuery: baseQuery,
  tagTypes: ['Wallet', 'CoinPackages', 'Transactions', 'ExchangeRate'],
  endpoints: (builder) => ({
    // Get user wallet summary
    getWalletSummary: builder.query<WalletSummary, void>({
      query: () => 'summary/',
      providesTags: ['Wallet'],
    }),

    // Get coin packages
    getCoinPackages: builder.query<CoinPackage[], void>({
      query: () => 'packages/',
      transformResponse: (response: CoinPackagesResponse) => response.results,
      providesTags: ['CoinPackages'],
    }),

    // Get coin exchange rate
    getCoinExchangeRate: builder.query<CoinExchangeRate, void>({
      query: () => 'exchange-rate/',
      providesTags: ['ExchangeRate'],
      // Shorter cache time for exchange rates since they might change
      keepUnusedDataFor: 30, // 30 seconds instead of default 60
    }),

    // Get wallet analytics
    getWalletAnalytics: builder.query<WalletAnalytics, void>({
      query: () => 'analytics/',
      providesTags: ['Wallet'],
    }),

    // Get wallet transactions
    getWalletTransactions: builder.query<WalletTransaction[], void>({
      query: () => 'transactions/',
      transformResponse: (response: any) => {
        console.log('🔄 Transactions raw response:', response);
        if (response && response.results) {
          console.log('✅ Extracted results:', response.results.length, 'transactions');
          return response.results;
        }
        console.log('⚠️ No results found in response');
        return [];
      },
      providesTags: ['Transactions'],
    }),

    // Purchase coins
    purchaseCoins: builder.mutation<PurchaseCoinsResponse, PurchaseCoinsRequest>({
      query: (body) => ({
        url: 'purchase/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Wallet', 'Transactions'],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Invalidate levels-related cache since tier might have changed
          dispatch({ type: 'levelsApi/util/invalidateTags', payload: ['UserLevel', 'StreamPrivileges'] });
        } catch (error) {
          // Handle error if needed
        }
      },
    }),

    // Add test coins (for development)
    addTestCoins: builder.mutation<TestResponse, AddTestCoinsRequest>({
      query: (body) => ({
        url: 'test-coins/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Wallet', 'Transactions'],
    }),

    // Add test balance (for development)
    addTestBalance: builder.mutation<TestResponse, AddTestBalanceRequest>({
      query: (body) => ({
        url: 'test-balance/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Wallet', 'Transactions'],
    }),

    // Withdraw money
    withdrawMoney: builder.mutation<WithdrawMoneyResponse, WithdrawMoneyRequest>({
      query: (body) => ({
        url: 'withdraw/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Wallet', 'Transactions'],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useGetWalletSummaryQuery,
  useGetCoinPackagesQuery,
  useGetCoinExchangeRateQuery,
  useGetWalletAnalyticsQuery,
  useGetWalletTransactionsQuery,
  usePurchaseCoinsMutation,
  useAddTestCoinsMutation,
  useAddTestBalanceMutation,
  useWithdrawMoneyMutation,
} = walletApi;
