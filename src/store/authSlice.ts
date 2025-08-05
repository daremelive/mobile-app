import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import { User, AuthResponse } from './authApi';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  pendingEmail: string | null; // For OTP verification flow
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  pendingEmail: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<AuthResponse>) => {
      const { access, refresh, user } = action.payload;
      state.user = user;
      state.accessToken = access;
      state.refreshToken = refresh;
      state.isAuthenticated = true;
      state.error = null;
      
      // Store tokens securely
      SecureStore.setItemAsync('accessToken', access);
      SecureStore.setItemAsync('refreshToken', refresh);
      SecureStore.setItemAsync('user', JSON.stringify(user));
    },
    
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      // Update stored user data
      SecureStore.setItemAsync('user', JSON.stringify(action.payload));
    },
    
    updateAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
      SecureStore.setItemAsync('accessToken', action.payload);
    },
    
    setPendingEmail: (state, action: PayloadAction<string>) => {
      state.pendingEmail = action.payload;
    },
    
    clearPendingEmail: (state) => {
      state.pendingEmail = null;
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
      state.pendingEmail = null;
      
      // Clear stored data
      SecureStore.deleteItemAsync('accessToken');
      SecureStore.deleteItemAsync('refreshToken');
      SecureStore.deleteItemAsync('user');
    },
    
    restoreSession: (state, action: PayloadAction<{ 
      accessToken: string; 
      refreshToken: string; 
      user: User 
    }>) => {
      const { accessToken, refreshToken, user } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;
    },
  },
});

export const {
  setCredentials,
  setUser,
  updateAccessToken,
  setPendingEmail,
  clearPendingEmail,
  setLoading,
  setError,
  logout,
  restoreSession,
} = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectAccessToken = (state: { auth: AuthState }) => state.auth.accessToken;
export const selectRefreshToken = (state: { auth: AuthState }) => state.auth.refreshToken;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectPendingEmail = (state: { auth: AuthState }) => state.auth.pendingEmail; 