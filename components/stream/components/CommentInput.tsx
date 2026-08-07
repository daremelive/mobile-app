import React, { useState, useCallback, useRef } from 'react';
import { View, TextInput } from 'react-native';
import { fonts } from '../../../constants/Fonts';
import { CommentInputProps } from './types';

/** Design tokens from the live stream design. */
const FIELD = 'rgba(38,38,38,0.5)';
const TEXT = '#EDEEF9';

export const CommentInput = React.memo(({
  onSendMessage,
  placeholder = "Type comment here...",
  maxLength = 200,
  disabled = false
}: CommentInputProps) => {
  const [localComment, setLocalComment] = useState('');
  const inputRef = useRef<TextInput | null>(null);

  const handleSend = useCallback(() => {
    if (localComment.trim() && !disabled) {
      onSendMessage(localComment.trim());
      setLocalComment('');
      // Keep keyboard open by re-focusing after state update
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [localComment, onSendMessage, disabled]);

  const handleChangeText = useCallback((text: string) => {
    setLocalComment(text);
  }, []);

  return (
    <View
      className="h-12 flex-1 justify-center rounded-[36px] px-3"
      style={{ backgroundColor: FIELD }}
    >
      <TextInput
        ref={inputRef}
        placeholder={placeholder}
        placeholderTextColor={TEXT}
        value={localComment}
        onChangeText={handleChangeText}
        className="text-sm"
        style={{ color: TEXT, fontFamily: fonts.regular, lineHeight: 22.4 }}
        multiline={false}
        maxLength={maxLength}
        returnKeyType="send"
        onSubmitEditing={handleSend}
        blurOnSubmit={false}
        editable={!disabled}
      />
    </View>
  );
});

CommentInput.displayName = 'CommentInput';
