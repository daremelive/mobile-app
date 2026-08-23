import * as SecureStore from 'expo-secure-store';

import { store } from '../store';
import { logout, updateTokens } from '../store/authSlice';
import { refreshSessionTokens } from './authenticatedBaseQuery';

const withToken = (options: RequestInit, token: string): RequestInit => ({
  ...options,
  headers: {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  },
});

/** Authenticated fetch for non-RTK integrations such as StoreKit listeners. */
export const authenticatedFetch = async (
  input: string,
  options: RequestInit = {},
): Promise<Response> => {
  const stateToken = store.getState().auth.accessToken;
  const accessToken = stateToken ?? await SecureStore.getItemAsync('accessToken');
  let response = await fetch(input, accessToken ? withToken(options, accessToken) : options);

  if (response.status !== 401) return response;

  const stateRefresh = store.getState().auth.refreshToken;
  const refreshToken = stateRefresh ?? await SecureStore.getItemAsync('refreshToken');
  if (!refreshToken) {
    // Only end a session that exists. Signup and password reset run with no
    // session at all, so a 401 there is expected rather than a sign-out.
    if (store.getState().auth.isAuthenticated) {
      store.dispatch(logout());
    }
    return response;
  }

  const refreshed = await refreshSessionTokens(refreshToken);
  if (!refreshed) {
    store.dispatch(logout());
    return response;
  }

  store.dispatch(updateTokens({
    access: refreshed.access,
    refresh: refreshed.refresh ?? refreshToken,
  }));
  response = await fetch(input, withToken(options, refreshed.access));
  return response;
};
