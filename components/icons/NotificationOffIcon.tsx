import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface NotificationOffIconProps {
  size?: number;
  color?: string;
}

export const NotificationOffIcon: React.FC<NotificationOffIconProps> = ({ size = 24, color = '#000' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19.29 17.29L18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C10.19 4.77 9.89 4.89 9.6 5.02L19.29 14.71C19.73 15.15 19.73 15.85 19.29 16.29C18.85 16.73 18.15 16.73 17.71 16.29L7.02 6.6C6.58 6.16 6.58 5.46 7.02 5.02C7.46 4.58 8.16 4.58 8.6 5.02L19.29 15.71C19.73 16.15 19.73 16.85 19.29 17.29ZM12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM4.41 2.86L3 4.27L5.73 7H4C3.45 7 3 7.45 3 8V16C3 16.55 3.45 17 4 17H16.73L19.73 20L21.14 18.59L4.41 2.86Z"
        fill={color}
      />
    </Svg>
  );
}; 