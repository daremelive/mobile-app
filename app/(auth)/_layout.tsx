import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="signup" />
      <Stack.Screen name="signin" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="signup-two" />
      <Stack.Screen name="signup-three" /> 
    </Stack>
  );
} 