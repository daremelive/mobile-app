/**
 * Levels API types
 * User levels, tiers, coins, and stream privileges
 */

// === Level Tier ===
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

// === User Level Summary ===
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

// === User Coins ===
export interface UserCoins {
  current_coins: number;
  total_earned: number;
  total_spent: number;
  current_tier: LevelTier;
  next_tier: LevelTier | null;
  progress_to_next: number;
}

// === Coin Transactions ===
export interface CoinTransaction {
  id: number;
  amount: number;
  transaction_type: string;
  reason: string;
  created_at: string;
}

// === Stream Channel ===
export interface StreamChannel {
  id: number;
  code: string;
  name: string;
  description?: string;
  image_url?: string;
  max_participants: number;
  allow_recording: boolean;
  allow_screen_share?: boolean;
  required_tiers: string[];
  required_tiers_display: string;
  is_accessible: boolean;
  is_locked: boolean;
  unlock_tier?: string;
  coins_needed_to_unlock: number;
  unlock_message?: string;
}

// === Stream Privileges ===
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

// === Request Types ===
export interface UnlockLevelRequest {
  tier_id: number;
}

// === Response Types ===
export interface LevelTiersResponse {
  results: LevelTier[];
}

export interface CoinTransactionsResponse {
  results: CoinTransaction[];
}

export interface UnlockLevelResponse {
  message: string;
  tier: LevelTier;
}