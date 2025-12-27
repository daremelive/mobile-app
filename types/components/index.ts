/**
 * Component prop types and UI interfaces
 * Reusable component interfaces
 */

import { ReactNode } from 'react';

// Base component props
export interface BaseComponentProps {
  children?: ReactNode;
  className?: string;
  style?: any;
}

// Button props
export interface ButtonProps extends BaseComponentProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
}

// Input props
export interface InputProps extends BaseComponentProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  editable?: boolean;
}

// Modal props
export interface ModalProps extends BaseComponentProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  animationType?: 'none' | 'slide' | 'fade';
}