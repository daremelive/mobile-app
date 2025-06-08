import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface EditIconProps {
  size?: number;
  color?: string;
  backgroundColor?: string;
}

export const EditIcon: React.FC<EditIconProps> = ({ size = 24, color = '#000', backgroundColor = 'gray' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill={backgroundColor} />
      <Path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill={color} />
    </Svg>
  );
}; 