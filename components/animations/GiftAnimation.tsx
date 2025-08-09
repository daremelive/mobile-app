import React, { useEffect } from 'react';
import { View, Text, Image, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface GiftAnimationProps {
  gift: {
    id: number;
    name: string;
    icon_url?: string;
    icon?: string;
    cost: number;
  };
  sender: {
    username: string;
    full_name?: string;
    profile_picture_url?: string;
  };
  onAnimationComplete: () => void;
  animationKey: string; // Unique key to trigger new animations
}

export const GiftAnimation: React.FC<GiftAnimationProps> = ({
  gift,
  sender,
  onAnimationComplete,
  animationKey,
}) => {
  // Animation values
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.3);
  const translateX = useSharedValue(-50);
  const translateY = useSharedValue(screenHeight);
  const rotateZ = useSharedValue(0);
  
  // Text animation values
  const textOpacity = useSharedValue(0);
  const textScale = useSharedValue(0.8);
  const textTranslateY = useSharedValue(20);

  useEffect(() => {
    // Reset all values when new animation starts
    opacity.value = 0;
    scale.value = 0.3;
    translateX.value = Math.random() * (screenWidth - 120) + 60; // Random X position
    translateY.value = screenHeight;
    rotateZ.value = 0;
    textOpacity.value = 0;
    textScale.value = 0.8;
    textTranslateY.value = 20;

    // Start the animation sequence
    const startAnimation = () => {
      // Phase 1: Entrance animation (TikTok style)
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1.2, { damping: 8, stiffness: 100 });
      translateY.value = withTiming(screenHeight * 0.3, { duration: 800 });
      
      // Add some rotation for fun
      rotateZ.value = withSequence(
        withTiming(15, { duration: 400 }),
        withTiming(-10, { duration: 400 }),
        withTiming(0, { duration: 400 })
      );

      // Phase 2: Text animation (delayed)
      textOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
      textScale.value = withDelay(500, withSpring(1, { damping: 10, stiffness: 100 }));
      textTranslateY.value = withDelay(500, withTiming(0, { duration: 400 }));

      // Phase 3: Float and fade out
      setTimeout(() => {
        // Scale down slightly while floating up
        scale.value = withTiming(0.9, { duration: 1000 });
        translateY.value = withTiming(screenHeight * 0.1, { duration: 1500 });
        
        // Fade out text first
        textOpacity.value = withTiming(0, { duration: 500 });
        
        // Then fade out the gift
        setTimeout(() => {
          opacity.value = withTiming(0, { duration: 800 }, () => {
            runOnJS(onAnimationComplete)();
          });
        }, 1500);
      }, 2000);
    };

    startAnimation();
  }, [animationKey]);

  const giftAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
        { rotateZ: `${rotateZ.value}deg` },
      ],
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: textOpacity.value,
      transform: [
        { scale: textScale.value },
        { translateY: textTranslateY.value },
      ],
    };
  });

  const containerAnimatedStyle = useAnimatedStyle(() => {
    const floatOffset = interpolate(
      translateY.value,
      [screenHeight * 0.1, screenHeight * 0.3],
      [-10, 10],
      Extrapolation.CLAMP
    );
    
    return {
      transform: [
        { translateY: Math.sin(Date.now() * 0.001) * floatOffset },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          zIndex: 1000,
          alignItems: 'center',
        },
        giftAnimatedStyle,
      ]}
      pointerEvents="none"
    >
      <Animated.View style={containerAnimatedStyle}>
        {/* Gift Icon with Glow Effect */}
        <View
          style={{
            shadowColor: '#FFD700',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          <View className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-pink-500 rounded-full items-center justify-center border-2 border-white/30">
            {gift.icon_url ? (
              <Image 
                source={{ uri: gift.icon_url }}
                style={{ width: 40, height: 40 }}
                resizeMode="contain"
                onError={(e) => {
                  console.log('🎁 Gift animation icon load error:', gift.icon_url, e.nativeEvent.error);
                }}
                onLoad={() => {
                  console.log('🎁 Gift animation icon loaded successfully:', gift.icon_url);
                }}
              />
            ) : (
              <Text style={{ fontSize: 32 }}>{gift.icon || '🎁'}</Text>
            )}
          </View>
        </View>

        {/* Gift Info Text */}
        <Animated.View
          style={[
            {
              marginTop: 8,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              minWidth: 120,
              alignItems: 'center',
            },
            textAnimatedStyle,
          ]}
        >
          <Text className="text-white text-sm font-bold text-center">
            {sender.full_name || sender.username}
          </Text>
          <Text className="text-yellow-400 text-xs font-medium text-center">
            sent {gift.name}
          </Text>
          <View className="flex-row items-center mt-1">
            <Text className="text-blue-400 text-xs">💎</Text>
            <Text className="text-white text-xs font-semibold ml-1">
              {gift.cost}
            </Text>
          </View>
        </Animated.View>

        {/* Sparkle Effects */}
        {[...Array(6)].map((_, index) => (
          <SparkleEffect key={index} delay={index * 200} />
        ))}
      </Animated.View>
    </Animated.View>
  );
};

// Sparkle effect component
const SparkleEffect: React.FC<{ delay: number }> = ({ delay }) => {
  const sparkleOpacity = useSharedValue(0);
  const sparkleScale = useSharedValue(0);
  const sparkleRotate = useSharedValue(0);

  useEffect(() => {
    const animate = () => {
      sparkleOpacity.value = withDelay(
        delay,
        withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(0, { duration: 700 })
        )
      );
      sparkleScale.value = withDelay(
        delay,
        withSequence(
          withSpring(1, { damping: 10 }),
          withTiming(0.5, { duration: 700 })
        )
      );
      sparkleRotate.value = withDelay(
        delay,
        withTiming(360, { duration: 1000 })
      );
    };

    animate();
    const interval = setInterval(animate, 3000);
    return () => clearInterval(interval);
  }, [delay]);

  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: sparkleOpacity.value,
    transform: [
      { scale: sparkleScale.value },
      { rotate: `${sparkleRotate.value}deg` },
    ],
  }));

  const randomPosition = {
    top: Math.random() * 100 - 50,
    left: Math.random() * 100 - 50,
  };

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          ...randomPosition,
        },
        sparkleStyle,
      ]}
    >
      <Text style={{ fontSize: 16, color: '#FFD700' }}>✨</Text>
    </Animated.View>
  );
};

export default GiftAnimation;
