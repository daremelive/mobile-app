import React from 'react';
import { View, Text } from 'react-native';
import { useNotificationContext } from '../context/NotificationContext';
import { fonts } from '../../constants/Fonts';

interface NotificationBadgeProps {
  showZero?: boolean;
  maxCount?: number;
  size?: 'small' | 'medium' | 'large';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  showZero = false,
  maxCount = 99,
  size = 'medium',
  position = 'top-right'
}) => {
  const { stats } = useNotificationContext();
  const count = stats.unread_notifications;

  if (!showZero && count === 0) {
    return null;
  }

  const sizeClasses = {
    small: 'w-4 h-4 text-2xs',
    medium: 'w-5 h-5 text-xs',
    large: 'w-6 h-6 text-sm'
  };

  const positionClasses = {
    'top-right': '-top-1 -right-1',
    'top-left': '-top-1 -left-1',
    'bottom-right': '-bottom-1 -right-1',
    'bottom-left': '-bottom-1 -left-1'
  };

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  return (
    <View className={`absolute ${positionClasses[position]} ${sizeClasses[size]} bg-[#C42720] rounded-full items-center justify-center z-10`}>
      <Text 
        style={{ fontFamily: fonts.bold }} 
        className={`text-white ${sizeClasses[size].split(' ')[2]} leading-none`}
      >
        {displayCount}
      </Text>
    </View>
  );
};

// Real-time notification count for use in text or other components
export const useNotificationCount = () => {
  const { stats } = useNotificationContext();
  return stats.unread_notifications;
};
