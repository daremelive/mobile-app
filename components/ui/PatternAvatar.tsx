import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Rect, Circle, Polygon, Path } from 'react-native-svg';

interface PatternAvatarProps {
  username?: string;
  firstName?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge' | 'full';
  className?: string;
}

const PatternAvatar: React.FC<PatternAvatarProps> = ({
  username = '',
  firstName = '',
  size = 'medium',
  className = ''
}) => {
  // Get size dimensions
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return { container: 'w-10 h-10', svgSize: 40, text: 'text-xs' };
      case 'medium':
        return { container: 'w-16 h-16', svgSize: 64, text: 'text-sm' };
      case 'large':
        return { container: 'w-24 h-24', svgSize: 96, text: 'text-base' };
      case 'xlarge':
        return { container: 'w-32 h-32', svgSize: 128, text: 'text-lg' };
      case 'full':
        return { container: 'w-full h-full', svgSize: 200, text: 'text-2xl' };
      default:
        return { container: 'w-16 h-16', svgSize: 64, text: 'text-sm' };
    }
  };

  // Generate initials
  const getInitials = () => {
    if (firstName && firstName.length >= 2) {
      return firstName.substring(0, 2).toUpperCase();
    }
    if (username && username.length >= 2) {
      const clean = username.replace(/[^a-zA-Z0-9]/g, '');
      return clean.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Generate pattern based on username
  const generatePattern = () => {
    const text = username || firstName || 'user';
    const hash = text.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const colors = [
      '#667eea', '#764ba2', '#f093fb', '#f5576c',
      '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
      '#fa709a', '#fee140', '#ff9a9e', '#fecfef'
    ];
    
    const patterns = [
      'geometric', 'circles', 'triangles', 'waves'
    ];
    
    const colorIndex = Math.abs(hash) % colors.length;
    const patternIndex = Math.abs(hash >> 4) % patterns.length;
    
    return {
      primaryColor: colors[colorIndex],
      secondaryColor: colors[(colorIndex + 3) % colors.length],
      pattern: patterns[patternIndex]
    };
  };

  const sizeClasses = getSizeClasses();
  const initials = getInitials();
  const { primaryColor, secondaryColor, pattern } = generatePattern();

  const renderPattern = () => {
    const { svgSize } = sizeClasses;
    
    switch (pattern) {
      case 'geometric':
        return (
          <Svg width={svgSize} height={svgSize}>
            <Rect width={svgSize} height={svgSize} fill={primaryColor} />
            <Rect x={0} y={0} width={svgSize/2} height={svgSize/2} fill={secondaryColor} opacity={0.3} />
            <Rect x={svgSize/2} y={svgSize/2} width={svgSize/2} height={svgSize/2} fill={secondaryColor} opacity={0.3} />
          </Svg>
        );
        
      case 'circles':
        return (
          <Svg width={svgSize} height={svgSize}>
            <Rect width={svgSize} height={svgSize} fill={primaryColor} />
            <Circle cx={svgSize/4} cy={svgSize/4} r={svgSize/8} fill={secondaryColor} opacity={0.4} />
            <Circle cx={3*svgSize/4} cy={3*svgSize/4} r={svgSize/6} fill={secondaryColor} opacity={0.3} />
            <Circle cx={3*svgSize/4} cy={svgSize/4} r={svgSize/10} fill={secondaryColor} opacity={0.5} />
          </Svg>
        );
        
      case 'triangles':
        return (
          <Svg width={svgSize} height={svgSize}>
            <Rect width={svgSize} height={svgSize} fill={primaryColor} />
            <Polygon 
              points={`0,0 ${svgSize/2},0 ${svgSize/4},${svgSize/2}`}
              fill={secondaryColor} 
              opacity={0.3} 
            />
            <Polygon 
              points={`${svgSize},${svgSize} ${svgSize/2},${svgSize} ${3*svgSize/4},${svgSize/2}`}
              fill={secondaryColor} 
              opacity={0.4} 
            />
          </Svg>
        );
        
      case 'waves':
        return (
          <Svg width={svgSize} height={svgSize}>
            <Rect width={svgSize} height={svgSize} fill={primaryColor} />
            <Path 
              d={`M0,${svgSize/2} Q${svgSize/4},${svgSize/4} ${svgSize/2},${svgSize/2} T${svgSize},${svgSize/2} V${svgSize} H0 Z`}
              fill={secondaryColor} 
              opacity={0.3} 
            />
          </Svg>
        );
        
      default:
        return (
          <Svg width={svgSize} height={svgSize}>
            <Rect width={svgSize} height={svgSize} fill={primaryColor} />
          </Svg>
        );
    }
  };

  return (
    <View className={`${sizeClasses.container} ${size === 'full' ? 'rounded-none' : 'rounded-full'} overflow-hidden ${className}`}>
      <View className="relative w-full h-full">
        {renderPattern()}
        <View className="absolute inset-0 justify-center items-center">
          <Text 
            className={`${sizeClasses.text} font-bold text-white`}
            style={{ 
              textShadowColor: 'rgba(0,0,0,0.5)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 3,
            }}
          >
            {initials}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default PatternAvatar;
