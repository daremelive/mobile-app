import { BRAND_GRADIENT } from '@/constants/Gradients';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { markOnboardingSeen } from '../src/hooks/useAuthRouting';

const FEATURE_ICONS = [
  { name: 'videocam' as const, label: 'Go live' },
  { name: 'people' as const, label: 'Take a seat' },
  { name: 'gift' as const, label: 'Send gifts' },
];

export default function OnboardingScreen() {
  const handleGetStarted = async () => {
    await markOnboardingSeen();
    router.push('/(auth)/signup');
  };

  return (
    <View className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      <LinearGradient
        colors={['#260909', '#100A0B', '#090909']}
        locations={[0, 0.38, 0.78]}
        style={StyleSheet.absoluteFillObject}
      />
      <View className="absolute -top-24 -right-24 h-72 w-72 rounded-full border border-red-500/10" />
      <View className="absolute top-10 -right-14 h-44 w-44 rounded-full border border-red-500/10" />
      <View className="absolute bottom-52 -left-28 h-64 w-64 rounded-full border border-white/5" />

      <SafeAreaView edges={['top', 'bottom', 'left', 'right']} className="flex-1 px-6">
        <View className="flex-row items-center justify-between pt-2">
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <Image
                source={require('../assets/images/Logo.png')}
                className="h-7 w-7"
                resizeMode="contain"
              />
            </View>
            <Text className="text-xl font-bold text-white">DareMeLive</Text>
          </View>
          <View className="flex-row items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-3 py-2">
            <View className="h-2 w-2 rounded-full bg-red-500" />
            <Text className="text-xs font-semibold tracking-widest text-red-300">LIVE</Text>
          </View>
        </View>

        <View className="flex-1 justify-center py-6">
          <LinearGradient
            colors={['rgba(255,255,255,0.09)', 'rgba(255,255,255,0.025)']}
            style={styles.stage}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <Text className="text-xs font-semibold tracking-widest text-white">ON AIR</Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="eye-outline" size={16} color="#A1A1AA" />
                <Text className="text-xs text-zinc-400">1.2K watching</Text>
              </View>
            </View>

            <View className="flex-1 items-center justify-center py-5">
              <View className="h-36 w-36 items-center justify-center rounded-full border border-red-500/20 bg-red-500/5">
                <View className="h-28 w-28 items-center justify-center rounded-full border border-red-500/30 bg-[#130B0C]">
                  <Image
                    source={require('../assets/images/Logo.png')}
                    className="h-16 w-16"
                    resizeMode="contain"
                  />
                </View>
              </View>
              <View className="mt-4 rounded-full border border-white/10 bg-black/30 px-4 py-2">
                <Text className="text-sm font-medium text-zinc-200">Your stage. Your community.</Text>
              </View>
            </View>

            <View className="flex-row gap-3">
              {FEATURE_ICONS.map((feature) => (
                <View
                  key={feature.label}
                  className="flex-1 items-center rounded-2xl border border-white/10 bg-black/20 px-2 py-3"
                >
                  <Ionicons name={feature.name} size={21} color="#FF5A5A" />
                  <Text className="mt-2 text-center text-[11px] font-medium text-zinc-300">
                    {feature.label}
                  </Text>
                </View>
              ))}
            </View>
          </LinearGradient>

          <Text className="mt-7 text-center text-[32px] font-bold leading-10 text-white">
            Go live. Be seen.{`\n`}Own the moment.
          </Text>
          <Text className="mx-3 mt-3 text-center text-base leading-6 text-zinc-400">
            Stream, join the conversation, and build a community around what you love.
          </Text>
        </View>

        <View className="pb-3">
          <View className="h-[56px] overflow-hidden rounded-full">
            <LinearGradient
              colors={BRAND_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            >
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Get started with DareMeLive"
                activeOpacity={0.85}
                className="h-full w-full flex-row items-center justify-center gap-2"
                onPress={handleGetStarted}
              >
                <Text className="text-[17px] font-semibold text-white">Get Started</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </TouchableOpacity>
            </LinearGradient>
          </View>
          <Text className="mt-3 text-center text-xs text-zinc-600">
            Live entertainment, made for participation.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    height: 320,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: 8,
  },
});
