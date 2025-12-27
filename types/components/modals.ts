/**
 * Modal component types
 * All modal and overlay interfaces
 */

import { StreamHost } from '../stream';
import { Gift } from '../stream/messages';
import { CoinPackage } from '../api/wallet';

// Base modal props
export interface BaseModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
}

// Gift modal props
export interface GiftModalProps extends BaseModalProps {
  gifts: Gift[];
  onSendGift: (giftId: number, recipientId?: number) => void;
  recipients?: StreamHost[];
  currentBalance: number;
}

// Coin purchase modal props
export interface CoinPurchaseModalProps extends BaseModalProps {
  packages: CoinPackage[];
  onPurchase: (packageId: number) => void;
  currentBalance: number;
}

// Leave confirmation modal props
export interface LeaveConfirmationModalProps extends BaseModalProps {
  onConfirm: () => void;
  isHost?: boolean;
  streamTitle?: string;
}

// Members list modal props
export interface MembersListModalProps extends BaseModalProps {
  participants: StreamHost[];
  onInviteMore?: () => void;
  canManageParticipants?: boolean;
}

// End stream modal props
export interface EndStreamModalProps extends BaseModalProps {
  onConfirm: () => void;
  streamTitle?: string;
  viewerCount?: number;
}