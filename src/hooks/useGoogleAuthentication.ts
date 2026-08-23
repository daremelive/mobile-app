import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { exchangeCodeAsync, makeRedirectUri, ResponseType } from 'expo-auth-session';
import { useDispatch } from 'react-redux';
import { useGoogleAuthMutation } from '../store/authApi';
import { setCredentials } from '../store/authSlice';
import { API_BASE_URL } from '../config/env';
import { markAccountCreated } from './useAuthRouting';
import { logger } from '../utils/logger';

WebBrowser.maybeCompleteAuthSession();

type GoogleFlow = 'signin' | 'signup';

const nativeRedirectFor = (clientId: string): string | undefined => clientId
  ? `com.googleusercontent.apps.${clientId.replace('.apps.googleusercontent.com', '')}:/oauthredirect`
  : undefined;

export const useGoogleAuthentication = (flow: GoogleFlow) => {
  const dispatch = useDispatch();
  const [authenticate, { isLoading }] = useGoogleAuthMutation();
  const legacyManifest = Constants.manifest as { extra?: Record<string, string> } | null;
  const extra = (Constants.expoConfig?.extra ?? legacyManifest?.extra ?? {}) as Record<string, string>;
  const webClientId = extra.GOOGLE_CLIENT_ID || extra.googleClientId || '';
  const iosClientId = extra.GOOGLE_IOS_CLIENT_ID || extra.googleIosClientId || '';
  const androidClientId = extra.GOOGLE_ANDROID_CLIENT_ID || extra.googleAndroidClientId || '';
  const platformClientId = Platform.select({
    ios: iosClientId,
    android: androidClientId,
    default: webClientId,
  }) || '';
  const scheme = Array.isArray(Constants.expoConfig?.scheme)
    ? Constants.expoConfig.scheme[0]
    : Constants.expoConfig?.scheme || 'mobile';
  const redirectUri = makeRedirectUri({
    native: Platform.select({
      ios: nativeRedirectFor(iosClientId),
      android: nativeRedirectFor(androidClientId),
      default: undefined,
    }),
    scheme,
  });

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: platformClientId,
    iosClientId,
    androidClientId,
    scopes: ['openid', 'profile', 'email'],
    responseType: ResponseType.Code,
    usePKCE: true,
    redirectUri,
    extraParams: { include_granted_scopes: 'true' },
  });

  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);

  useEffect(() => {
    if (response?.type !== 'success') return;

    const completeAuthentication = async () => {
      try {
        const responseData = response as typeof response & {
          params?: { id_token?: string; code?: string };
          authentication?: { idToken?: string };
        };
        let idToken = responseData.params?.id_token || responseData.authentication?.idToken;
        const code = responseData.params?.code;

        if (!idToken && code) {
          const tokenResponse = await exchangeCodeAsync(
            {
              clientId: platformClientId,
              code,
              redirectUri,
              extraParams: { code_verifier: request?.codeVerifier || '' },
            },
            { tokenEndpoint: 'https://oauth2.googleapis.com/token' },
          );
          idToken = tokenResponse.idToken;
        }

        if (!idToken) throw new Error('Google did not return an identity token');

        const result = await authenticate({ id_token: idToken }).unwrap();
        dispatch(setCredentials(result));
        await markAccountCreated();
        router.replace(result.user.profile_completed ? '/(tabs)/home' : '/(auth)/signup-two');
      } catch (cause: any) {
        logger.error(`Google ${flow} failed`, cause);
        let message = cause?.data?.message
          || cause?.data?.error
          || cause?.data?.detail
          || 'Google authentication failed';

        if (cause?.status === 'TIMEOUT_ERROR' || cause?.name === 'AbortError') {
          message = 'The connection timed out. Check your network and try again.';
        } else if (cause?.status === 'FETCH_ERROR') {
          message = `The server at ${API_BASE_URL} could not be reached.`;
        }
        Alert.alert('Google Sign-In', message);
      }
    };

    void completeAuthentication();
  }, [authenticate, dispatch, flow, platformClientId, redirectUri, request?.codeVerifier, response]);

  return {
    isConfigured: platformClientId.length > 0,
    isLoading,
    isReady: Boolean(request),
    start: promptAsync,
  };
};
