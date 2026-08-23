import { createApi } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../config/env';
import { createAuthenticatedBaseQuery } from './authenticatedBaseQuery';

// Import centralized types
import type {
  CoinPackage,
  WalletSummary,
  WalletAnalytics,
  WalletTransaction,
  CoinExchangeRate,
  PurchaseCoinsRequest,
  WithdrawMoneyRequest,
  CoinPackagesResponse,
  WalletTransactionsResponse,
  PurchaseCoinsResponse,
  WithdrawMoneyResponse,
  AppleReceiptValidationRequest,
  AppleReceiptValidationResponse,
} from '../../types/api/wallet';

// Re-export for backward compatibility
export type {
  CoinPackage,
  WalletSummary,
  WalletAnalytics,
  WalletTransaction,
  CoinExchangeRate,
  PurchaseCoinsRequest,
  WithdrawMoneyRequest,
  PurchaseCoinsResponse,
  WithdrawMoneyResponse,
  AppleReceiptValidationRequest,
  AppleReceiptValidationResponse,
};

// Create base query for wallet endpoints
const baseQuery = createAuthenticatedBaseQuery(`${API_BASE_URL}wallet/`, 30_000);

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
        if (response && response.results) {
          return response.results;
        }
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

    // Withdraw money
    withdrawMoney: builder.mutation<WithdrawMoneyResponse, WithdrawMoneyRequest>({
      query: (body) => ({
        url: 'withdraw/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Wallet', 'Transactions'],
    }),

    // Validate Apple IAP Receipt (for iOS In-App Purchases)
    validateAppleReceipt: builder.mutation<AppleReceiptValidationResponse, AppleReceiptValidationRequest>({
      query: (body) => ({
        url: 'validate-apple-receipt/',
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
  useWithdrawMoneyMutation,
  useValidateAppleReceiptMutation,
} = walletApi;
