import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import VerificationCodeScreen from '../../components/auth/VerificationCodeScreen';
import { useResendOTPMutation, useVerifyOTPMutation } from '../../src/store/authApi';
import {
  clearPendingEmail,
  selectPendingEmail,
  setCredentials,
} from '../../src/store/authSlice';
import { logger } from '../../src/utils/logger';

export default function VerifyScreen() {
  const dispatch = useDispatch();
  const storedEmail = useSelector(selectPendingEmail);
  // Hold on to the address this screen opened with. Someone reading a code out
  // of their inbox may be away for a minute, and the screen must not vanish
  // underneath them if the store changes while they are gone.
  const [pendingEmail] = useState(storedEmail);
  const [error, setError] = useState('');
  const [resetKey, setResetKey] = useState(0);
  const [verifyOTP, { isLoading: isVerifying }] = useVerifyOTPMutation();
  const [resendOTP, { isLoading: isResending }] = useResendOTPMutation();

  useEffect(() => {
    // Only leave if we arrived with nothing to verify in the first place.
    if (!pendingEmail) router.replace('/(auth)/signup');
  }, [pendingEmail]);

  const handleVerify = async (code: string) => {
    if (!pendingEmail) return;

    try {
      const result = await verifyOTP({ email: pendingEmail, otp: code, purpose: 'signup' }).unwrap();
      dispatch(setCredentials(result));
      dispatch(clearPendingEmail());
      router.replace('/(auth)/signup-two');
    } catch (cause: any) {
      logger.error('OTP verification failed', cause);
      setError(
        cause.data?.otp?.[0]
          ?? cause.data?.non_field_errors?.[0]
          ?? 'Invalid code. Please try again.',
      );
    }
  };

  const handleResend = async () => {
    if (!pendingEmail) return;

    try {
      await resendOTP({ email: pendingEmail, purpose: 'signup' }).unwrap();
      setError('');
      setResetKey((current) => current + 1);
      Alert.alert('Code sent', 'A new verification code was sent to your email.');
    } catch (cause) {
      logger.error('OTP resend failed', cause);
      Alert.alert('Could not resend code', 'Please check your connection and try again.');
    }
  };

  return (
    <VerificationCodeScreen
      description={`Enter the 6-digit code sent to ${pendingEmail || 'your email'} to verify your account.`}
      error={error}
      isVerifying={isVerifying}
      isResending={isResending}
      resetKey={resetKey}
      onVerify={handleVerify}
      onResend={handleResend}
      onClearError={() => setError('')}
    />
  );
}
