import React from 'react';
import { View, Text } from 'react-native';
import { useSelector } from 'react-redux';
import { Redirect } from 'expo-router';
import { selectIsAuthenticated, selectCurrentUser } from '../store/authSlice';
import { useAuthSession } from '../hooks/useAuthSession';

interface AuthGuardProps {
  children: React.ReactNode;
  requireProfileComplete?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requireProfileComplete = true 
}) => {
  const { isLoading } = useAuthSession();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);

  // Show loading screen while checking auth status
  if (isLoading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <Text className="text-white text-lg">Loading...</Text>
      </View>
    );
  }

  // Redirect to signin if not authenticated
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/signin" />;
  }

  // Redirect to profile completion if required and not completed
  if (requireProfileComplete && currentUser && !currentUser.profile_completed) {
    // Check if user has basic profile info but no interests (should go to signup-three)
    const hasBasicProfile = currentUser.username && currentUser.phone_number && 
                           currentUser.gender && currentUser.country && 
                           currentUser.has_accepted_terms;
    
    
    if (hasBasicProfile && !currentUser.interests) {
      return <Redirect href="/(auth)/signup-three" />;
    } else {
      return <Redirect href="/(auth)/signup-two" />;
    }
  }

  // Render protected content
  return <>{children}</>;
}; 