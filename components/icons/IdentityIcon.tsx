import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IdentityIconProps {
  size?: number;
  color?: string;
}

export const IdentityIcon: React.FC<IdentityIconProps> = ({ size = 24, color = 'white' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path 
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM7.07 18.28c.43-.9 1.05-1.72 1.83-2.39.78-.67 1.74-1.12 2.78-1.34.02-.01 0 0 0 0 .1-.02.2-.04.29-.07.2-.04.38-.1.57-.14 2.21.39 3.96 2.02 4.43 4.2.02.09.04.18.06.27H7.07zm7.65-8.45c-1.32-.82-3.08-.82-4.4 0-1.09.68-1.77 1.89-1.77 3.17 0 .19.03.37.07.55.3-.23.64-.42 1-.57.88-.36 1.86-.56 2.89-.56s2.01.2 2.89.56c.36.15.7.34 1 .57.04-.18.07-.36.07-.55 0-1.28-.68-2.49-1.77-3.17z"
            fill={color}
        />
    </Svg>
  );
}; 