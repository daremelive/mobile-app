import React from 'react';
import { View, TouchableOpacity, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CommentInput } from './CommentInput';
import GiftIcon from '../../../assets/icons/gift.svg';

interface StreamInputBarProps {
  onSendMessage: (message: string) => void;
  onGiftPress: () => void;
  hasJoined: boolean;
  keyboardHeight?: number;
  isKeyboardVisible?: boolean;
  showGiftButton?: boolean;
}

export const StreamInputBar = ({
  onSendMessage,
  onGiftPress,
  hasJoined,
  keyboardHeight = 0,
  isKeyboardVisible = false,
  showGiftButton = true,
}: StreamInputBarProps) => {
  if (!hasJoined) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10 }}
    >
      <View 
        className="left-2 right-4 flex-row items-center mb-4" 
        style={{ 
          paddingHorizontal: 16,
          paddingBottom: Platform.OS === 'ios' ? 8 : 8,
        }}
      >
        <CommentInput
          onSendMessage={onSendMessage}
          placeholder="Say something..."
        />
        
        {showGiftButton && (
          <TouchableOpacity 
            onPress={onGiftPress}
            className="w-12 h-12 rounded-full items-center justify-center mr-3 bg-gray-600"
          >
            <GiftIcon width={24} height={24} />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};
