import { useState, useCallback, useEffect } from 'react';
import { useFollowUserMutation, useUnfollowUserMutation, useGetFollowingQuery, useGetFollowersQuery } from '../../../src/store/followApi';

interface UseFollowSystemProps {
  userId?: string;
  targetUserId?: string;
}

interface UseFollowSystemReturn {
  isFollowing: boolean;
  isLoadingFollow: boolean;
  followersCount: number;
  followingCount: number;
  toggleFollow: () => Promise<void>;
  refreshFollowStatus: () => void;
}

export const useFollowSystem = ({
  userId,
  targetUserId,
}: UseFollowSystemProps): UseFollowSystemReturn => {
  const [isFollowing, setIsFollowing] = useState(false);
  
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
  ]);

  const refreshFollowStatus = useCallback(() => {
    refetchFollowing();
    refetchFollowers();
  }, [refetchFollowing, refetchFollowers]);

  return {
    isFollowing,
    isLoadingFollow,
    followersCount: Array.isArray(followersData) ? followersData.length : 0,
    followingCount: Array.isArray(followingData) ? followingData.length : 0,
    toggleFollow,
    refreshFollowStatus,
  };
};
