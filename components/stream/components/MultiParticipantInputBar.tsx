import React from 'react';
import { View, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { CommentInput } from './CommentInput';
import AddTeamIcon from '../../../assets/icons/add-team.svg';
import { MultiParticipantInputBarProps } from './types';

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
      <View className="flex-row items-center gap-3 px-4 pb-6">
        <CommentInput onSendMessage={onSendMessage} />

        <TouchableOpacity
          onPress={onAddParticipant}
          className="rounded-[36px] p-3"
          style={{ backgroundColor: 'rgba(38,38,38,0.5)' }}
          accessibilityRole="button"
          accessibilityLabel="Invite guests"
        >
          <AddTeamIcon width={24} height={24} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};
