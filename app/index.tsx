import { BRAND_GRADIENT } from '@/constants/Gradients';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { markOnboardingSeen } from '../src/hooks/useAuthRouting';

export default function OnboardingScreen() {
  const continueTo = async (route: '/(auth)/signup' | '/(auth)/signin') => {
    await markOnboardingSeen();
    router.push(route);
  };

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']} className="flex-1 px-6">
        <View className="flex-row items-center gap-3 pt-4">
          <View className="h-11 w-11 items-center justify-center rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E]">
            <Image
              source={require('../assets/images/Logo.png')}
              className="h-7 w-7"
              resizeMode="contain"
            />
          </View>
          <Text className="text-xl font-bold text-white">DareMeLive</Text>
        </View>

        <View className="flex-1 justify-center pb-12">
          <View className="mb-6 h-1 w-12 rounded-full bg-[#C42720]" />
          <Text className="text-[42px] font-bold leading-[50px] text-white">
            Live moments,{`\n`}shared together.
          </Text>
          <Text className="mt-5 max-w-[340px] text-[17px] leading-7 text-gray-400">
            Start a stream, bring viewers on screen, and connect in real time.
          </Text>
        </View>

        <View className="pb-3">
          <View className="h-[52px] overflow-hidden rounded-full">
            <LinearGradient
              colors={BRAND_GRADIENT}
              locations={[0, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="h-full w-full"
            >
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Get started with DareMeLive"
                activeOpacity={0.85}
                className="h-full w-full items-center justify-center"
                onPress={() => void continueTo('/(auth)/signup')}
              >
                <Text className="text-[17px] font-semibold text-white">Get Started</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          <View className="mt-6 flex-row justify-center">
            <Text className="text-gray-400">Already have an account? </Text>
            <TouchableOpacity onPress={() => void continueTo('/(auth)/signin')}>
              <Text className="font-semibold text-[#C42720]">Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
