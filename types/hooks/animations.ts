/**
 * Animation hook types
 * Gift animations and visual effects
 */

import { GiftAnimation } from '../stream/messages';

// Gift animations hook props
export interface UseGiftAnimationsProps {
  enabled?: boolean;
  maxAnimations?: number;
  animationDuration?: number;
}

// Gift animations hook return
export interface UseGiftAnimationsReturn {
  animations: GiftAnimation[];
  addAnimation: (animation: Omit<GiftAnimation, 'id' | 'timestamp' | 'is_playing'>) => void;
  removeAnimation: (id: string) => void;
  clearAnimations: () => void;
  isAnimating: boolean;
}

// Follow system hook props
export interface UseFollowSystemProps {
  userId?: number;
  enabled?: boolean;
}

// Follow system hook return
export interface UseFollowSystemReturn {
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
  toggleFollow: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}