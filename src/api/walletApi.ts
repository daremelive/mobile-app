import { createApi, fetchBaseQuery, BaseQueryFn } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';
import IPDetector from '../utils/ipDetector';

// Dynamic base query that handles IP detection
const dynamicBaseQuery: BaseQueryFn = async (args, api, extraOptions) => {
  let baseUrl = 'http://172.20.10.2:8000/api/wallet/'; // Updated fallback IP
  
  if (__DEV__) {
    try {
      const detectedUrl = await IPDetector.getAPIBaseURL();
      baseUrl = `${detectedUrl}wallet/`;
      console.log('🔗 [WalletAPI] Using detected URL:', baseUrl);
    } catch (error) {
      console.error('❌ [WalletAPI] IP detection failed, using fallback:', error);
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
        console.error('❌ [WalletAPI] Error getting auth token:', error);
      }
      return headers;
    },
  });
  
  return baseQuery(args, api, extraOptions);
};

// Types
export interface CoinPackage {
  id: number;
  coins: number;
  bonus_coins: number;
  total_coins: number;
  price: string;
  currency: string;
  formatted_price: string;
  is_popular: boolean;
  is_active: boolean;
}

export interface WalletSummary {
  coins: number;
  balance: string;
  formatted_balance: string;
  coins_equivalent_text: string;
  total_earned: string;
  formatted_total_earned: string;
  this_year_earnings: string;
  formatted_this_year_earnings: string;
  analytics: {
    total_rewards: {
      amount: string;
      formatted: string;
    };
    this_year_rewards: {
      amount: string;
      formatted: string;
    };
  };
}

export interface WalletAnalytics {
  monthly_earnings: Array<{
    month: string;
    amount: number;
    formatted_amount: string;
  }>;
  total_months: number;
  average_monthly: number;
  formatted_average_monthly: string;
  peak_month: {
    month: string;
    amount: number;
    formatted_amount: string;
  };
}

export interface WalletTransaction {
  id: number;
  transaction_type: 'COIN_PURCHASE' | 'GIFT_SENT' | 'GIFT_RECEIVED' | 'EARNING' | 'WITHDRAWAL' | 'REFUND' | 'BONUS';
  amount: string;
  formatted_amount: string;
  coins: number;
  reason: string;
  reference: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  created_at: string;
  formatted_date: string;
  formatted_time: string;
  display_type: string;
  is_outgoing: boolean;
}

export interface CoinExchangeRate {
  id: number;
  diamond_coins: number;
  naira_amount: string;
  is_active: boolean;
  rate_per_coin: number;
  formatted_rate: string;
  created_at: string;
}

export interface PurchaseCoinsRequest {
  package_id: number;
  payment_method: 'paystack' | 'flutterwave';
}

export interface PurchaseCoinsResponse {
  success: boolean;
  message: string;
  transaction_id: number;
  coins_added: number;
  new_balance: number;
  reference: string;
}

export interface AddTestCoinsRequest {
  coins: number;
}

export interface AddTestBalanceRequest {
  amount?: number;
  reason?: string;
}

export interface WithdrawMoneyRequest {
  amount: number;
}

export interface WithdrawMoneyResponse {
  status: 'success' | 'error';
  message: string;
  withdrawal_amount?: string;
  formatted_withdrawal?: string;
  coins_deducted?: number;
  transaction_reference?: string;
  new_balance?: string;
  formatted_new_balance?: string;
  new_coins?: number;
  current_balance?: string;
  formatted_balance?: string;
}

export interface TestResponse {
  success: boolean;
  message: string;
  coins_added?: number;
  balance_added?: string;
  new_coins?: number;
  new_balance?: string;
  reference?: string;
}

export const walletApi = createApi({
  reducerPath: 'walletApi',
  baseQuery: dynamicBaseQuery,
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
      transformResponse: (response: { results: CoinPackage[] }) => response.results,
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
