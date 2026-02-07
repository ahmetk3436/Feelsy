import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import { hapticSuccess, hapticLight } from '../lib/haptics';

const { width } = Dimensions.get('window');

const MINI_CARDS = [
  { emoji: '😊', score: 85, color: '#22c55e' },
  { emoji: '😌', score: 62, color: '#84cc16' },
  { emoji: '😔', score: 35, color: '#f97316' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { continueAsGuest } = useAuth();
  const [activePage, setActivePage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const pageIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    setActivePage(pageIndex);
    hapticLight();
  };

  const handleTryFree = async () => {
    await AsyncStorage.setItem('onboarding_complete', 'true');
    await continueAsGuest();
    hapticSuccess();
    router.replace('/(protected)/home');
  };

  const handleSignIn = async () => {
    await AsyncStorage.setItem('onboarding_complete', 'true');
    hapticSuccess();
    router.replace('/(auth)/login');
  };

  const handleSkip = async () => {
    scrollRef.current?.scrollTo({ x: width * 2, animated: true });
    setActivePage(2);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      {/* Skip button on pages 0 and 1 */}
      {activePage < 2 && (
        <Pressable onPress={handleSkip} className="absolute top-16 right-6 z-10">
          <Text className="text-base font-medium" style={{ color: '#f43f5e' }}>
            Skip
          </Text>
        </Pressable>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
      >
        {/* Page 1: Welcome */}
        <View style={{ width }} className="flex-1 items-center justify-center px-8">
          <Animated.View entering={FadeInUp.delay(200).duration(600)}>
            <View className="w-32 h-32 rounded-full items-center justify-center mb-6" style={{ backgroundColor: '#f43f5e15' }}>
              <Text className="text-7xl">💗</Text>
            </View>
          </Animated.View>
          <Animated.Text
            entering={FadeInUp.delay(400).duration(600)}
            className="text-3xl font-bold text-white text-center mb-3"
          >
            Welcome to Feelsy
          </Animated.Text>
          <Animated.Text
            entering={FadeInUp.delay(600).duration(600)}
            className="text-base text-gray-400 text-center leading-6"
          >
            Track your daily moods and vibes. Understand yourself better, one check-in at a time.
          </Animated.Text>
        </View>

        {/* Page 2: Understand Your Feelings */}
        <View style={{ width }} className="flex-1 items-center justify-center px-8">
          <Animated.Text
            entering={FadeInUp.delay(200).duration(600)}
            className="text-3xl font-bold text-white text-center mb-6"
          >
            Understand Your Feelings
          </Animated.Text>
          <View className="w-full gap-3 mb-6">
            {MINI_CARDS.map((card, index) => (
              <Animated.View
                key={card.emoji}
                entering={FadeInRight.delay(200 + index * 200).duration(500)}
                className="rounded-2xl bg-gray-900 p-4 border border-gray-800 flex-row items-center"
              >
                <Text className="text-3xl mr-4">{card.emoji}</Text>
                <View className="flex-1">
                  <Text className="text-lg font-bold text-white">{card.score}</Text>
                  <View className="mt-2 h-2 rounded-full bg-gray-700">
                    <View
                      className="h-2 rounded-full"
                      style={{
                        width: `${card.score}%`,
                        backgroundColor: card.color,
                      }}
                    />
                  </View>
                </View>
              </Animated.View>
            ))}
          </View>
          <Animated.Text
            entering={FadeInUp.delay(800).duration(600)}
            className="text-base text-gray-400 text-center leading-6"
          >
            Track mood, energy, and daily patterns. See your emotional journey unfold over time.
          </Animated.Text>
        </View>

        {/* Page 3: Ready to Start */}
        <View style={{ width }} className="flex-1 items-center justify-center px-8">
          <Animated.View entering={FadeInUp.delay(200).duration(600)}>
            <View className="w-24 h-24 rounded-full items-center justify-center mb-6" style={{ backgroundColor: '#f43f5e15' }}>
              <Text className="text-6xl">✨</Text>
            </View>
          </Animated.View>
          <Animated.Text
            entering={FadeInUp.delay(400).duration(600)}
            className="text-3xl font-bold text-white text-center mb-3"
          >
            Ready to Start?
          </Animated.Text>
          <Animated.Text
            entering={FadeInUp.delay(600).duration(600)}
            className="text-base text-gray-400 text-center leading-6 mb-8"
          >
            Start tracking for free or sign in to sync across devices.
          </Animated.Text>
          <Animated.View entering={FadeInUp.delay(800).duration(600)} className="w-full">
            <Button title="Try Free" variant="primary" size="lg" onPress={handleTryFree} />
            <View className="mt-3">
              <Button title="Sign In" variant="outline" size="lg" onPress={handleSignIn} />
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Animated Progress Bar */}
      <View className="items-center pb-8">
        <View className="h-1 rounded-full mx-16 w-48" style={{ backgroundColor: '#374151' }}>
          <View
            className="h-1 rounded-full"
            style={{
              width: `${((activePage + 1) / 3) * 100}%`,
              backgroundColor: '#f43f5e',
            }}
          />
        </View>
        <View className="flex-row gap-2 mt-3">
          {[0, 1, 2].map((index) => (
            <View
              key={index}
              className="rounded-full"
              style={{
                width: index === activePage ? 12 : 8,
                height: index === activePage ? 12 : 8,
                backgroundColor: index === activePage ? '#f43f5e' : '#4b5563',
              }}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
