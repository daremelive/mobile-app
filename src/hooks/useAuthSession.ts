import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import * as SecureStore from 'expo-secure-store';
import { restoreSession, logout } from '../store/authSlice';
import type { User } from '../store/authApi';

export const useAuthSession = () => {
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    const restoreAuthSession = async () => {
      try {
        const [accessToken, refreshToken, userDataString] = await Promise.all([
          SecureStore.getItemAsync('accessToken'),
          SecureStore.getItemAsync('refreshToken'),
          SecureStore.getItemAsync('user'),
        ]);

        if (accessToken && refreshToken && userDataString) {
          const userData: User = JSON.parse(userDataString);
          
          // Check if tokens are still valid (basic check)
          // In a real app, you might want to validate with the server
          dispatch(restoreSession({
            accessToken,
            refreshToken,
            user: userData,
          }));
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
        // Clear potentially corrupted data
        dispatch(logout());
      } finally {
        setIsLoading(false);
      }
    };

    restoreAuthSession();
  }, [dispatch]);

  return { isLoading };
}; 