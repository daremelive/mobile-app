import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface BlockedIconProps {
  size?: number;
  color?: string;
}

export const BlockedIcon: React.FC<BlockedIconProps> = ({ size = 24, color = 'white' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path 
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.45 19.37 13.75 20 12 20zm4.9-1.69L7.69 5.1C9.15 4.05 10.85 3.5 12.5 3.5c4.42 0 8 3.58 8 8 0 1.75-.55 3.45-1.6 4.9z"
            fill={color}
        />
    </Svg>
  );
}; 