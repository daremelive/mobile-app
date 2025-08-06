import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { authApi } from './authApi';
import { streamsApi } from './streamsApi';
import { followApi } from './followApi';
import { usersApi } from './usersApi';
import { notificationApi } from '../api/notificationApi';
import { blockedApi } from '../api/blockedApi';
import { levelsApi } from '../api/levelsApi';
import { walletApi } from '../api/walletApi';
import authReducer from './authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [streamsApi.reducerPath]: streamsApi.reducer,
    [followApi.reducerPath]: followApi.reducer,
    [usersApi.reducerPath]: usersApi.reducer,
    [notificationApi.reducerPath]: notificationApi.reducer,
    [blockedApi.reducerPath]: blockedApi.reducer,
    [levelsApi.reducerPath]: levelsApi.reducer,
    [walletApi.reducerPath]: walletApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          // RTK Query actions
          'persist/PERSIST',
          'persist/REHYDRATE',
        ],
        ignoredActionPaths: [
          'meta.arg', 
          'payload.timestamp',
          'meta.baseQueryMeta',
        ],
        ignoredPaths: [
          // Ignore RTK Query cache paths
          'authApi.mutations',
          'authApi.queries',
          'streamsApi.mutations', 
          'streamsApi.queries',
          'followApi.mutations',
          'followApi.queries',
          'usersApi.mutations',
          'usersApi.queries',
          'notificationApi.mutations',
          'notificationApi.queries',
          'blockedApi.mutations',
          'blockedApi.queries',
          'levelsApi.mutations',
          'levelsApi.queries',
          'walletApi.mutations',
          'walletApi.queries',
        ],
      },
    }).concat(authApi.middleware, streamsApi.middleware, followApi.middleware, usersApi.middleware, notificationApi.middleware, blockedApi.middleware, levelsApi.middleware, walletApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 