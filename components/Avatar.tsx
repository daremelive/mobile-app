import React from 'react';
import { Image } from 'react-native';

export function Avatar({ size = 48, name = 'D' }: { size?: number; name?: string }) {
  const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=FF4D67&color=fff&size=${size * 2}`;
  
  return (
    <Image
      source={{ uri: url }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
      }}
    />
  );
} 