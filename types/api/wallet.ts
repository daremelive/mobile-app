/**
 * Wallet API types
 * User wallet, coins, transactions, and purchases
 */

// === Coin Package ===
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

// === Wallet Summary ===
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

// === Wallet Analytics ===
export interface WalletAnalytics {
  total_balance: number;
  total_coins: number;
  total_earned: number;
  total_withdrawn: number;
  this_month_earned: number;
  monthly_data: Array<{
    month: string;
    year: number;
    earnings: number;
  }>;
  recent_transactions: WalletTransaction[];
}

// === Wallet Transaction ===
export type TransactionType = 
  | 'COIN_PURCHASE' 
  | 'GIFT_SENT' 
  | 'GIFT_RECEIVED' 
  | 'EARNING' 
  | 'WITHDRAWAL' 
  | 'REFUND' 
  | 'BONUS';

export type TransactionStatus = 
  | 'PENDING' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'CANCELLED';

export interface WalletTransaction {
  id: number;
  transaction_type: TransactionType;
  amount: string;
  formatted_amount: string;
  coins: number;
  reason: string;
  reference: string;
  status: TransactionStatus;
  created_at: string;
  formatted_date: string;
  formatted_time: string;
  display_type: string;
  is_outgoing: boolean;
}

// === Coin Exchange Rate ===
export interface CoinExchangeRate {
  id: number;
  diamond_coins: number;
  naira_amount: string;
  is_active: boolean;
  rate_per_coin: number;
  formatted_rate: string;
  created_at: string;
}

// === Request Types ===
export interface PurchaseCoinsRequest {
  package_id: number;
  payment_method: 'paystack' | 'flutterwave';
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

// === Response Types ===
export interface CoinPackagesResponse {
  results: CoinPackage[];
}

export interface WalletTransactionsResponse {
  results: WalletTransaction[];
}

export interface PurchaseCoinsResponse {
  success: boolean;
  message: string;
  transaction_id: number;
  coins_added: number;
  new_balance: number;
  reference: string;
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

// === Apple In-App Purchase Types ===
export interface AppleReceiptValidationRequest {
  receipt_data: string;
  product_id: string;
  transaction_id: string;
}

export interface AppleReceiptValidationResponse {
  success: boolean;
  message: string;
  coins_added?: number;
  new_balance?: number;
  transaction_id?: string;
}

// === Legacy/Backward Compatibility ===
// These are kept for backward compatibility with existing code
export interface CoinTransaction {
  id: number;
  amount: number; // Legacy numeric amount
  transaction_type: string; // Legacy string type
  reason: string;
  created_at: string;
}