import React, { useState, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// COMPLETELY ISOLATED INPUT COMPONENT - ZERO PARENT DEPENDENCIES
interface IsolatedMessageInputProps {
  onSendMessage: (message: string) => void;
  sending: boolean;
  placeholder?: string;
}

const IsolatedMessageInput = React.memo(({ 
  onSendMessage, 
  sending,
  placeholder = "Type a message..."
}: IsolatedMessageInputProps) => {
  // LOCAL STATE ONLY - Never affects parent
  const [message, setMessage] = useState('');
  
  // MEMOIZED HANDLERS - Prevent re-renders
  const handleTextChange = useCallback((text: string) => {
    setMessage(text);
  }, []);
  
  const handleSend = useCallback(() => {
    if (message.trim() && !sending) {
      onSendMessage(message.trim());
      setMessage(''); // Clear local input
    }
  }, [message, sending, onSendMessage]);
  
  // STATIC COMPUTATIONS - No reactive dependencies
  const isEmpty = !message.trim();
  const isDisabled = isEmpty || sending;
  const buttonColors: [string, string] = isDisabled ? ['#666', '#666'] : ['#8B5CF6', '#EC4899'];
  
  return (
    <View className="flex-row items-center gap-3 p-4 border-t border-gray-700">
      <View className="flex-1 bg-[#2A2A2A] rounded-xl px-4 py-3">
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#666"
          value={message}
          onChangeText={handleTextChange}
          className="text-white text-base"
          autoCapitalize="sentences"
          multiline
          maxLength={500}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          blurOnSubmit={false}
        />
      </View>
      
      <TouchableOpacity
        onPress={handleSend}
        disabled={isDisabled}
        className="w-12 h-12 rounded-xl items-center justify-center"
      >
        <LinearGradient
          colors={buttonColors}
          className="w-full h-full rounded-xl items-center justify-center"
        >
          <Text className="text-white text-lg">
            {sending ? '⏳' : '📤'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
});

IsolatedMessageInput.displayName = 'IsolatedMessageInput';

export default IsolatedMessageInput;
