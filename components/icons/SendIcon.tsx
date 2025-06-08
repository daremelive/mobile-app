import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface SendIconProps {
  size?: number;
  color?: string;
}

export const SendIcon: React.FC<SendIconProps> = ({ size = 24, color = '#000' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z"
        fill={color}
      />
    </Svg>
  );
}; 