// Modal Component Types

export interface BankDetailsAddedModalProps {
  visible: boolean;
  onClose: () => void;
}

export interface ChangePasswordConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export interface ChannelAccessModalProps {
  visible: boolean;
  onClose: () => void;
  channelName: string;
  channelCode: string;
  requiredTier: string;
  coinsNeeded: number;
  currentCoins: number;
  unlockMessage: string;
}

export interface DeactivateAccountConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export interface HelpUsImproveModalProps {
  visible: boolean;
  onClose: () => void;
  onContinue: (feedback?: string) => void;
  isLoading?: boolean;
}

export interface LogoutConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  hasActiveStreams?: boolean;
}

export interface PasswordUpdateSuccessModalProps {
  visible: boolean;
  onDone: () => void;
}

export interface PurchaseSuccessModalProps {
  visible: boolean;
  onClose: () => void;
}

export interface ShareProfileModalProps {
  visible: boolean;
  onClose: () => void;
  userProfile: {
    id: number;
    username: string;
    full_name?: string;
    profile_picture_url?: string;
  };
}

export interface StreamModeSelectionModalProps {
  visible: boolean;
  onClose: () => void;
}

export type TierLevel = 'basic' | 'premium' | 'vip' | 'vvip';

export interface TierAccessModalProps {
  visible: boolean;
  onClose: () => void;
  userTier: TierLevel;
  requiredTier: TierLevel;
  hostName: string;
  streamTitle: string;
}

export interface UnlockVVIPModalProps {
  visible: boolean;
  onClose: () => void;
  onUnlock: () => void;
}

export interface VerificationInProgressModalProps {
  visible: boolean;
  onClose: () => void;
}

// Base modal props that other modals can extend
export interface BaseModalProps {
  visible: boolean;
  onClose: () => void;
}