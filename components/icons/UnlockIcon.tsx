import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface UnlockIconProps {
  size?: number;
  color?: string;
}

export const UnlockIcon: React.FC<UnlockIconProps> = ({ size = 24, color = 'white' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path 
            d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"
            fill={color}
        />
    </Svg>
  );
}; 