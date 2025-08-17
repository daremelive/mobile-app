import React, { useState, useCallback, useRef } from 'react';
import { View, TextInput } from 'react-native';

interface CommentInputProps {
  onSendMessage: (message: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}

export const CommentInput = React.memo(({ 
  onSendMessage, 
  placeholder = "Say something...",
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
    <View className="flex-1 bg-black/60 rounded-full px-4 py-4 mr-3">
      <TextInput
        ref={inputRef}
        placeholder={placeholder}
        placeholderTextColor="#999"
        value={localComment}
        onChangeText={handleChangeText}
        className="text-white text-sm"
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
