import React from 'react';
import { View, Text, Image } from 'react-native';

interface ProfileAvatarProps {
  profilePictureUrl?: string | null;
  username?: string;
  firstName?: string;
  lastName?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge' | 'full';
  className?: string;
  baseURL?: string;
}

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  profilePictureUrl,
  username = '',
  firstName = '',
  lastName = '',
  size = 'medium',
  className = '',
  baseURL = ''
}) => {
  // Check if we have a valid profile picture
  const hasValidProfilePicture = profilePictureUrl && profilePictureUrl.trim() !== '';
  
  // Build image URL
  const imageUrl = hasValidProfilePicture 
    ? (profilePictureUrl!.startsWith('http') 
        ? profilePictureUrl 
        : `${baseURL}${profilePictureUrl}`)
    : null;

  // Generate beautiful fallback avatar URL (similar to ui-avatars but with brand colors)
  const getFallbackAvatarUrl = () => {
    const name = encodeURIComponent(
      `${firstName || ''} ${lastName || ''}`.trim() || username || 'User'
    );
    
    // Use brand red color #C42720 for consistency
    return `https://ui-avatars.com/api/?name=${name}&background=C42720&color=fff&size=400&font-size=0.4&bold=true`;
  };

  const finalImageUrl = imageUrl || getFallbackAvatarUrl();

  // Get container classes based on size
  const getContainerClasses = () => {
    switch (size) {
      case 'small':
        return 'w-10 h-10 rounded-full';
      case 'medium':
        return 'w-16 h-16 rounded-full';
      case 'large':
        return 'w-24 h-24 rounded-full';
      case 'xlarge':
        return 'w-32 h-32 rounded-full';
      case 'full':
        return 'w-full h-full rounded-none';
      default:
        return 'w-16 h-16 rounded-full';
    }
  };

  return (
    <View className={`${getContainerClasses()} overflow-hidden ${className}`}>
      <Image
        source={{ uri: finalImageUrl }}
        className="w-full h-full"
        style={{ borderRadius: size === 'full' ? 0 : 999 }}
      />
    </View>
  );
};

export default ProfileAvatar;
