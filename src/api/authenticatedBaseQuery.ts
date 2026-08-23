import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';

import { API_ROOT } from '../config/env';
import { logout, updateTokens } from '../store/authSlice';
import type { RootState } from '../store';

interface RefreshedTokens {
  access: string;
  refresh?: string;
}

let refreshPromise: Promise<RefreshedTokens | null> | null = null;

export const refreshSessionTokens = async (
  refreshToken: string,
): Promise<RefreshedTokens | null> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_ROOT}/auth/token/refresh/`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ refresh: refreshToken }),
        });
        if (!response.ok) return null;

        const data = await response.json() as RefreshedTokens;
        if (!data.access) return null;

        const nextRefresh = data.refresh ?? refreshToken;
        await Promise.all([
          SecureStore.setItemAsync('accessToken', data.access),
          SecureStore.setItemAsync('refreshToken', nextRefresh),
        ]);
        return { access: data.access, refresh: nextRefresh };
      } catch {
        return null;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

const isRefreshRequest = (args: string | FetchArgs): boolean => {
  const url = typeof args === 'string' ? args : args.url;
  return url.includes('/auth/token/refresh/');
};

/**
 * Creates an RTK Query base query with one shared, concurrency-safe JWT refresh.
 * All API slices use the Redux token so a refreshed token is used immediately
 * when the original request is retried.
 */
export const createAuthenticatedBaseQuery = (
  baseUrl: string = API_ROOT,
  timeout = 15_000,
): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> => {
  const query = fetchBaseQuery({
    baseUrl,
    timeout,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.accessToken;
      if (token) headers.set('authorization', `Bearer ${token}`);
      return headers;
    },
  });

  return async (args, api, extraOptions) => {
    let result = await query(args, api, extraOptions);

    if (result.error?.status !== 401 || isRefreshRequest(args)) {
      return result;
    }

    const refreshToken = (api.getState() as RootState).auth.refreshToken;
    if (!refreshToken) {
      api.dispatch(logout());
      return result;
    }

    const refreshed = await refreshSessionTokens(refreshToken);
    if (!refreshed) {
      api.dispatch(logout());
      return result;
    }

    api.dispatch(updateTokens({
      access: refreshed.access,
      refresh: refreshed.refresh ?? refreshToken,
    }));
    result = await query(args, api, extraOptions);
    return result;
  };
};
