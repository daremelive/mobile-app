import React from 'react';
import { View, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { CommentInput } from './CommentInput';
import GiftIcon from '../../../assets/icons/gift.svg';
import MagicWandIcon from '../../../assets/icons/magic-wand.svg';
import AddTeamIcon from '../../../assets/icons/add-team.svg';
import { StreamInputBarProps } from './types';

/** Design tokens from the live stream design. */
const CONTROL = 'rgba(38,38,38,0.5)';

/** Circular control sitting beside the comment field. */
const RoundControl = ({
  Icon,
  label,
  onPress,
}: {
  Icon: React.FC<any>;
  label: string;
  onPress?: () => void;
}) => (
  <TouchableOpacity
    className="rounded-[36px] p-3"
    style={{ backgroundColor: CONTROL }}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Icon width={24} height={24} />
  </TouchableOpacity>
);

export const StreamInputBar = ({
  onSendMessage,
  onGiftPress,
  onBeautifyPress,
  onAddParticipant,
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
        className="flex-row items-center gap-3 px-4 pb-6"
      >
        <CommentInput onSendMessage={onSendMessage} />

        {onBeautifyPress && (
          <RoundControl Icon={MagicWandIcon} label="Beautify" onPress={onBeautifyPress} />
        )}

        {showGiftButton && (
          <RoundControl Icon={GiftIcon} label="Send a gift" onPress={onGiftPress} />
        )}

        {onAddParticipant && (
          <RoundControl Icon={AddTeamIcon} label="Invite guests" onPress={onAddParticipant} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
};
