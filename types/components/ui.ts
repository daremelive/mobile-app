/**
 * UI component specific types
 * Layout, navigation, and display components
 */

// Navigation props
export interface NavigationProps {
  canGoBack?: boolean;
  onGoBack?: () => void;
  title?: string;
  rightAction?: {
    label: string;
    onPress: () => void;
  };
}

// Loading indicator props
export interface LoadingIndicatorProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
}

// Avatar props
export interface AvatarProps {
  uri?: string | null;
  size?: number;
  name?: string;
  fallbackIcon?: string;
}

// Status indicator props
export interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'away' | 'busy';
  size?: number;
}