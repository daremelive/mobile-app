import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface AccountIconProps {
  size?: number;
  color?: string;
}

export const AccountIcon: React.FC<AccountIconProps> = ({ size = 24, color = 'white' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" fill={color} />
      <Path d="M12 14c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill={color} />
    </Svg>
  );
}; 