import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, SafeAreaView, TextInput, ScrollView, TouchableOpacity, Image, Modal, Pressable, Alert, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SvgXml } from 'react-native-svg';
import * as SecureStore from 'expo-secure-store';
import ArrowLeftIcon from '../../../assets/icons/arrow-left.svg';
import { CheckDoubleIcon } from '../../../components/icons/CheckDoubleIcon';
import { CheckSingleIcon } from '../../../components/icons/CheckSingleIcon';
import { useConversationMessages } from '../../../src/hooks/useConversationMessages';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../../src/store/authSlice';
import { fonts } from '../../../constants/Fonts';
import { API_BASE_URL } from '../../../src/config/env';

const sentIcon = `<svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M14.0318 2.03561C12.5798 0.4719 1.65764 4.30246 1.66666 5.70099C1.67689 7.28692 5.93205 7.77479 7.11146 8.10572C7.82072 8.30466 8.01066 8.50866 8.17419 9.25239C8.91486 12.6207 9.28672 14.296 10.1343 14.3334C11.4852 14.3931 15.4489 3.56166 14.0318 2.03561Z" stroke="#FFFFFF" stroke-width="1.5"/>
<path d="M7.66666 8.33333L9.99999 6" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const moreIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="5" cy="12" r="1" fill="#ffffff"/>
<circle cx="12" cy="12" r="1" fill="#ffffff"/>
<circle cx="19" cy="12" r="1" fill="#ffffff"/>
</svg>`;

const notificationIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M8 21h8" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M3 18h18l-2-2v-4a7 7 0 1 0-14 0v4l-2 2Z" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="m21 3-18 18" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const pinIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12 2a8 8 0 0 0-8 8c0 5.4 8 12 8 12s8-6.6 8-12a8 8 0 0 0-8-8Z" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="12" cy="10" r="3" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const deleteIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="m3 6 18 0" stroke="#C42720" stroke-width="1.5" stroke-linecap="round"/>
<path d="m19 6 0 14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" stroke="#C42720" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="m8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" stroke="#C42720" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<line x1="10" x2="10" y1="11" y2="17" stroke="#C42720" stroke-width="1.5" stroke-linecap="round"/>
<line x1="14" x2="14" y1="11" y2="17" stroke="#C42720" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

export default function MessageDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const conversationId = params.id as string;
  const currentUser = useSelector(selectCurrentUser);
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);
  
  const isNewConversation = conversationId.startsWith('new-');
  const recipientId = isNewConversation ? conversationId.replace('new-', '') : null;
  const [recipient, setRecipient] = useState<any>(null);
  
  const getServerBaseUrl = useCallback(async () => {
    return API_BASE_URL.replace('/api/', ''); // Remove /api/ suffix for base URL
  }, []);

  const buildAvatarUrl = useCallback(async (user: any) => {
    if (!user) return `https://ui-avatars.com/api/?name=U&background=C42720&color=fff&size=100`;
    
    if (user.profile_picture_url) {
      if (user.profile_picture_url.startsWith('http')) {
        return user.profile_picture_url;
      } else {
        const serverBaseUrl = await getServerBaseUrl();
        const fullUrl = `${serverBaseUrl}${user.profile_picture_url}`;
        return fullUrl;
      }
    }
    
    const name = encodeURIComponent(user.first_name || user.username || 'U');
    const fallbackUrl = `https://ui-avatars.com/api/?name=${name}&background=C42720&color=fff&size=100`;
    return fallbackUrl;
  }, [getServerBaseUrl]);

  const [avatarUrls, setAvatarUrls] = useState<{[key: string]: string}>({});
  
  const { messages, loading, error, conversation, fetchMessages, fetchConversation, sendMessage } = useConversationMessages(conversationId);

  const handleInputChange = useCallback((text: string) => {
    try {
      setInput(text);
    } catch (error) {
    }
  }, []);

  // Fetch recipient data for new conversations
  const fetchRecipient = useCallback(async () => {
    if (!isNewConversation || !recipientId) return;
    
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      const baseUrl = API_BASE_URL;
      
      const response = await fetch(`${baseUrl}users/${recipientId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setRecipient(userData);
      }
    } catch (error) {
    }
  }, [isNewConversation, recipientId]);

  const getOtherParticipant = useCallback(() => {
    if (isNewConversation && recipient) {
      return recipient;
    }
    
    if (!conversation || !currentUser) return null;
    
    if (conversation.other_participant) {
      return conversation.other_participant;
    }
    
    return conversation.participant_1?.id === currentUser.id 
      ? conversation.participant_2 
      : conversation.participant_1;
  }, [conversation, currentUser, isNewConversation, recipient]);

  const otherParticipant = getOtherParticipant();

  useEffect(() => {
    const updateAvatarUrls = async () => {
      const urls: {[key: string]: string} = {};
      
      if (otherParticipant) {
        urls['other'] = await buildAvatarUrl(otherParticipant);
      }
      
      for (const message of messages) {
        if (message.sender && !message.is_outgoing) {
          const senderId = `sender_${message.sender.id}`;
          if (!urls[senderId]) {
            urls[senderId] = await buildAvatarUrl(message.sender);
          }
        }
      }
      
      setAvatarUrls(urls);
    };
    
    updateAvatarUrls();
  }, [otherParticipant, messages, buildAvatarUrl]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        try {
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        } catch (error) {
        }
      }, 200);
    }
  }, [messages.length]);
  
  useEffect(() => {
    try {
      const keyboardWillShowListener = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
        (event) => {
          try {
            setKeyboardVisible(true);
            setTimeout(() => {
              scrollViewRef.current?.scrollTo({ y: 0, animated: true });
            }, 100);
          } catch (error) {
          }
        }
      );

      const keyboardWillHideListener = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
        () => {
          try {
            setKeyboardVisible(false);
          } catch (error) {
          }
        }
      );

      return () => {
        try {
          keyboardWillShowListener.remove();
          keyboardWillHideListener.remove();
        } catch (error) {
        }
      };
    } catch (error) {
    }
  }, []);
  
  React.useEffect(() => {
    if (isNewConversation) {
      fetchRecipient();
    } else if (conversationId && conversationId !== '0') {
      fetchConversation();
      fetchMessages();
    }
  }, [conversationId, isNewConversation, fetchRecipient, fetchConversation, fetchMessages]);

  React.useEffect(() => {
    if (conversationId === '0') {
      return;
    }
    
    let messageCount = 0;
    const interval = setInterval(() => {
      if (conversationId && conversationId !== '0') {
        fetchMessages();
        messageCount++;
        if (messageCount % 5 === 0) {
          fetchConversation();
        }
      }
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [conversationId]);

  const handleBackPress = () => {
    try {
      router.push('/(tabs)/messages');
    } catch (error) {
      try {
        if (router && typeof router.replace === 'function') {
          router.replace('/(tabs)/messages');
        }
      } catch (fallbackError) {
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    
    // Don't dismiss keyboard - keep it open for continued messaging
    
    setSending(true);
    try {
      if (isNewConversation && recipientId) {
        // For new conversations, send message directly to recipient
        const token = await SecureStore.getItemAsync('accessToken');
        const baseUrl = API_BASE_URL;
        
        const response = await fetch(`${baseUrl}messaging/send/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient_id: parseInt(recipientId),
            content: input.trim(),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const messageData = await response.json();
        setInput('');
        
        // Keep focus on input after sending
        setTimeout(() => {
          textInputRef.current?.focus();
        }, 100);
        
        // After sending, try to find the conversation and redirect to it
        const conversationsResponse = await fetch(`${baseUrl}messaging/conversations/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (conversationsResponse.ok) {
          const conversationsData = await conversationsResponse.json();
          const newConversation = conversationsData.results.find((conv: any) => 
            conv.participant_1?.id.toString() === recipientId || 
            conv.participant_2?.id.toString() === recipientId
          );

          if (newConversation) {
            // Replace the current route with the actual conversation
            router.replace(`/(tabs)/messages/${newConversation.id}`);
            return;
          }
        }
      } else {
        await sendMessage(input.trim());
        setInput('');
        
        setTimeout(() => {
          textInputRef.current?.focus();
        }, 100);
        
        setTimeout(() => {
          fetchMessages();
        }, 500);
      }
      
      setTimeout(() => {
        try {
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        } catch (error) {
        }
      }, 600);
    } catch (error: any) {
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

  const sortedMessages = [...messages].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1">
        <StatusBar style="light" />
      
      <View className="flex-row items-center px-4 pt-3 pb-4">
        <TouchableOpacity 
          onPress={handleBackPress} 
          className="mr-4 bg-[#1E1E1E] w-12 h-12 rounded-full justify-center items-center"
        >
          <ArrowLeftIcon width={24} height={24} />
        </TouchableOpacity>
        
        <Image 
          source={{ 
            uri: avatarUrls['other'] || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherParticipant?.first_name || otherParticipant?.username || 'U')}&background=C42720&color=fff&size=100`
          }} 
          className="w-12 h-12 rounded-full mr-3" 
        />
        <View className="flex-1">
          <Text style={{ fontFamily: fonts.semiBold }} className="text-white text-lg">
            {loading && !otherParticipant ? 'Loading...' : 
             otherParticipant?.first_name && otherParticipant?.last_name 
              ? `${otherParticipant.first_name} ${otherParticipant.last_name}`.trim()
              : otherParticipant?.username || 'Unknown User'
            }
          </Text>
          <View className="flex-row items-center">
            <Text style={{ fontFamily: fonts.regular }} className={`text-sm ${
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
          <SvgXml xml={moreIcon} width={24} height={24} />
        </TouchableOpacity>
        
        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <Pressable className="flex-1" onPress={() => setMenuVisible(false)}>
            <View className="absolute right-4 top-[120px] w-44 bg-[#1E1E1E] rounded-xl shadow-lg p-2">
              <TouchableOpacity className="flex-row items-center px-3 py-3" onPress={() => setMenuVisible(false)}>
                <SvgXml xml={notificationIcon} width={20} height={20} />
                <Text style={{ fontFamily: fonts.regular }} className="ml-3 text-white text-base">Mute</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-row items-center px-3 py-3" onPress={() => setMenuVisible(false)}>
                <SvgXml xml={pinIcon} width={20} height={20} />
                <Text style={{ fontFamily: fonts.regular }} className="ml-3 text-white text-base">Pin Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-row items-center px-3 py-3 rounded-lg" onPress={() => setMenuVisible(false)}>
                <SvgXml xml={deleteIcon} width={20} height={20} />
                <Text style={{ fontFamily: fonts.regular }} className="ml-3 text-[#C42720] text-base">Delete Chat</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? (isKeyboardVisible ? -100 : 90) : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          className="flex-1 px-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ 
            paddingBottom: 20,
            flexGrow: 1 
          }}
          keyboardShouldPersistTaps="handled"
          style={{ transform: [{ scaleY: -1 }] }}
        >
          {loading && sortedMessages.length === 0 ? (
            <View className="flex-1 justify-center items-center py-20" style={{ transform: [{ scaleY: -1 }] }}>
              <Text style={{ fontFamily: fonts.regular }} className="text-gray-400 text-base">Loading messages...</Text>
            </View>
          ) : error ? (
            <View className="flex-1 justify-center items-center py-20" style={{ transform: [{ scaleY: -1 }] }}>
              <Text style={{ fontFamily: fonts.regular }} className="text-red-400 text-base mb-2">Failed to load messages</Text>
              <Text style={{ fontFamily: fonts.regular }} className="text-gray-400 text-sm mb-4 text-center px-4">
                {error.includes('404') ? 'Conversation not found' : 
                 error.includes('401') || error.includes('403') ? 'Access denied' :
                 error.includes('fetch') ? 'Network error - check your connection' :
                 `Error: ${error}`}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  fetchMessages();
                  fetchConversation();
                }}
                className="bg-[#C42720] px-6 py-3 rounded-full"
              >
                <Text style={{ fontFamily: fonts.semiBold }} className="text-white">Retry</Text>
              </TouchableOpacity>
            </View>
          ) : sortedMessages.length === 0 ? (
            <View className="flex-1 justify-center items-center py-20" style={{ transform: [{ scaleY: -1 }] }}>
              <Text style={{ fontFamily: fonts.regular }} className="text-gray-400 text-base mb-2">
                {isNewConversation ? 'Start a conversation' : 'No messages yet'}
              </Text>
              <Text style={{ fontFamily: fonts.regular }} className="text-gray-500 text-sm">
                {isNewConversation 
                  ? `Send a message to ${otherParticipant?.first_name || otherParticipant?.username || 'this user'}`
                  : 'Start the conversation!'
                }
              </Text>
            </View>
          ) : (
            <View className="py-2">
              {sortedMessages.map((msg, index) => (
                <View key={msg.id} className={`mb-4 flex-row ${msg.is_outgoing ? 'justify-end' : 'justify-start'}`} style={{ transform: [{ scaleY: -1 }] }}>
                  {!msg.is_outgoing && (
                    <Image 
                      source={{ 
                        uri: avatarUrls[`sender_${msg.sender?.id}`] || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender?.first_name || msg.sender?.username || 'U')}&background=C42720&color=fff&size=100`
                      }} 
                      className="w-8 h-8 rounded-full mr-3 self-end" 
                    />
                  )}
                  <View className="max-w-[75%]">
                    <View className={`px-4 py-3 ${
                      msg.is_outgoing 
                        ? 'bg-[#C42720] rounded-2xl rounded-br-md' 
                        : 'bg-[#2E2E2E] rounded-2xl rounded-bl-md'
                    }`}>
                      <Text style={{ fontFamily: fonts.regular }} className={`text-[15px] leading-5 ${msg.is_outgoing ? 'text-white' : 'text-gray-100'}`}>
                        {msg.content}
                      </Text>
                    </View>
                    <View className={`flex-row items-center mt-1 ${msg.is_outgoing ? 'justify-end' : 'justify-start'}`}>
                      <Text style={{ fontFamily: fonts.regular }} className="text-gray-500 text-xs">
                        {new Date(msg.created_at).toLocaleTimeString('en-US', { 
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </Text>
                      {msg.is_outgoing && (
                        <View className="ml-2 flex-row items-center">
                          {msg.is_read ? (
                            <CheckDoubleIcon size={14} color="#C42720" />
                          ) : msg.is_delivered ? (
                            <CheckDoubleIcon size={14} color="#666666" />
                          ) : (
                            <CheckSingleIcon size={14} color="#666666" />
                          )}
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

        <View className={`px-4 py-2 bg-black ${isKeyboardVisible ? 'pb-4' : 'pb-28'}`}>
          <View className="flex-row items-center bg-[#1E1E1E] rounded-full px-4 py-3">
            <TextInput
              ref={textInputRef}
              className="flex-1 text-white text-base mr-3"
              style={{ fontFamily: fonts.regular }}
              placeholder="Type a message"
              placeholderTextColor="#8A8A8E"
              value={input}
              onChangeText={handleInputChange}
              multiline={false}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              blurOnSubmit={false}
            />
            <TouchableOpacity 
              className={`w-10 h-10 rounded-full justify-center items-center ${
                sending || !input.trim() 
                  ? 'bg-gray-600' 
                  : 'bg-[#C42720]'
              }`}
              onPress={handleSend}
              disabled={sending || !input.trim()}
            >
              {sending ? (
                <View className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <SvgXml xml={sentIcon} width={16} height={16} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
} 