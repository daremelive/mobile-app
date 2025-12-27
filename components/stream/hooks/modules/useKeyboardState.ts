/**
 * Keyboard state hook
 * Manages keyboard visibility and height for mobile input handling
 */

import { useState, useEffect } from 'react';
import { Keyboard, Platform } from 'react-native';
import { KeyboardState } from '../../../../types/stream/state';
import { UseKeyboardStateReturn } from '../types';

export const useKeyboardState = (): UseKeyboardStateReturn => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setIsKeyboardVisible(true);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  return {
    height: keyboardHeight,
    isVisible: isKeyboardVisible,
    keyboardHeight,
    isKeyboardVisible
  };
};