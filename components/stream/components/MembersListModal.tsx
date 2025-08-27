import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, FlatList, Image, Alert, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { 
  useInviteUsersToStreamMutation, 
  useRemoveGuestMutation,
  useRemoveParticipantMutation,
  StreamParticipant,
  usePromoteViewerToGuestMutation
} from '../../../src/store/streamsApi';
import { useBlockUserMutation, useUnblockUserMutation, useGetBlockedUsersQuery } from '../../../src/api/blockedApi';
import { selectCurrentUser } from '../../../src/store/authSlice';
import { messagesApi, User as MessagesUser } from '../../../src/services/messagesApi';

interface User {
  id: number;
  participant_id?: number; // StreamParticipant ID for removal
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  followers_count?: string;
  profile_picture_url?: string;
  is_online?: boolean;
}

interface Participant extends User {
  participant_type: 'host' | 'guest' | 'viewer';
  is_streaming?: boolean;
}

interface Viewer extends User {
  joined_at?: string;
  last_seen?: string | null;
}

interface MembersListModalProps {
  visible: boolean;
  onClose: () => void;
  streamId: string;
  participants?: Participant[];
  viewers?: Viewer[];
  currentUserRole: 'host' | 'guest' | 'viewer';
  onRefresh?: () => void;
}

type ActionType = 'promote' | 'block' | 'invite' | 'remove';

interface ActionMenuProps {
  visible: boolean;
  user: User;
  userType: 'participant' | 'viewer' | 'search';
  currentUserRole: 'host' | 'guest' | 'viewer';
  onAction: (action: ActionType, user: User) => void;
  onClose: () => void;
}

const ActionMenu: React.FC<ActionMenuProps> = ({ 
  visible, 
  user, 
  userType, 
  currentUserRole,
  onAction, 
  onClose 
}) => {
  if (!visible) return null;

  const canRemove = currentUserRole === 'host' && userType === 'participant';
  const canPromote = currentUserRole === 'host' && userType === 'viewer';
  const canBlock = currentUserRole === 'host' && userType === 'viewer';
  const canInvite = currentUserRole === 'host' && userType === 'search';

  if (!visible) {
    return null;
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity 
        className="flex-1 bg-black/50" 
        activeOpacity={1} 
        onPress={() => {
          onClose();
        }}
      >
        <View className="flex-1 items-center justify-center px-6">
          <TouchableOpacity 
            activeOpacity={1}
          >
            <View className="bg-gray-800 rounded-2xl p-4 w-full max-w-sm">
              <View className="flex-row items-center mb-4 pb-4 border-b border-gray-700">
                <Image
                  source={{ uri: user.profile_picture_url || 'https://via.placeholder.com/48' }}
                  className="w-12 h-12 rounded-full mr-3"
                />
                <View className="flex-1">
                  <Text className="text-white font-semibold">{user.full_name}</Text>
                  <Text className="text-gray-400 text-sm">@{user.username}</Text>
                </View>
              </View>

              <View className="space-y-2">
                {canInvite && (
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert('Test', 'Invite button was pressed!');
                      onAction('invite', user);
                      onClose();
                    }}
                    className="flex-row items-center py-3 px-4 rounded-xl bg-blue-600/20"
                  >
                    <Ionicons name="person-add" size={20} color="#3B82F6" />
                    <Text className="text-blue-400 font-medium ml-3">Invite as Guest</Text>
                  </TouchableOpacity>
                )}

                {/* Add a test button to verify modal is working */}
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert('Test', 'Modal is working!');
                  }}
                  className="flex-row items-center py-3 px-4 rounded-xl bg-green-600/20"
                >
                  <Ionicons name="checkmark" size={20} color="#10B981" />
                  <Text className="text-green-400 font-medium ml-3">Test Button</Text>
                </TouchableOpacity>
              
              {canPromote && (
                <TouchableOpacity
                  onPress={() => {
                    onAction('promote', user);
                    onClose();
                  }}
                  className="flex-row items-center py-3 px-4 rounded-xl bg-green-600/20"
                >
                  <Ionicons name="arrow-up-circle" size={20} color="#10B981" />
                  <Text className="text-green-400 font-medium ml-3">Promote to Guest</Text>
                </TouchableOpacity>
              )}

              {canBlock && (
                <TouchableOpacity
                  onPress={() => {
                    onAction('block', user);
                    onClose();
                  }}
                  className={`flex-row items-center py-3 px-4 rounded-xl ${
                    /* We'll need to check if user is blocked in action menu too, but for now just show block */
                    'bg-yellow-600/20'
                  }`}
                >
                  <Ionicons name="ban" size={20} color="#F59E0B" />
                  <Text className="text-yellow-400 font-medium ml-3">Block/Unblock User</Text>
                </TouchableOpacity>
              )}

              {canRemove && (
                <TouchableOpacity
                  onPress={() => {
                    onAction('remove', user);
                    onClose();
                  }}
                  className="flex-row items-center py-3 px-4 rounded-xl bg-red-600/20"
                >
                  <Ionicons name="person-remove" size={20} color="#DC2626" />
                  <Text className="text-red-400 font-medium ml-3">Remove Guest</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={onClose}
              className="mt-4 py-3 px-4 rounded-xl bg-gray-700"
            >
              <Text className="text-white font-medium text-center">Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
    </Modal>
  );
};

type DisplayItem = 
  | { item: User; type: 'search' }
  | { item: User; type: 'participant' }
  | { item: User; type: 'viewer' };

export const MembersListModal = ({
  visible,
  onClose,
  streamId,
  participants,
  viewers,
  currentUserRole,
  onRefresh,
}: MembersListModalProps) => {
  const currentUser = useSelector(selectCurrentUser);
  const [activeTab, setActiveTab] = useState<'guests' | 'audience'>('guests');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [userType, setUserType] = useState<'participant' | 'viewer' | 'search'>('participant');
  const [promotingUserId, setPromotingUserId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [inviteUsers] = useInviteUsersToStreamMutation();
  const [removeGuest] = useRemoveGuestMutation();
  const [removeParticipant] = useRemoveParticipantMutation();
  const [promoteViewer] = usePromoteViewerToGuestMutation();
  const [blockUser] = useBlockUserMutation();
  const [unblockUser] = useUnblockUserMutation();

  // Refresh data when modal becomes visible
  useEffect(() => {
    if (visible && onRefresh) {
      onRefresh();
    }
  }, [visible, onRefresh]);

  // Get blocked users to determine block status
  const { data: blockedUsers = [] } = useGetBlockedUsersQuery();

  // Helper function to check if a user is blocked
  const isUserBlocked = useCallback((userId: number) => {
    return blockedUsers.some(blocked => blocked.blocked_user.id === userId);
  }, [blockedUsers]);

  // Search users when query changes
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await messagesApi.searchUsers(searchQuery.trim());
        // Filter out current user and already participating users
        const filtered = results.filter(user => 
          user.id !== currentUser?.id && 
          !(participants || []).some(p => p.id === user.id) &&
          !(viewers || []).some(v => v.id === user.id)
        ).map(user => ({
          ...user,
          full_name: user.full_name || `${user.first_name} ${user.last_name}`.trim()
        }));
        setSearchResults(filtered);
      } catch (error) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [searchQuery, currentUser?.id, participants, viewers]);

  // Filter participants and viewers based on search
  const filteredParticipants = (participants || []).filter(p => 
    p.participant_type === 'guest' && // Only show guests, not the host
    (p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     p.username?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredViewers = (viewers || []).filter(v =>
    v.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openActionMenu = (user: User, type: 'participant' | 'viewer' | 'search') => {
    setSelectedUser(user);
    setUserType(type);
    setActionMenuVisible(true);
  };

  const handleAction = useCallback(async (action: ActionType, user: User) => {
    try {
      switch (action) {
        case 'invite':
          const result = await inviteUsers({ 
            streamId, 
            userIds: [user.id] 
          }).unwrap();
          Alert.alert('Success', `Invitation sent to ${user.full_name}`);
          setSearchQuery('');
          break;

        case 'promote':
          setPromotingUserId(user.id);
          try {
            console.log('🚀 Starting promotion for user:', user.id, 'in stream:', streamId);
            const result = await promoteViewer({ 
              streamId, 
              userId: user.id 
            }).unwrap();
            console.log('✅ Promotion successful:', result);
            Alert.alert(
              '🎉 Promotion Successful!', 
              `${user.first_name || user.username} has been promoted to guest speaker and assigned to Seat ${result.participant.seat_number}.`
            );
            onRefresh?.(); // Refresh the audience list
          } catch (error) {
            console.error('❌ Promotion error:', error);
            console.log('🔍 Error details:', JSON.stringify(error, null, 2));
            
            let errorMessage = 'Failed to promote user. Please try again.';
            
            if (error && typeof error === 'object' && 'data' in error) {
              const apiError = error as { data: { error?: string } };
              if (apiError.data?.error) {
                errorMessage = apiError.data.error;
              }
            }
            
            Alert.alert('Promotion Failed', errorMessage);
          } finally {
            setPromotingUserId(null);
          }
          break;

        case 'block':
          const isBlocked = isUserBlocked(user.id);
          const actionText = isBlocked ? 'Unblock' : 'Block';
          const actionMessage = isBlocked 
            ? `Are you sure you want to unblock ${user.full_name}? They will be able to join the stream again.`
            : `Are you sure you want to block ${user.full_name}? They will be removed from the stream and won't be able to join again.`;
          
          Alert.alert(
            `${actionText} User`,
            actionMessage,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: actionText,
                style: isBlocked ? 'default' : 'destructive',
                onPress: async () => {
                  try {
                    if (isBlocked) {
                      await unblockUser({ user_id: user.id }).unwrap();
                      Alert.alert('Success', `${user.full_name} has been unblocked`);
                    } else {
                      // Block the user
                      await blockUser({ user_id: user.id }).unwrap();
                      
                      // If the user is currently in the stream, kick them out
                      const isInStream = user.participant_id !== undefined;
                      if (isInStream && user.participant_id) {
                        try {
                          await removeParticipant({ 
                            streamId, 
                            participantId: user.participant_id.toString() 
                          }).unwrap();
                        } catch (kickError) {
                          console.log('Could not kick user from stream:', kickError);
                          // Continue with blocking even if kick fails
                        }
                      }
                      
                      Alert.alert('Success', `${user.full_name} has been blocked and removed from the stream`);
                    }
                    onRefresh?.();
                  } catch (error: any) {
                    Alert.alert('Error', error?.data?.message || `Failed to ${actionText.toLowerCase()} user. Please try again.`);
                  }
                }
              }
            ]
          );
          break;

        case 'remove':
          const isViewer = user.participant_id !== undefined;
          const alertTitle = isViewer ? 'Remove Viewer' : 'Remove Guest';
          const alertMessage = isViewer 
            ? `Are you sure you want to remove ${user.full_name} from the stream? They will no longer be able to view or participate.`
            : `Are you sure you want to remove ${user.full_name} from the stream?`;
            
          Alert.alert(
            alertTitle,
            alertMessage,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                  try {
                    if (isViewer && user.participant_id) {
                      // Use removeParticipant for viewers (and guests with participant_id)
                      const result = await removeParticipant({ 
                        streamId, 
                        participantId: user.participant_id.toString() 
                      }).unwrap();
                    } else {
                      // Fallback to removeGuest for legacy guests without participant_id
                      const result = await removeGuest({ 
                        streamId, 
                        guestId: user.id.toString() 
                      }).unwrap();
                    }
                    Alert.alert('Success', `${user.full_name} has been removed`);
                    onRefresh?.();
                  } catch (error) {
                    throw error; // Re-throw to trigger the outer catch
                  }
                }
              }
            ]
          );
          break;
      }
    } catch (error: any) {
      Alert.alert('Error', error?.data?.message || 'Action failed. Please try again.');
    }
  }, [streamId, inviteUsers, removeGuest, removeParticipant, promoteViewer, blockUser, unblockUser, isUserBlocked, onRefresh]);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      // Call onRefresh and add a small delay for better UX
      onRefresh();
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, isRefreshing]);

  const renderUser = useCallback(({ item, type }: { item: User; type: 'participant' | 'viewer' | 'search' }) => {
    const isParticipant = type === 'participant';
    const isViewer = type === 'viewer';
    const isSearch = type === 'search';
    
    return (
      <TouchableOpacity
        onPress={() => openActionMenu(item, type)}
        className="flex-row items-center justify-between py-3 px-4 active:bg-gray-800/50"
      >
        <View className="flex-row items-center flex-1">
          <View className="relative">
            <Image
              source={{ uri: item.profile_picture_url || 'https://via.placeholder.com/48' }}
              className="w-12 h-12 rounded-full"
            />
            {item.is_online && (
              <View className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900" />
            )}
            {isParticipant && (
              <View className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full items-center justify-center">
                <Ionicons name="mic" size={10} color="white" />
              </View>
            )}
          </View>
          
          <View className="flex-1 ml-3">
            <Text className="text-white text-base font-semibold">
              {item.first_name || item.last_name || item.username || 'User'}
            </Text>
            <View className="flex-row items-center">
              <Text className="text-gray-400 text-sm">
                @{item.username}
              </Text>
              {item.followers_count && (
                <>
                  <Text className="text-gray-500 text-sm mx-1">•</Text>
                  <Text className="text-gray-400 text-sm">
                    {item.followers_count} followers
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
        
        <View className="flex-row items-center space-x-3">
          {isParticipant && currentUserRole === 'host' && (
            <View className="bg-red-600/20 px-4 py-2 rounded-lg">
              <Text className="text-red-400 text-sm font-medium">Guest</Text>
            </View>
          )}
          {isViewer && currentUserRole === 'host' && (
            <View className="flex-row space-x-4">
              {/* Promote to Guest Button */}
              <TouchableOpacity 
                onPress={() => handleAction('promote', item)}
                disabled={promotingUserId === item.id}
                className={`px-3 py-1.5 mr-2 rounded-full flex-row items-center ${
                  promotingUserId === item.id 
                    ? 'bg-blue-600/10' 
                    : 'bg-blue-600/20'
                }`}
              >
                {promotingUserId === item.id ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <Ionicons 
                    name="arrow-up-circle" 
                    size={16} 
                    color="#3B82F6" 
                  />
                )}
                <Text className={`text-sm font-medium ml-2 ${
                  promotingUserId === item.id ? 'text-blue-300' : 'text-blue-400'
                }`}>
                  {promotingUserId === item.id ? 'Promoting...' : 'Promote'}
                </Text>
              </TouchableOpacity>
              
              {/* Block/Unblock Button */}
              <TouchableOpacity 
                onPress={() => handleAction('block', item)}
                className={`px-3 py-1.5 rounded-full flex-row items-center ${
                  isUserBlocked(item.id) 
                    ? 'bg-green-600/20' 
                    : 'bg-red-600/20'
                }`}
              >
                <Ionicons 
                  name={isUserBlocked(item.id) ? "checkmark" : "ban"} 
                  size={16} 
                  color={isUserBlocked(item.id) ? "#10B981" : "#EF4444"} 
                />
                <Text className={`text-sm font-medium ml-2 ${
                  isUserBlocked(item.id) ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isUserBlocked(item.id) ? 'Unblock' : 'Block'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {isViewer && currentUserRole !== 'host' && (
            <View className="bg-gray-600/30 px-4 py-2 rounded-lg">
              <Text className="text-gray-400 text-sm font-medium">Viewer</Text>
            </View>
          )}
          {isSearch && (
            <View className="bg-blue-600/20 px-4 py-2 rounded-lg">
              <Text className="text-blue-400 text-sm font-medium">Invite</Text>
            </View>
          )}
          {!isViewer && <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />}
        </View>
      </TouchableOpacity>
    );
  }, [currentUserRole, isUserBlocked]);

  const getDisplayData = (): DisplayItem[] => {
    if (searchQuery.trim().length >= 2 && searchResults.length > 0) {
      return searchResults.map(user => ({ item: user, type: 'search' as const }));
    }
    
    if (activeTab === 'guests') {
      return filteredParticipants.map(p => ({ item: p as User, type: 'participant' as const }));
    } else {
      return filteredViewers.map(v => ({ item: v as User, type: 'viewer' as const }));
    }
  };

  const displayData = getDisplayData();

  return (
    <>
      <Modal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
      >
        <View className="flex-1 bg-black/70">
          <View className="flex-1 bg-gray-900 mt-20 rounded-t-3xl">
            {/* Header */}
            <View className="flex-row items-center justify-between p-6 pb-4">
              <Text className="text-white text-xl font-bold">
                Members List
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="w-8 h-8 items-center justify-center"
              >
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Tab Buttons */}
            <View className="flex-row mx-6 mb-6">
              <TouchableOpacity
                onPress={() => setActiveTab('guests')}
                className="flex-1 mr-2"
              >
                <View className={`py-3 px-4 rounded-xl ${
                  activeTab === 'guests' 
                    ? 'bg-white' 
                    : 'bg-transparent'
                }`}>
                  <Text className={`text-center font-semibold ${
                    activeTab === 'guests' 
                      ? 'text-black' 
                      : 'text-gray-400'
                  }`}>
                    Guests ({filteredParticipants.length})
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => setActiveTab('audience')}
                className="flex-1 ml-2"
              >
                <View className={`py-3 px-4 rounded-xl ${
                  activeTab === 'audience' 
                    ? 'bg-white' 
                    : 'bg-transparent'
                }`}>
                  <Text className={`text-center font-semibold ${
                    activeTab === 'audience' 
                      ? 'text-black' 
                      : 'text-gray-400'
                  }`}>
                    Audience ({filteredViewers.length})
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View className="mx-6 mb-4">
              <View className="flex-row items-center bg-gray-800 border border-gray-600 rounded-full px-4 py-3">
                {isSearching ? (
                  <ActivityIndicator size="small" color="#9CA3AF" />
                ) : (
                  <Ionicons name="search" size={20} color="#9CA3AF" />
                )}
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={
                    activeTab === 'guests' 
                      ? "Search guests or invite new users..." 
                      : "Search audience or invite users..."
                  }
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 text-white ml-3 text-base"
                  autoCapitalize="none"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
              {searchQuery.trim().length >= 2 && (
                <Text className="text-gray-400 text-xs mt-2 px-4">
                  {isSearching 
                    ? 'Searching...' 
                    : searchResults.length > 0 
                      ? `${searchResults.length} users found`
                      : 'No users found'
                  }
                </Text>
              )}
            </View>

            {/* Members List */}
            <View className="flex-1">
              {displayData.length === 0 ? (
                <ScrollView
                  contentContainerStyle={{ flex: 1 }}
                  refreshControl={
                    <RefreshControl
                      refreshing={isRefreshing}
                      onRefresh={handleRefresh}
                      tintColor="#ffffff"
                      titleColor="#ffffff"
                      colors={['#ffffff']}
                    />
                  }
                >
                  <View className="flex-1 items-center justify-center px-6">
                    <Ionicons 
                      name={
                        searchQuery.trim().length >= 2 
                          ? "search" 
                          : activeTab === 'guests' 
                            ? "people" 
                            : "eye"
                      } 
                      size={48} 
                      color="#6B7280" 
                    />
                    <Text className="text-gray-400 text-center mt-4 text-base">
                      {searchQuery.trim().length >= 2 
                        ? isSearching 
                          ? 'Searching for users...'
                          : 'No users found'
                        : activeTab === 'guests'
                          ? 'No guests in this stream yet'
                          : 'No viewers in this stream yet'
                      }
                    </Text>
                    {searchQuery.trim().length >= 2 && !isSearching && (
                      <Text className="text-gray-500 text-center mt-2 text-sm">
                        Try searching for a different username
                      </Text>
                    )}
                  </View>
                </ScrollView>
              ) : (
                <FlatList
                  data={displayData}
                  renderItem={({ item }) => renderUser({ item: item.item, type: item.type })}
                  keyExtractor={(item) => `${item.type}-${item.item.id}`}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  refreshControl={
                    <RefreshControl
                      refreshing={isRefreshing}
                      onRefresh={handleRefresh}
                      tintColor="#ffffff"
                      titleColor="#ffffff"
                      colors={['#ffffff']}
                    />
                  }
                />
              )}
            </View>
          </View>
        </View>
      </Modal>

      <ActionMenu
        visible={actionMenuVisible}
        user={selectedUser!}
        userType={userType}
        currentUserRole={currentUserRole}
        onAction={handleAction}
        onClose={() => setActionMenuVisible(false)}
      />
    </>
  );
};
