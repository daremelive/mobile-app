// Gift Animation Types
export interface Gift {
  id: number;
  name: string;
  icon_url?: string | null;
  icon?: string | null;
  cost: number;
}

export interface GiftSender {
  username: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  profile_picture_url?: string;
}

export interface GiftAnimationProps {
  gift: Gift;
  sender: GiftSender;
  onAnimationComplete: () => void;
  animationKey: string;
}

// Particle Animation Props
export interface HeartParticleProps {
  angle: number;
  delay: number;
}

export interface ConfettiParticleProps {
  delay: number;
  angle: number;
  distance: number;
}

export interface SparkleEffectProps {
  delay: number;
  radius: number;
  angle: number;
}