import React from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const FLOATING_ICONS = [
  { style: 'top-0 right-1/4' },
  { style: 'top-10 left-1/4' },
  { style: 'top-20 right-1/3' },
  { style: 'top-5 right-1/3' },
  { style: 'top-15 left-1/3' }
];

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 72,
    borderRadius: 36,
    overflow: 'hidden'
  },
  gradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center'
  }
});

export default function OnboardingScreen() {
  return (
    <View className="flex-1">
      <StatusBar style="light" />
      <Image
        source={require('../assets/images/onboarding-img.jpg')}
        style={[StyleSheet.absoluteFillObject]}
        contentFit="cover"
        contentPosition="top"
      />
      
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />

      <SafeAreaView edges={['bottom']} className="flex-1">
        <View className="flex-1 justify-end pb-16 px-6">
          <Text className="text-white text-3xl font-bold mb-4 text-center">
            Go Live. Connect. Engage.
          </Text>
          <Text className="text-white/80 text-lg mb-8 text-center">
            Broadcast yourself, interact with fans, and enjoy real-time entertainment—anytime, anywhere!
          </Text>

          <TouchableOpacity 
            style={styles.button}
            activeOpacity={0.8}
            onPress={() => router.push('/(auth)/signup')}
          >
            <LinearGradient
              colors={['#FF0000', '#330000']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradient}
            >
              <Text className="text-white text-lg font-semibold">
                Get Started
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}