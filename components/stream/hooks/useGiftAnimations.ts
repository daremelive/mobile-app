import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../../src/store/authSlice';

export interface GiftAnimationData {
  id: string;
  gift: {
    id: number;
    name: string;
    icon_url: string | null;
    icon: string;
    cost: number;
  };
  sender: {
    username: string;
    full_name: string;
    profile_picture_url?: string;
  };
  animationKey: string;
}

interface UseGiftAnimationsProps {
  messages: any[];
  baseURL: string;
}

export const useGiftAnimations = ({ messages, baseURL }: UseGiftAnimationsProps) => {
  const currentUser = useSelector(selectCurrentUser);
  const [activeGiftAnimations, setActiveGiftAnimations] = useState<GiftAnimationData[]>([]);

  // Watch for new gift messages and trigger animations
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1] as any;
      
      // Show gift animations for all gift messages
      if (latestMessage.message_type === 'gift') {
        const animationId = Date.now().toString() + Math.random().toString();
        const newGiftAnimation: GiftAnimationData = {
          id: animationId,
          gift: {
            id: latestMessage.gift?.id || 0,
            name: latestMessage.gift_name || 'Gift',
            icon_url: latestMessage.gift_icon && (latestMessage.gift_icon.startsWith('/') || latestMessage.gift_icon.includes('gifts/'))
              ? `${baseURL}/media/${latestMessage.gift_icon.startsWith('/') ? latestMessage.gift_icon.substring(1) : latestMessage.gift_icon}`
              : null,
            icon: latestMessage.gift_icon || '🎁',
            cost: latestMessage.gift?.cost || 0
          },
          sender: {
            username: latestMessage.user.username || 'User',
            full_name: latestMessage.user.full_name || latestMessage.user.username || 'User',
            profile_picture_url: latestMessage.user.profile_picture_url || latestMessage.user.avatar_url
          },
          animationKey: animationId,
        };
        
        setActiveGiftAnimations(prev => [...prev, newGiftAnimation]);
      }
    }
  }, [messages.length, baseURL]);

  // Handle animation completion
  const handleGiftAnimationComplete = useCallback((animationId: string) => {
    setActiveGiftAnimations(prev => prev.filter(animation => animation.id !== animationId));
  }, []);

  // Add gift animation (for when user sends a gift)
  const addGiftAnimation = useCallback((gift: any, sender?: any) => {
    const animationId = Date.now().toString() + Math.random().toString();
    const newGiftAnimation: GiftAnimationData = {
      id: animationId,
      gift: {
        id: gift.id,
        name: gift.name,
        icon_url: gift.icon_url,
        icon: gift.icon,
        cost: gift.cost
      },
      sender: sender || {
        username: currentUser?.username || 'User',
        full_name: currentUser?.first_name && currentUser?.last_name 
          ? `${currentUser.first_name} ${currentUser.last_name}`
          : currentUser?.username || 'User',
        profile_picture_url: currentUser?.profile_picture_url || currentUser?.profile_picture
      },
      animationKey: animationId,
    };
    
    setActiveGiftAnimations(prev => [...prev, newGiftAnimation]);
  }, [currentUser]);

  return {
    activeGiftAnimations,
    handleGiftAnimationComplete,
    addGiftAnimation,
  };
};
