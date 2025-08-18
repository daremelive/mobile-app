import React, { memo, useCallback } from 'react';
import { View, Text, FlatList, ListRenderItem } from 'react-native';

interface OptimizedMessage {
  id: number;
  username: string;
  message: string;
  timestamp: string;
  isHost?: boolean;
  profilePicture?: string;
  messageType?: 'text' | 'gift' | 'join' | 'leave';
}

interface OptimizedChatProps {
  messages: OptimizedMessage[];
  onUserInteraction: () => void;
  keyboardHeight: number;
  isKeyboardVisible: boolean;
}

// Memoized message item to prevent unnecessary re-renders
const MessageItem = memo<{ item: OptimizedMessage }>(({ item }) => {
  const getMessageStyle = () => {
    switch (item.messageType) {
      case 'gift':
        return 'bg-purple-500/20 border border-purple-500/30';
      case 'join':
        return 'bg-green-500/20 border border-green-500/30';
      case 'leave':
        return 'bg-red-500/20 border border-red-500/30';
      default:
        return 'bg-black/30';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <View className={`mb-2 p-3 rounded-lg mx-4 ${getMessageStyle()}`}>
      <View className="flex-row items-start">
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <Text className={`font-semibold text-sm ${
              item.isHost ? 'text-yellow-400' : 'text-white'
            }`}>
              {item.username}
            </Text>
            {item.isHost && (
              <View className="ml-2 bg-yellow-500 px-2 py-0.5 rounded-full">
                <Text className="text-black text-xs font-bold">HOST</Text>
              </View>
            )}
            <Text className="text-white/50 text-xs ml-auto">
              {formatTime(item.timestamp)}
            </Text>
          </View>
          
          <Text className="text-white text-sm leading-5">
            {item.message}
          </Text>
        </View>
      </View>
    </View>
  );
});

MessageItem.displayName = 'MessageItem';

export const OptimizedChat: React.FC<OptimizedChatProps> = memo(({
  messages,
  onUserInteraction,
  keyboardHeight,
  isKeyboardVisible
}) => {
  const renderMessage: ListRenderItem<OptimizedMessage> = useCallback(
    ({ item }) => <MessageItem item={item} />,
    []
  );

  const keyExtractor = useCallback(
    (item: OptimizedMessage) => item.id.toString(),
    []
  );

  const getItemLayout = useCallback(
    (data: ArrayLike<OptimizedMessage> | null | undefined, index: number) => ({
      length: 80, // Estimated item height
      offset: 80 * index,
      index,
    }),
    []
  );

  return (
    <View 
      className="absolute top-20 left-0 right-0"
      style={{
        bottom: isKeyboardVisible ? keyboardHeight + 80 : 80,
      }}
    >
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={15}
        onScrollBeginDrag={onUserInteraction}
        onMomentumScrollBegin={onUserInteraction}
        inverted
        contentContainerStyle={{
          paddingTop: 20,
          paddingBottom: 20,
        }}
      />
      
      {/* Gradient fade at top */}
      <View 
        className="absolute top-0 left-0 right-0 h-10 pointer-events-none"
        style={{
          backgroundColor: 'transparent'
        }}
      />
    </View>
  );
});

OptimizedChat.displayName = 'OptimizedChat';
