import { BRAND_GRADIENT } from '@/constants/Gradients';
import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import Mail from '../../assets/icons/mail.svg';

const CODE_LENGTH = 6;

interface VerificationCodeScreenProps {
  title?: string;
  description: string;
  error?: string;
  isVerifying?: boolean;
  isResending?: boolean;
  resetKey?: number;
  onVerify: (code: string) => void | Promise<void>;
  onResend?: () => void | Promise<void>;
  onClearError?: () => void;
}

export default function VerificationCodeScreen({
  title = 'Check Your Email',
  description,
  error = '',
  isVerifying = false,
  isResending = false,
  resetKey = 0,
  onVerify,
  onResend,
  onClearError,
}: VerificationCodeScreenProps) {
  const [code, setCode] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput | null>(null);
  const lastSubmittedCode = useRef('');

  useEffect(() => {
    setCode('');
    lastSubmittedCode.current = '';
    if (resetKey > 0) inputRef.current?.focus();
  }, [resetKey]);

  useEffect(() => {
    if (
      code.length === CODE_LENGTH &&
      code !== lastSubmittedCode.current &&
      !isVerifying
    ) {
      lastSubmittedCode.current = code;
      void onVerify(code);
    }
  }, [code, isVerifying, onVerify]);

  const handleCodeChange = (rawValue: string) => {
    const nextCode = rawValue.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(nextCode);
    if (nextCode.length < CODE_LENGTH) lastSubmittedCode.current = '';
    if (error) onClearError?.();
  };

  const canVerify = code.length === CODE_LENGTH && !isVerifying;
  const cells = Array.from({ length: CODE_LENGTH }, (_, index) => code[index] ?? '');

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      <TouchableOpacity
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        className="w-14 h-14 rounded-full bg-[#1C1C1E] items-center justify-center ml-6 mt-2"
      >
        <ArrowLeft width={24} height={24} />
      </TouchableOpacity>

      <View className="flex-1 px-6 pt-12">
        <View className="w-16 h-16 rounded-full bg-[#1C1C1E] border border-[#2C2C2E] items-center justify-center mb-6">
          <Mail width={32} height={32} />
        </View>
        <Text className="text-white text-2xl font-bold mb-3">{title}</Text>
        <Text className="text-gray-400 text-base mb-12">{description}</Text>

        <Pressable
          accessibilityRole="none"
          onPress={() => inputRef.current?.focus()}
          className="relative flex-row gap-2 mb-4"
        >
          {cells.map((digit, index) => {
            const isActive = isFocused && index === Math.min(code.length, CODE_LENGTH - 1);
            return (
            <View
              key={index}
              accessible={false}
              className={`flex-1 h-[56px] rounded-xl bg-[#1C1C1E] border items-center justify-center ${
                error
                  ? 'border-red-500'
                  : isActive
                    ? 'border-[#FF3B30]'
                    : 'border-[#2C2C2E]'
              }`}
            >
              {!digit && <View className="w-4 h-[2px] bg-[#6B7280]" />}
              {digit ? <Text className="text-white text-xl font-semibold">{digit}</Text> : null}
            </View>
            );
          })}
          <TextInput
            ref={inputRef}
            accessibilityLabel="Six-digit verification code"
            value={code}
            onChangeText={handleCodeChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoFocus
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={CODE_LENGTH}
            editable={!isVerifying}
            caretHidden
            {...(Platform.OS === 'ios'
              ? { textContentType: 'oneTimeCode' as const }
              : { autoComplete: 'sms-otp' as const })}
            className="absolute inset-0 w-full h-full text-transparent bg-transparent"
          />
        </Pressable>

        {error ? (
          <Text className="text-red-500 text-sm text-center mb-8">{error}</Text>
        ) : (
          <View className="mb-8" />
        )}

        <View className="w-full h-[52px] rounded-full overflow-hidden mb-8">
          <LinearGradient
            colors={canVerify ? BRAND_GRADIENT : ['#666666', '#333333']}
            locations={[0, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="w-full h-full"
          >
            <TouchableOpacity
              className="w-full h-full items-center justify-center"
              onPress={() => {
                lastSubmittedCode.current = code;
                void onVerify(code);
              }}
              disabled={!canVerify}
            >
              <Text className="text-white text-[17px] font-semibold">
                {isVerifying ? 'Verifying...' : 'Verify'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {onResend && (
          <View className="flex-row justify-center">
            <Text className="text-gray-400">Didn’t get the code? </Text>
            <TouchableOpacity onPress={onResend} disabled={isResending}>
              <Text className={`font-medium ${isResending ? 'text-gray-500' : 'text-[#CC0000]'}`}>
                {isResending ? 'Sending...' : 'Resend code'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
