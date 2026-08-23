import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import VerificationCodeScreen from '../../components/auth/VerificationCodeScreen';
import { usePasswordResetVerifyMutation, useResendOTPMutation } from '../../src/store/authApi';
import { selectPendingEmail, setPendingResetToken } from '../../src/store/authSlice';
import { getErrorMessage } from '../../src/utils/errorMessage';
import { logger } from '../../src/utils/logger';

export default function VerifyForgotPasswordScreen() {
  const dispatch = useDispatch();
  const storedEmail = useSelector(selectPendingEmail);
  // Same reasoning as the signup verification screen: someone fetching a code
  // from their inbox must not lose this screen if the store changes meanwhile.
  const [pendingEmail] = useState(storedEmail);
  const [error, setError] = useState('');
  const [resetKey, setResetKey] = useState(0);
  const [passwordResetVerify, { isLoading: isVerifying }] = usePasswordResetVerifyMutation();
  const [resendOTP, { isLoading: isResending }] = useResendOTPMutation();

  useEffect(() => {
    // Only leave if we arrived with no address to verify.
    if (!pendingEmail) router.replace('/forgot-password');
  }, [pendingEmail]);

  const handleVerify = async (code: string) => {
    if (!pendingEmail) return;

    try {
      const { reset_token } = await passwordResetVerify({ email: pendingEmail, otp: code }).unwrap();
      dispatch(setPendingResetToken(reset_token));
      router.push('/reset-password');
    } catch (cause: any) {
      logger.error('Password reset code verification failed', cause);
      setError(getErrorMessage(cause));
      setResetKey((current) => current + 1);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail) return;

    try {
      await resendOTP({ email: pendingEmail, purpose: 'reset' }).unwrap();
      setError('');
      setResetKey((current) => current + 1);
      Alert.alert('Code sent', 'A new reset code was sent to your email.');
    } catch (cause) {
      logger.error('Password reset code resend failed', cause);
      Alert.alert('Could not resend code', getErrorMessage(cause));
    }
  };

  return (
    <VerificationCodeScreen
      description={`Enter the 6-digit code sent to ${pendingEmail || 'your email'} to reset your password.`}
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
