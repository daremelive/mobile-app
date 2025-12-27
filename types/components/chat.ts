/**
 * Chat component types
 * Chat UI and messaging components
 */

import { ChatMessage } from '../stream/messages';

// Chat input props
export interface ChatInputProps {
  onSendMessage: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}

// Chat overlay props
export interface ChatOverlayProps {
  messages: ChatMessage[];
  isVisible: boolean;
  maxMessages?: number;
  onMessagePress?: (message: ChatMessage) => void;
}

// Message item props
export interface MessageItemProps {
  message: ChatMessage;
  onPress?: () => void;
  showAvatar?: boolean;
  showTimestamp?: boolean;
}

// Chat bubble props
export interface ChatBubbleProps {
  message: string;
  isOwnMessage: boolean;
  timestamp: string;
  senderName?: string;
}