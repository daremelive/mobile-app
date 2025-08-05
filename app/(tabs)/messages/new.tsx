import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, SafeAreaView, TextInput, ScrollView, TouchableOpacity, Image, Modal, Pressable, Alert, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CheckDoubleIcon } from '../../../components/icons/CheckDoubleIcon';
import { SendIcon } from '../../../components/icons/SendIcon';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../../src/store/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ipDetector from '../../../src/utils/ipDetector';

export default function NewMessageScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const recipientId = params.recipientId as string;
  const currentUser = useSelector(selectCurrentUser);
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [recipient, setRecipient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);

  // Default fallback data for UI
  const defaultAvatar = 'https://randomuser.me/api/portraits/women/44.jpg';

  const getBaseUrl = async () => {
    const url = await ipDetector.getAPIBaseURL();
    console.log('🔗 Using API Base URL:', url);
    return url;
  };

  // Fetch recipient user data
  const fetchRecipient = useCallback(async () => {
    if (!recipientId) return;
    
    try {
      const token = await AsyncStorage.getItem('access_token');
      const baseUrl = await getBaseUrl();
      
      // Search for the user using the search endpoint
      const response = await fetch(`${baseUrl}messaging/search-users/?q=${recipientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const users = await response.json();
        const foundUser = users.find((user: any) => user.id.toString() === recipientId);
        if (foundUser) {
          setRecipient(foundUser);
        }
      }
    } catch (error) {
      console.error('Error fetching recipient:', error);
    } finally {
      setLoading(false);
    }
  }, [recipientId]);

  useEffect(() => {
    fetchRecipient();
  }, [fetchRecipient]);

  // Memoize the handleInputChange to prevent navigation context issues
  const handleInputChange = useCallback((text: string) => {
    try {
      console.log('📝 Input changed:', text.length, 'characters');
      setInput(text);
    } catch (error) {
      console.error('Input change error:', error);
    }
  }, []);

  // Keyboard event listeners
  useEffect(() => {
    try {
      const keyboardWillShowListener = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
        (event) => {
          try {
            setKeyboardHeight(event.endCoordinates.height);
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

  const handleBackPress = () => {
    try {
      console.log('🔙 Attempting navigation back...');
      if (router && typeof router.canGoBack === 'function' && router.canGoBack()) {
        router.back();
      } else if (router && typeof router.push === 'function') {
        router.push('/(tabs)/messages');
      } else {
        console.warn('Router not available, using fallback');
        throw new Error('Router unavailable');
      }
    } catch (error) {
      console.error('Navigation error:', error);
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
    if (!input.trim() || sending || !recipientId) return;
    
    // Dismiss keyboard first
    try {
      Keyboard.dismiss();
    } catch (error) {
      console.error('Keyboard dismiss error:', error);
    }
    
    setSending(true);
    try {
      console.log('🚀 Sending first message to create conversation');
      
      const token = await AsyncStorage.getItem('access_token');
      const baseUrl = await getBaseUrl();
      
      // Send the message using the correct endpoint
      const response = await fetch(`${baseUrl}messaging/send/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          content: input.trim(),
          recipient_id: parseInt(recipientId) 
        }),
      });

      console.log('📤 Message send response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Send message failed:', errorText);
        throw new Error(`Failed to send message: ${response.status} ${errorText}`);
      }

      const responseData = await response.json();
      console.log('✅ Message sent successfully:', responseData);
      
      // Clear the input since message was sent successfully
      setInput('');

      // After successfully sending the message, fetch conversations to get the new conversation ID
      let conversationFound = false;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!conversationFound && attempts < maxAttempts) {
        attempts++;
        console.log(`🔍 Attempt ${attempts} to find conversation...`);
        
        const conversationsResponse = await fetch(`${baseUrl}messaging/conversations/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (conversationsResponse.ok) {
          const conversationsData = await conversationsResponse.json();
          console.log('📋 Available conversations:', conversationsData.results?.length);
          
          // Find the conversation with this recipient
          const newConversation = conversationsData.results.find((conv: any) => 
            conv.participant_1?.id.toString() === recipientId || 
            conv.participant_2?.id.toString() === recipientId
          );

          if (newConversation) {
            console.log('✅ Found conversation:', newConversation.id);
            // Navigate to the actual conversation
            router.replace(`/(tabs)/messages/${newConversation.id}`);
            conversationFound = true;
            return;
          } else {
            console.log('⏳ Conversation not found yet, waiting...');
            // Wait a bit before trying again
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        } else {
          console.error('❌ Failed to fetch conversations');
          break;
        }
      }

      if (!conversationFound) {
        console.log('⚠️ Could not find conversation after multiple attempts, staying in new message screen');
        // Instead of navigating away, just clear the input and stay here
        // The user can manually go back or send another message
        Alert.alert(
          'Message Sent', 
          'Your message was sent successfully! You can continue the conversation or go back to messages.',
          [
            { text: 'Stay Here', style: 'default' },
            { text: 'Go to Messages', style: 'cancel', onPress: () => router.replace('/(tabs)/messages') }
          ]
        );
      }
      
    } catch (error: any) {
      console.error('❌ Failed to send message:', error);
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
              <Text className="text-white text-lg">←</Text>
            </View>
          </TouchableOpacity>
          
          <Image 
            source={{ 
              uri: recipient?.profile_picture_url || 
                   recipient?.profile_picture || 
                   defaultAvatar 
            }} 
            className="w-11 h-11 rounded-full border-2 border-[#C42720]/20 mr-3" 
          />
          <View className="flex-1">
            <Text className="text-white text-lg font-semibold">
              {loading ? 'Loading...' : 
               recipient?.first_name && recipient?.last_name 
                ? `${recipient.first_name} ${recipient.last_name}`.trim()
                : recipient?.username || 'Unknown User'
              }
            </Text>
            <View className="flex-row items-center">
              <View className={`w-2 h-2 rounded-full mr-2 ${
                recipient?.is_online ? 'bg-green-500' : 'bg-gray-500'
              }`} />
              <Text className={`text-sm ${
                recipient?.is_online ? 'text-green-400' : 'text-gray-400'
              }`}>
                {loading ? 'Loading...' : 
                 recipient?.is_online ? 'Online' : 
                 recipient?.last_seen ? `Last seen ${new Date(recipient.last_seen).toLocaleDateString()}` : 
                 'Offline'}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity onPress={() => setMenuVisible(true)}>
            <View className="w-10 h-10 bg-[#1F1F1F] rounded-full justify-center items-center">
              <Text className="text-white text-lg">⋯</Text>
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
                  <Text className="text-white text-lg mr-2">🔕</Text>
                  <Text className="ml-3 text-white text-base">Mute</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center px-3 py-2" onPress={() => {}}>
                  <Text className="text-white text-lg mr-2">📌</Text>
                  <Text className="ml-3 text-white text-base">Pin Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center px-3 py-2 rounded-lg" onPress={() => {}}>
                  <Text className="text-[#C42720] text-lg mr-2">🗑️</Text>
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
          >
            <View className="flex-1 justify-center items-center py-20">
              <View className="bg-[#1F1F1F] rounded-full p-4 mb-4">
                <Text className="text-3xl">💭</Text>
              </View>
              <Text className="text-[#888888] text-base mb-2">Start a conversation</Text>
              <Text className="text-[#666666] text-sm text-center">
                Send a message to {recipient?.first_name || recipient?.username || 'this user'}
              </Text>
            </View>
          </ScrollView>
        </TouchableOpacity>

        {/* Enhanced Input Bar */}
        <View 
          className="px-4 pt-3 bg-[#111111] border-t border-[#1F1F1F]"
          style={{ 
            paddingBottom: Platform.OS === 'ios' ? 34 : 16
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
