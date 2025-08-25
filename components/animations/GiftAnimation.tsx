import React, { useEffect, useState } from 'react';
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
  withRepeat,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface GiftAnimationProps {
  gift: {
    id: number;
    name: string;
    icon_url?: string | null;
    icon?: string | null;
    cost: number;
  };
  sender: {
    username: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    profile_picture_url?: string;
  };
  onAnimationComplete: () => void;
  animationKey: string;
}

export const GiftAnimation: React.FC<GiftAnimationProps> = ({
  gift,
  sender,
  onAnimationComplete,
  animationKey,
}) => {
  // Main container animations
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);
  const translateX = useSharedValue(screenWidth / 2);
  const translateY = useSharedValue(screenHeight);
  const rotateZ = useSharedValue(0);
  
  // Text animations
  const textOpacity = useSharedValue(0);
  const textScale = useSharedValue(0.5);
  const textTranslateY = useSharedValue(30);
  
  // Gift icon animations
  const giftScale = useSharedValue(0);
  const giftRotate = useSharedValue(0);
  const giftGlow = useSharedValue(0);
  
  // Explosion effects
  const explosionScale = useSharedValue(0);
  const explosionOpacity = useSharedValue(0);
  
  // Confetti animations
  const confettiOpacity = useSharedValue(0);
  const confettiScale = useSharedValue(0);
  
  // Heart burst animation
  const heartBurstScale = useSharedValue(0);
  const heartBurstOpacity = useSharedValue(0);

  // Get display name - prioritize first name + last name, fallback to full_name, then username
  const getDisplayName = () => {
    if (sender.first_name && sender.last_name) {
      return `${sender.first_name} ${sender.last_name}`;
    }
    return sender.full_name || sender.username;
  };

  useEffect(() => {
    // Reset all animations
    opacity.value = 0;
    scale.value = 0;
    translateX.value = Math.random() * (screenWidth - 200) + 100;
    translateY.value = screenHeight + 100;
    rotateZ.value = 0;
    textOpacity.value = 0;
    textScale.value = 0.5;
    textTranslateY.value = 30;
    giftScale.value = 0;
    giftRotate.value = 0;
    giftGlow.value = 0;
    explosionScale.value = 0;
    explosionOpacity.value = 0;
    confettiOpacity.value = 0;
    confettiScale.value = 0;
    heartBurstScale.value = 0;
    heartBurstOpacity.value = 0;

    const startAnimation = () => {
      // Phase 1: Dramatic entrance (0-800ms)
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSequence(
        withTiming(1.5, { duration: 400, easing: Easing.out(Easing.back(2)) }),
        withSpring(1, { damping: 8, stiffness: 100 })
      );
      translateY.value = withTiming(screenHeight * 0.35, { 
        duration: 800, 
        easing: Easing.out(Easing.cubic) 
      });
      
      // Phase 2: Gift icon spectacular entrance (200-1000ms)
      giftScale.value = withDelay(200, withSequence(
        withTiming(1.8, { duration: 300, easing: Easing.out(Easing.back(3)) }),
        withSpring(1, { damping: 6, stiffness: 120 })
      ));
      
      giftRotate.value = withDelay(200, withSequence(
        withTiming(360, { duration: 600, easing: Easing.out(Easing.cubic) }),
        withRepeat(
          withTiming(720, { duration: 2000, easing: Easing.linear }),
          -1,
          false
        )
      ));
      
      // Phase 3: Magical glow effect (400-2000ms)
      giftGlow.value = withDelay(400, withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      ));
      
      // Phase 4: Explosion effect (600ms)
      explosionScale.value = withDelay(600, withSequence(
        withTiming(0.8, { duration: 200 }),
        withTiming(1.5, { duration: 300, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 400 })
      ));
      explosionOpacity.value = withDelay(600, withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 600 })
      ));
      
      // Phase 5: Text revelation with elegance (800-1400ms)
      textOpacity.value = withDelay(800, withTiming(1, { duration: 600 }));
      textScale.value = withDelay(800, withSpring(1.1, { damping: 8, stiffness: 100 }));
      textTranslateY.value = withDelay(800, withSpring(0, { damping: 10, stiffness: 120 }));
      
      // Phase 6: Heart burst effect (1000ms)
      heartBurstScale.value = withDelay(1000, withSequence(
        withTiming(1.2, { duration: 400, easing: Easing.out(Easing.back(2)) }),
        withTiming(0, { duration: 600 })
      ));
      heartBurstOpacity.value = withDelay(1000, withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0, { duration: 800 })
      ));
      
      // Phase 7: Confetti celebration (1200-2800ms)
      confettiOpacity.value = withDelay(1200, withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0, { duration: 1300 })
      ));
      confettiScale.value = withDelay(1200, withSequence(
        withSpring(1, { damping: 6, stiffness: 100 }),
        withTiming(1.5, { duration: 1000 }),
        withTiming(0, { duration: 600 })
      ));
      
      // Phase 8: Floating and final display (1500-4000ms)
      translateY.value = withDelay(1500, withTiming(screenHeight * 0.15, { 
        duration: 1000, 
        easing: Easing.inOut(Easing.cubic) 
      }));
      
      // Phase 9: Graceful exit (3500-4500ms)
      setTimeout(() => {
        textOpacity.value = withTiming(0, { duration: 500 });
        giftGlow.value = 0;
        cancelAnimation(giftRotate);
        
        setTimeout(() => {
          scale.value = withTiming(0.8, { duration: 600 });
          opacity.value = withTiming(0, { duration: 800 }, () => {
            runOnJS(onAnimationComplete)();
          });
        }, 500);
      }, 3500);
    };

    startAnimation();
  }, [animationKey]);

  // Animated styles
  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotateZ: `${rotateZ.value}deg` },
    ],
  }));

  const giftIconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: giftScale.value },
      { rotateZ: `${giftRotate.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: giftGlow.value,
    transform: [{ scale: 1 + giftGlow.value * 0.3 }],
  }));

  const explosionStyle = useAnimatedStyle(() => ({
    opacity: explosionOpacity.value,
    transform: [{ scale: explosionScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [
      { scale: textScale.value },
      { translateY: textTranslateY.value },
    ],
  }));

  const confettiStyle = useAnimatedStyle(() => ({
    opacity: confettiOpacity.value,
    transform: [{ scale: confettiScale.value }],
  }));

  const heartBurstStyle = useAnimatedStyle(() => ({
    opacity: heartBurstOpacity.value,
    transform: [{ scale: heartBurstScale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          zIndex: 1000,
          alignItems: 'center',
        },
        containerStyle,
      ]}
      pointerEvents="none"
    >
      {/* Explosion Effect Background */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 200,
            height: 200,
            borderRadius: 100,
            backgroundColor: 'rgba(255, 215, 0, 0.3)',
          },
          explosionStyle,
        ]}
      />

      {/* Main Gift Container */}
      <View style={{ alignItems: 'center' }}>
        {/* Glow Effect */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: 'rgba(255, 215, 0, 0.6)',
              shadowColor: '#FFD700',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1,
              shadowRadius: 25,
              elevation: 20,
            },
            glowStyle,
          ]}
        />

        {/* Gift Icon Container */}
        <Animated.View style={giftIconStyle}>
          <LinearGradient
            colors={['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 15,
            }}
          >
            <View
              style={{
                width: 90,
                height: 90,
                borderRadius: 45,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {gift.icon_url ? (
                <Image 
                  source={{ uri: gift.icon_url }}
                  style={{ width: 50, height: 50 }}
                  resizeMode="contain"
                />
              ) : (
                <Text style={{ fontSize: 40 }}>
                  {gift.icon || '🎁'}
                </Text>
              )}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Text Information */}
        <Animated.View
          style={[
            {
              marginTop: 16,
              alignItems: 'center',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 25,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              borderWidth: 2,
              borderColor: 'rgba(255, 215, 0, 0.6)',
            },
            textStyle,
          ]}
        >
          <Text style={{ 
            color: '#FFD700', 
            fontSize: 18, 
            fontWeight: 'bold',
            textAlign: 'center',
            textShadowColor: 'rgba(0, 0, 0, 0.8)',
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 3,
          }}>
            🎉 {getDisplayName()} 🎉
          </Text>
          <Text style={{ 
            color: '#FFFFFF', 
            fontSize: 14, 
            fontWeight: '600',
            textAlign: 'center',
            marginTop: 4,
          }}>
            sent {gift.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            <Text style={{ fontSize: 16 }}>💎</Text>
            <Text style={{ 
              color: '#4ECDC4', 
              fontSize: 16, 
              fontWeight: 'bold',
              marginLeft: 4,
            }}>
              {gift.cost} coins
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* Heart Burst Effect */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            alignItems: 'center',
            justifyContent: 'center',
          },
          heartBurstStyle,
        ]}
      >
        {[...Array(8)].map((_, index) => (
          <HeartParticle key={index} angle={index * 45} delay={index * 50} />
        ))}
      </Animated.View>

      {/* Confetti Effect */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 300,
            height: 300,
            alignItems: 'center',
            justifyContent: 'center',
          },
          confettiStyle,
        ]}
      >
        {[...Array(20)].map((_, index) => (
          <ConfettiParticle 
            key={index} 
            delay={index * 80} 
            angle={Math.random() * 360}
            distance={80 + Math.random() * 100}
          />
        ))}
      </Animated.View>

      {/* Sparkle Effects */}
      {[...Array(12)].map((_, index) => (
        <SparkleEffect 
          key={index} 
          delay={index * 150} 
          radius={60 + Math.random() * 40}
          angle={index * 30}
        />
      ))}
    </Animated.View>
  );
};

// Heart particle component for heart burst effect
const HeartParticle: React.FC<{ angle: number; delay: number }> = ({ angle, delay }) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    const distance = 60;
    const radians = (angle * Math.PI) / 180;
    
    opacity.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(0, { duration: 800 })
    ));
    
    scale.value = withDelay(delay, withSequence(
      withSpring(1, { damping: 8 }),
      withTiming(0.5, { duration: 800 })
    ));
    
    translateX.value = withDelay(delay, withTiming(
      Math.cos(radians) * distance, 
      { duration: 1000, easing: Easing.out(Easing.cubic) }
    ));
    
    translateY.value = withDelay(delay, withTiming(
      Math.sin(radians) * distance, 
      { duration: 1000, easing: Easing.out(Easing.cubic) }
    ));
  }, [angle, delay]);

  const heartStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[{ position: 'absolute' }, heartStyle]}>
      <Text style={{ fontSize: 20, color: '#FF6B6B' }}>❤️</Text>
    </Animated.View>
  );
};

// Confetti particle component
const ConfettiParticle: React.FC<{ delay: number; angle: number; distance: number }> = ({ 
  delay, angle, distance 
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(0);

  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
  const confettiColor = colors[Math.floor(Math.random() * colors.length)];
  const confettiShape = Math.random() > 0.5 ? '■' : '●';

  useEffect(() => {
    const radians = (angle * Math.PI) / 180;
    
    opacity.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(0, { duration: 1000 })
    ));
    
    scale.value = withDelay(delay, withSequence(
      withSpring(1, { damping: 6 }),
      withTiming(0, { duration: 1000 })
    ));
    
    translateX.value = withDelay(delay, withTiming(
      Math.cos(radians) * distance, 
      { duration: 1200, easing: Easing.out(Easing.cubic) }
    ));
    
    translateY.value = withDelay(delay, withTiming(
      Math.sin(radians) * distance + 100, 
      { duration: 1200, easing: Easing.out(Easing.cubic) }
    ));
    
    rotate.value = withDelay(delay, withTiming(
      720, 
      { duration: 1200, easing: Easing.out(Easing.cubic) }
    ));
  }, [delay, angle, distance]);

  const confettiStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotateZ: `${rotate.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[{ position: 'absolute' }, confettiStyle]}>
      <Text style={{ fontSize: 12, color: confettiColor }}>{confettiShape}</Text>
    </Animated.View>
  );
};

// Enhanced sparkle effect
const SparkleEffect: React.FC<{ delay: number; radius: number; angle: number }> = ({ 
  delay, radius, angle 
}) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);
  const rotate = useSharedValue(0);

  const radians = (angle * Math.PI) / 180;
  const positionX = Math.cos(radians) * radius;
  const positionY = Math.sin(radians) * radius;

  useEffect(() => {
    const animate = () => {
      opacity.value = withDelay(delay, withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0, { duration: 700 })
      ));
      
      scale.value = withDelay(delay, withSequence(
        withSpring(1.5, { damping: 6 }),
        withTiming(0, { duration: 700 })
      ));
      
      rotate.value = withDelay(delay, withTiming(
        360, 
        { duration: 1000, easing: Easing.linear }
      ));
    };

    animate();
  }, [delay]);

  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { rotateZ: `${rotate.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: positionX,
          top: positionY,
        },
        sparkleStyle,
      ]}
    >
      <Text style={{ fontSize: 18, color: '#FFD700' }}>✨</Text>
    </Animated.View>
  );
};

export default GiftAnimation;
