import { useState, useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useFollowUserMutation, useUnfollowUserMutation, useGetFollowingQuery, useGetFollowersQuery } from '../../../src/store/followApi';
import { authApi } from '../../../src/store/authApi';
import { usersApi } from '../../../src/store/usersApi';
import { streamsApi } from '../../../src/store/streamsApi';
import { UseFollowSystemProps, UseFollowSystemReturn } from './types';

export const useFollowSystem = ({
  userId,
  targetUserId,
}: UseFollowSystemProps): UseFollowSystemReturn => {
  const [isFollowing, setIsFollowing] = useState(false);
  const dispatch = useDispatch();
  
  const [followUserMutation, { isLoading: isFollowLoading }] = useFollowUserMutation();
  const [unfollowUserMutation, { isLoading: isUnfollowLoading }] = useUnfollowUserMutation();
  
  const { 
    data: followingData, 
    refetch: refetchFollowing 
  } = useGetFollowingQuery(
    { search: '' }, 
    { skip: !userId, pollingInterval: 0 }
  );
  
  const { 
    data: followersData, 
    refetch: refetchFollowers 
  } = useGetFollowersQuery(
    { search: '' }, 
    { skip: !targetUserId, pollingInterval: 0 }
  );

  const isLoadingFollow = isFollowLoading || isUnfollowLoading;

  // Check if current user is following target user
  useEffect(() => {
    if (Array.isArray(followingData) && targetUserId) {
      const isCurrentlyFollowing = followingData.some(
        (user: any) => user.id === parseInt(targetUserId)
      );
      setIsFollowing(isCurrentlyFollowing);
    }
  }, [followingData, targetUserId]);

  const toggleFollow = useCallback(async () => {
    if (!userId || !targetUserId || isLoadingFollow) return;

    try {
      const targetUserIdNum = parseInt(targetUserId);
      
      if (isFollowing) {
        await unfollowUserMutation({ user_id: targetUserIdNum }).unwrap();
        setIsFollowing(false);
      } else {
        await followUserMutation({ user_id: targetUserIdNum }).unwrap();
        setIsFollowing(true);
      }
      
      // Refresh follow data
      refetchFollowing();
      refetchFollowers();
      
      // Invalidate all related caches to ensure sync across the app
      dispatch(authApi.util.invalidateTags(['User', 'Auth']));
      dispatch(usersApi.util.invalidateTags(['Users', 'UserProfile']));
      dispatch(streamsApi.util.invalidateTags(['Stream', 'Users']));
      
      console.log('🔄 Follow/unfollow completed - all caches invalidated for sync');
      
    } catch (error) {
      console.error('Failed to toggle follow:', error);
    }
  }, [
    userId,
    targetUserId,
    isFollowing,
    isLoadingFollow,
    followUserMutation,
    unfollowUserMutation,
    refetchFollowing,
    refetchFollowers,
    dispatch,
  ]);

  const refreshFollowStatus = useCallback(() => {
    refetchFollowing();
    refetchFollowers();
    
    // Also refresh related caches
    dispatch(authApi.util.invalidateTags(['Profile']));
    dispatch(usersApi.util.invalidateTags(['Users']));
    dispatch(streamsApi.util.invalidateTags(['Stream']));
    
  }, [refetchFollowing, refetchFollowers, dispatch]);

  return {
    isFollowing,
    isLoadingFollow,
    followersCount: Array.isArray(followersData) ? followersData.length : 0,
    followingCount: Array.isArray(followingData) ? followingData.length : 0,
    toggleFollow,
    refreshFollowStatus,
  };
};
