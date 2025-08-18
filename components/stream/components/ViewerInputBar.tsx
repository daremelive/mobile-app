import React from 'react';
import { View, KeyboardAvoidingView, Platform, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommentInput } from './CommentInput';
import GiftIcon from '../../../assets/icons/gift.svg';

interface ViewerInputBarProps {
  onSendMessage: (message: string) => void;
  onLike?: () => void;
  onGiftPress?: () => void;
  isLiked?: boolean;
  likeCount?: number;
  hasJoined: boolean;
  keyboardHeight?: number;
  isKeyboardVisible?: boolean;
}

export const ViewerInputBar = ({
  onSendMessage,
  onLike,
  onGiftPress,
  isLiked = false,
  likeCount = 0,
  hasJoined,
  keyboardHeight = 0,
  isKeyboardVisible = false,
}: ViewerInputBarProps) => {
  if (!hasJoined) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10 }}
    >
      <View style={{ position: 'relative', paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 8 : 8, marginBottom: 16 }}>
        <View style={{ paddingRight: 50 }}>
          <CommentInput
            onSendMessage={onSendMessage}
            placeholder="Type comment here..."
          />
        </View>
        
        <View style={{ 
          position: 'absolute', 
          right: 20, 
          top: 0, 
          bottom: 0, 
          width: 40,
          flexDirection: 'column', 
          justifyContent: 'flex-end', 
          alignItems: 'center',
          paddingBottom: 8
        }}>
          {onLike && (
            <TouchableOpacity 
              onPress={onLike}
              className="items-center mb-2"
              disabled={isLiked}
            >
              <View className="w-12 h-12 rounded-full bg-black/70 items-center justify-center">
                <Ionicons 
                  name={isLiked ? "heart" : "heart-outline"} 
                  size={22} 
                  color={isLiked ? "#FF0000" : "#FFFFFF"} 
                />
              </View>
              {likeCount > 0 && (
                <Text className="text-white text-xs font-semibold mt-0.5">
                  {likeCount > 999 ? `${(likeCount / 1000).toFixed(1)}K` : likeCount}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {onGiftPress && (
            <TouchableOpacity 
              onPress={onGiftPress}
              className="items-center"
            >
              <View className="w-12 h-12 rounded-full bg-black/70 items-center justify-center">
                <GiftIcon width={20} height={20} />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};
