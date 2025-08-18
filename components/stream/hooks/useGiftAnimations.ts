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
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(new Set());

  // Watch for new gift messages and trigger animations
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1] as any;
      
      // Only process gift messages that haven't been processed yet
      if (latestMessage.message_type === 'gift' && !processedMessageIds.has(latestMessage.id)) {
        // Mark this message as processed
        setProcessedMessageIds(prev => new Set([...prev, latestMessage.id]));
        
        const animationId = Date.now().toString() + Math.random().toString();
        
        // Construct proper icon URL
        let iconUrl = null;
        if (latestMessage.gift?.icon_url) {
          // Use the full icon_url from gift object if available
          iconUrl = latestMessage.gift.icon_url;
        } else if (latestMessage.gift_icon) {
          // Fallback to constructing URL from gift_icon path - use web URL not API URL
          const cleanPath = latestMessage.gift_icon.startsWith('/') ? latestMessage.gift_icon.substring(1) : latestMessage.gift_icon;
          const webURL = baseURL?.replace('/api/', '') || 'https://daremelive.pythonanywhere.com';
          iconUrl = `${webURL}/media/${cleanPath}`;
        }
        
        console.log('🖼️ Constructed icon URL:', iconUrl);
        
        const newGiftAnimation: GiftAnimationData = {
          id: animationId,
          gift: {
            id: latestMessage.gift?.id || 0,
            name: latestMessage.gift_name || 'Gift',
            icon_url: iconUrl,
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
        
        console.log('🎬 Creating gift animation:', newGiftAnimation);
        setActiveGiftAnimations(prev => [...prev, newGiftAnimation]);
      }
    }
  }, [messages.length, baseURL, processedMessageIds]);

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
