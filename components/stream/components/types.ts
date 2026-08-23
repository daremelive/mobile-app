import { StreamMessage } from '../../../src/store/streamsApi';
import Ionicons from '@expo/vector-icons/Ionicons';

// Common data interfaces
export interface CoinPackage {
  id: number;
  name: string;
  coins: number;
  price: number;
  currency: string;
  bonus_coins: number;
  total_coins: number;
  formatted_price: string;
  display_order: number;
  is_active: boolean;
}

export interface Gift {
  id: number;
  name: string;
  icon_url: string;
  cost: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  participant_id?: number; // StreamParticipant ID for removal
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  followers_count?: string;
  profile_picture_url?: string;
  is_online?: boolean;
}

export interface StreamParticipant extends User {
  participant_type: 'host' | 'guest' | 'viewer';
  is_streaming?: boolean;
}

export interface Participant {
  id: string;
  username: string;
  profilePicture?: string;
  isHost?: boolean;
  isMuted?: boolean;
  isCameraOn?: boolean;
  isOnSeat?: boolean;
  seatNumber?: number;
}

export interface Viewer extends User {
  joined_at?: string;
  last_seen?: string | null;
}

export interface ChatMessage {
  id: string;
  username: string; // Keep for backward compatibility, but we'll prioritize full_name
  full_name?: string; // Add full name field
  message: string;
  timestamp: string;
  profilePicture?: string;
  isHost?: boolean;
  userId?: string;
  // Gift-related fields for TikTok-style gift messages
  message_type?: string;
  gift_id?: number;
  gift_name?: string;
  gift_icon?: string;
  gift_cost?: number;
  gift?: any;
}

export interface OptimizedMessage {
  id: number;
  username: string;
  message: string;
  timestamp: string;
  isHost?: boolean;
  profilePicture?: string;
  messageType?: 'text' | 'gift' | 'join' | 'leave';
}

// Component prop interfaces
export interface CoinPurchaseModalProps {
  visible: boolean;
  onClose: () => void;
  coinPackages: CoinPackage[];
  onPurchase: (packageData: CoinPackage) => void;
  walletBalance: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  isPurchasing: boolean;
}

export interface CommentInputProps {
  onSendMessage: (message: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}

export interface EndStreamModalProps {
  visible: boolean;
  onCancel: () => void;
  onEndStream: () => void;
  isLoading?: boolean;
  streamStatus?: 'live' | 'ended' | 'disconnected' | null;
}

export interface GiftModalProps {
  visible: boolean;
  onClose: () => void;
  gifts: Gift[];
  onSendGift: (gift: Gift) => void;
  onBuyCoins: () => void;
  walletBalance: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  baseURL?: string;
}

export interface LeaveConfirmationModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
}

export interface MembersListModalProps {
  visible: boolean;
  onClose: () => void;
  streamId: string;
  participants?: StreamParticipant[];
  viewers?: Viewer[];
  currentUserRole: 'host' | 'guest' | 'viewer';
  onRefresh?: () => void;
  call?: any; // Stream.io call object for granting permissions
}

export type ActionType = 'promote' | 'block' | 'invite' | 'remove';

export interface ActionMenuProps {
  visible: boolean;
  user: User;
  userType: 'participant' | 'viewer' | 'search';
  currentUserRole: 'host' | 'guest' | 'viewer';
  onAction: (action: ActionType, user: User) => void;
  onClose: () => void;
}

export interface MultiParticipantInputBarProps {
  onSendMessage: (message: string) => void;
  onAddParticipant: () => void;
  hasJoined: boolean;
  keyboardHeight?: number;
  isKeyboardVisible?: boolean;
}

export interface OptimizedChatProps {
  messages: OptimizedMessage[];
  onUserInteraction: () => void;
  keyboardHeight: number;
  isKeyboardVisible: boolean;
}

export interface RealtimeStatusIndicatorProps {
  isConnected: boolean;
  lastUpdate: Date | null;
  viewerCount: number;
  onRefresh: () => void;
  className?: string;
}

export interface StreamChatOverlayProps {
  messages?: (ChatMessage | StreamMessage)[];
  isVisible?: boolean;
  keyboardHeight?: number;
  isKeyboardVisible?: boolean;
  inputBarHeight?: number;
  reservedTopGap?: number;
  baseURL?: string;
  hostId?: number | string | null;
}

export interface StreamControlsProps {
  isHost?: boolean;
  isRecording?: boolean;
  isMuted?: boolean;
  isCameraOn?: boolean;
  canToggleCamera?: boolean;
  canToggleMic?: boolean;
  canRecord?: boolean;
  onToggleCamera?: () => void;
  onToggleMic?: () => void;
  onToggleRecording?: () => void;
}

export interface StreamHeaderProps {
  streamTitle?: string;            // e.g. "Marriage Sacrifices"
  hostName?: string;               // Full display name (optional - will be computed from first/last name)
  hostFirstName?: string;          // Host's first name
  hostLastName?: string;           // Host's last name
  hostUsername?: string;           // Username (without @)
  hostProfilePicture?: string;
  viewerCount?: number;
  likesCount?: number;
  giftsCount?: number;          // Gifts received; hidden when not provided
  isFollowing?: boolean;
  disableFollow?: boolean;
  onFollow?: () => void;
  onUnfollow?: () => void;
  onViewProfile?: () => void;
  onViewUsers?: () => void;
  onBack?: () => void;
  onLike?: () => void;
  isLiked?: boolean;
  baseURL?: string;
  onToggleFollow?: () => void;
  onShare?: () => void;
  onClose?: () => void;
  showBackButton?: boolean;
  showCloseButton?: boolean;
}

export interface StreamInputBarProps {
  onSendMessage: (message: string) => void;
  onGiftPress: () => void;
  onBeautifyPress?: () => void;    // Control is rendered only when handled
  onAddParticipant?: () => void;   // Control is rendered only when handled
  hasJoined: boolean;
  keyboardHeight?: number;
  isKeyboardVisible?: boolean;
  showGiftButton?: boolean;
}

export interface ViewerInputBarProps {
  onSendMessage: (message: string) => void;
  onLike?: () => void;
  onGiftPress?: () => void;
  onJoinAsParticipant?: () => void;
  isLiked?: boolean;
  likeCount?: number;
  hasJoined: boolean;
  keyboardHeight?: number;
  isKeyboardVisible?: boolean;
  showGiftButton?: boolean;
  showJoinButton?: boolean;
  disabled?: boolean;
  isMultiStream?: boolean;
  isParticipant?: boolean;
}
