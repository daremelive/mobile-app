import React from 'react';
import { View, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { CommentInput } from './CommentInput';
import AddTeamIcon from '../../../assets/icons/add-team.svg';

interface MultiParticipantInputBarProps {
  onSendMessage: (message: string) => void;
  onAddParticipant: () => void;
  hasJoined: boolean;
  keyboardHeight?: number;
  isKeyboardVisible?: boolean;
}

export const MultiParticipantInputBar = ({
  onSendMessage,
  onAddParticipant,
  hasJoined,
  keyboardHeight = 0,
  isKeyboardVisible = false,
}: MultiParticipantInputBarProps) => {
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
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <CommentInput
            onSendMessage={onSendMessage}
            placeholder="Type comment here..."
          />
        </View>
        
        <TouchableOpacity 
          onPress={onAddParticipant}
          className="w-12 h-12 rounded-full bg-black/40 items-center justify-center"
        >
          <AddTeamIcon width={24} height={24} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};
