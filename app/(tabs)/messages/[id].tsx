import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, SafeAreaView, TextInput, ScrollView, TouchableOpacity, Image, Modal, Pressable, Alert, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CheckDoubleIcon } from '../../../components/icons/CheckDoubleIcon';
import { MoreVerticalIcon } from '../../../components/icons/MoreVerticalIcon';
import { SendIcon } from '../../../components/icons/SendIcon';
// import { NotificationOffIcon } from '../../../components/icons/NotificationOffIcon';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { NotificationOff03Icon, PinIcon, Delete02Icon, ArrowLeft02Icon, MoreHorizontalIcon } from '@hugeicons/core-free-icons';
import { useConversationMessages } from '../../../src/hooks/useConversationMessages';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../../src/store/authSlice';

export default function MessageDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const conversationId = params.id as string;
  const currentUser = useSelector(selectCurrentUser);
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);
  
  const { messages, loading, error, conversation, fetchMessages, fetchConversation, sendMessage } = useConversationMessages(conversationId);

  // Memoize the handleInputChange to prevent navigation context issues
  const handleInputChange = useCallback((text: string) => {
    try {
      console.log('📝 Input changed:', text.length, 'characters');
      setInput(text);
    } catch (error) {
      console.error('Input change error:', error);
    }
  }, []);

  // Get other participant from conversation
  const getOtherParticipant = useCallback(() => {
    if (!conversation || !currentUser) return null;
    
    // Handle both the list view format (participant_1, participant_2) and detail view format (other_participant)
    if (conversation.other_participant) {
      return conversation.other_participant;
    }
    
    return conversation.participant_1?.id === currentUser.id 
      ? conversation.participant_2 
      : conversation.participant_1;
  }, [conversation, currentUser]);

  // Get other participant info
  const otherParticipant = getOtherParticipant();
  
  // Default fallback data for UI
  const defaultAvatar = 'https://randomuser.me/api/portraits/women/44.jpg';

  // Debug: Check if router is available and track conversation changes
  React.useEffect(() => {
    console.log('🔍 Router available:', !!router);
    console.log('🔍 Conversation ID:', conversationId);
    console.log('🔍 Conversation object:', conversation);
    console.log('🔍 Messages count:', messages.length);
    console.log('🔍 Loading state:', loading);
    console.log('🔍 Error state:', error);
  }, [router, conversationId, conversation, messages.length, loading, error]);

  // Keyboard event listeners
  useEffect(() => {
    try {
      const keyboardWillShowListener = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
        (event) => {
          try {
            setKeyboardHeight(event.endCoordinates.height);
            // Scroll to bottom when keyboard appears
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          } catch (error) {
            console.error('Keyboard show error:', error);
          }
        }
      );

      const keyboardWillHideListener = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
        () => {
          try {
            setKeyboardHeight(0);
          } catch (error) {
            console.error('Keyboard hide error:', error);
          }
        }
      );

      return () => {
        try {
          keyboardWillShowListener.remove();
          keyboardWillHideListener.remove();
        } catch (error) {
          console.error('Keyboard cleanup error:', error);
        }
      };
    } catch (error) {
      console.error('Keyboard setup error:', error);
    }
  }, []);
  
  // Fetch conversation and messages when the screen loads
  React.useEffect(() => {
    if (conversationId && conversationId !== '0') {
      console.log('🔄 Initial fetch for conversation:', conversationId);
      fetchConversation();
      // Note: fetchMessages might not be needed if conversation includes messages
      // but we'll call it for now to ensure we have the latest data
      fetchMessages();
    }
  }, [conversationId]); // Remove fetchConversation and fetchMessages from dependencies

  // Set up periodic refresh for messages and conversation
  React.useEffect(() => {
    if (conversationId === '0') {
      // Don't set up refresh for new conversations
      return;
    }
    
    console.log('⏰ Setting up periodic refresh for conversation:', conversationId);
    
    let messageCount = 0;
    const interval = setInterval(() => {
      if (conversationId && conversationId !== '0') {
        console.log('🔄 Periodic refresh - fetching messages');
        fetchMessages();
        messageCount++;
        // Refresh conversation data every 5th message refresh (every 25 seconds)
        if (messageCount % 5 === 0) {
          console.log('🔄 Periodic refresh - fetching conversation');
          fetchConversation();
        }
      }
    }, 5000); // Refresh every 5 seconds

    return () => {
      console.log('🔄 Cleaning up periodic refresh interval');
      clearInterval(interval);
    };
  }, [conversationId]); // Remove fetchConversation and fetchMessages from dependencies

  const handleBackPress = () => {
    try {
      console.log('🔙 Attempting navigation back...');
      console.log('🔙 Current sending state:', sending);
      
      // Prevent navigation if currently sending a message
      if (sending) {
        console.log('🔙 Navigation blocked - currently sending message');
        return;
      }
      
      if (router && typeof router.canGoBack === 'function' && router.canGoBack()) {
        router.back();
      } else if (router && typeof router.push === 'function') {
        router.push('/(tabs)/messages');
      } else {
        console.warn('Router not available, using fallback');
        // Fallback - try to use navigation directly
        throw new Error('Router unavailable');
      }
    } catch (error) {
      console.error('Navigation error:', error);
      // Ultimate fallback navigation
      try {
        if (router && typeof router.replace === 'function') {
          router.replace('/(tabs)/messages');
        }
      } catch (fallbackError) {
        console.error('Fallback navigation failed:', fallbackError);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    
    // Dismiss keyboard first
    try {
      Keyboard.dismiss();
    } catch (error) {
      console.error('Keyboard dismiss error:', error);
    }
    
    setSending(true);
    try {
      console.log('🚀 Sending message:', input.trim());
      console.log('🔍 Current conversationId before send:', conversationId);
      console.log('🔍 Current conversation before send:', conversation?.id);
      
      await sendMessage(input.trim());
      setInput('');
      console.log('✅ Message sent successfully');
      console.log('🔍 Current conversationId after send:', conversationId);
      console.log('🔍 Current conversation after send:', conversation?.id);
      
      // Scroll to bottom after sending
      setTimeout(() => {
        try {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        } catch (error) {
          console.error('Post-send scroll error:', error);
        }
      }, 100);
    } catch (error: any) {
      console.error('❌ Failed to send message:', error);
      console.log('🔍 Error occurred, conversationId:', conversationId);
      const errorMessage = error?.message || 'Unknown error occurred';
      Alert.alert(
        'Message Failed', 
        `Failed to send message: ${errorMessage}. Please check your connection and try again.`,
        [
          { text: 'OK', style: 'default' }
        ]
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 mb-[6rem]"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <SafeAreaView className="flex-1 bg-[#0A0A0A]">
        <StatusBar style="light" />
      
      {/* Enhanced Header */}
      <View className="flex-row items-center px-4 pt-2 pb-4 bg-[#111111] border-b border-[#1F1F1F] shadow-lg">
        <TouchableOpacity onPress={handleBackPress} className="mr-3">
          <View className="w-10 h-10 bg-[#1F1F1F] rounded-full justify-center items-center">
            <HugeiconsIcon size={18} color="#ffffff" strokeWidth={2} icon={ArrowLeft02Icon} />
          </View>
        </TouchableOpacity>
        
        <Image 
          source={{ 
            uri: otherParticipant?.profile_picture_url || 
                 otherParticipant?.profile_picture || 
                 defaultAvatar 
          }} 
          className="w-11 h-11 rounded-full border-2 border-[#C42720]/20 mr-3" 
        />
        <View className="flex-1">
          <Text className="text-white text-lg font-semibold">
            {loading && !otherParticipant ? 'Loading...' : 
             otherParticipant?.first_name && otherParticipant?.last_name 
              ? `${otherParticipant.first_name} ${otherParticipant.last_name}`.trim()
              : otherParticipant?.username || 'Unknown User'
            }
          </Text>
          <View className="flex-row items-center">
            <View className={`w-2 h-2 rounded-full mr-2 ${
              otherParticipant?.is_online ? 'bg-green-500' : 'bg-gray-500'
            }`} />
            <Text className={`text-sm ${
              otherParticipant?.is_online ? 'text-green-400' : 'text-gray-400'
            }`}>
              {loading && !otherParticipant ? 'Loading...' : 
               otherParticipant?.is_online ? 'Online' : 
               otherParticipant?.last_seen ? `Last seen ${new Date(otherParticipant.last_seen).toLocaleDateString()}` : 
               'Offline'}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity onPress={() => setMenuVisible(true)}>
          <View className="w-10 h-10 bg-[#1F1F1F] rounded-full justify-center items-center">
            <HugeiconsIcon size={18} color="#ffffff" strokeWidth={2} icon={MoreHorizontalIcon} />
          </View>
        </TouchableOpacity>
        {/* Popup Menu */}
        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <Pressable className="flex-1" onPress={() => setMenuVisible(false)}>
            <View className="absolute right-4 top-[105px] w-44 bg-[#232325] rounded-xl shadow-lg p-2">
              <TouchableOpacity className="flex-row items-center px-3 py-2" onPress={() => {}}>
              <HugeiconsIcon
                icon={NotificationOff03Icon}
                size={20}
                color="#ffffff"
                strokeWidth={1.5}
              />
                <Text className="ml-3 text-white text-base">Mute</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-row items-center px-3 py-2" onPress={() => {}}>
              <HugeiconsIcon size={20} color="#ffffff" strokeWidth={1.5} icon={PinIcon} />
                <Text className="ml-3 text-white text-base">Pin Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-row items-center px-3 py-2 rounded-lg" onPress={() => {}}>
              <HugeiconsIcon size={20} color="#C42720" strokeWidth={1.5} icon={Delete02Icon} />
                <Text className="ml-3 text-[#C42720] text-base">Delete Chat</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      </View>

      {/* Enhanced Conversation Area */}
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={() => {
          try {
            Keyboard.dismiss();
          } catch (error) {
            console.error('Keyboard dismiss error:', error);
          }
        }}
        className="flex-1"
      >
        <ScrollView 
          ref={scrollViewRef}
          className="flex-1 px-4 py-2 bg-[#0A0A0A]"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ 
            paddingBottom: 20,
            flexGrow: 1 
          }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            try {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            } catch (error) {
              console.error('Content size change scroll error:', error);
            }
          }}
          onLayout={() => {
            try {
              scrollViewRef.current?.scrollToEnd({ animated: false });
            } catch (error) {
              console.error('Layout scroll error:', error);
            }
          }}
        >
        {loading && messages.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <View className="bg-[#1F1F1F] rounded-full p-4 mb-4">
              <Text className="text-2xl">💬</Text>
            </View>
            <Text className="text-[#888888] text-base">Loading messages...</Text>
          </View>
        ) : error ? (
          <View className="flex-1 justify-center items-center py-20">
            <View className="bg-red-500/10 rounded-full p-4 mb-4">
              <Text className="text-2xl">⚠️</Text>
            </View>
            <Text className="text-red-400 text-base mb-4">Failed to load messages</Text>
            <TouchableOpacity 
              onPress={fetchMessages}
              className="bg-[#C42720] px-6 py-3 rounded-full shadow-lg"
            >
              <Text className="text-white font-medium">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : messages.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <View className="bg-[#1F1F1F] rounded-full p-4 mb-4">
              <Text className="text-3xl">💭</Text>
            </View>
            <Text className="text-[#888888] text-base mb-2">No messages yet</Text>
            <Text className="text-[#666666] text-sm">Start the conversation!</Text>
          </View>
        ) : (
          <View className="py-2">
            {messages.map((msg, index) => (
              <View key={msg.id} className={`mb-4 flex-row ${msg.is_outgoing ? 'justify-end' : 'justify-start'}`}>
                {!msg.is_outgoing && (
                  <Image 
                    source={{ 
                      uri: msg.sender.profile_picture_url || 
                           otherParticipant?.profile_picture_url || 
                           otherParticipant?.profile_picture || 
                           defaultAvatar 
                    }} 
                    className="w-8 h-8 rounded-full mr-3 self-end border border-[#333333]" 
                  />
                )}
                <View className="max-w-[75%]">
                  <View className={`px-4 py-3 rounded-2xl shadow-md ${
                    msg.is_outgoing 
                      ? 'bg-[#C42720] rounded-br-md' 
                      : 'bg-[#1F1F1F] border border-[#333333] rounded-bl-md'
                  }`}>
                    <Text className={`text-[15px] leading-5 ${msg.is_outgoing ? 'text-white' : 'text-gray-100'}`}>
                      {msg.content}
                    </Text>
                  </View>
                  <View className={`flex-row items-center mt-1 ${msg.is_outgoing ? 'justify-end' : 'justify-start'}`}>
                    <Text className="text-[#666666] text-xs">
                      {new Date(msg.created_at).toLocaleTimeString('en-US', { 
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </Text>
                    {msg.is_outgoing && (
                      <View className="ml-2 flex-row items-center">
                        <CheckDoubleIcon size={14} color={msg.is_read ? "#C42720" : "#666666"} />
                      </View>
                    )}
                  </View>
                </View>
                {msg.is_outgoing && (
                  <View className="w-8 ml-3" />
                )}
              </View>
            ))}
          </View>
        )}
        </ScrollView>
      </TouchableOpacity>

      {/* Enhanced Input Bar */}
      <View 
        className="px-4 pt-3 bg-[#111111] border-t border-[#1F1F1F]"
        style={{ 
          paddingBottom: Platform.OS === 'ios' ? 34 : 16 // Keep platform-specific padding as inline
        }}
      >
        <View className="flex-row items-end bg-[#1F1F1F] rounded-2xl px-4 py-3 shadow-lg border border-[#333333]">
          <TextInput
            ref={textInputRef}
            className="flex-1 text-white text-[16px] max-h-24"
            style={{ 
              minHeight: 40,
              textAlignVertical: 'center',
              paddingVertical: 8
            }}
            placeholder="Type a message..."
            placeholderTextColor="#666666"
            value={input}
            onChangeText={handleInputChange}
            multiline
            onFocus={() => {
              console.log('🎯 Input focused');
              // Scroll to bottom when input is focused
              try {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 300);
              } catch (error) {
                console.error('Scroll error:', error);
              }
            }}
            blurOnSubmit={false}
            onSubmitEditing={() => {
              try {
                if (!sending && input.trim()) {
                  handleSend();
                }
              } catch (error) {
                console.error('Submit error:', error);
              }
            }}
            returnKeyType="send"
            enablesReturnKeyAutomatically={true}
          />
          <TouchableOpacity 
            className={`ml-3 w-10 h-10 rounded-full justify-center items-center ${
              sending || !input.trim() 
                ? 'bg-[#333333]' 
                : 'bg-[#C42720]'
            }`}
            style={{
              shadowColor: '#C42720',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
            }}
            onPress={handleSend}
            disabled={sending || !input.trim()}
          >
            {sending ? (
              <View className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <SendIcon size={18} color={!input.trim() ? '#666666' : '#fff'} />
            )}
          </TouchableOpacity>
        </View>
      </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
} 