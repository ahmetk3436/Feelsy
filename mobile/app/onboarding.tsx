import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import { hapticSuccess, hapticLight } from '../lib/haptics';

export default function OnboardingScreen() {
  const router = useRouter();
  const { continueAsGuest } = useAuth();
  const { width } = Dimensions.get('window');
  const [activePage, setActivePage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const pages = [
    { emoji: '💗', title: 'Welcome to Feelsy', subtitle: 'Track your daily moods and vibes' },
    { emoji: '📊', title: 'Understand Your Feelings', subtitle: 'See patterns in your mood over time with daily check-ins' },
    { emoji: '✨', title: 'Ready to Start?', subtitle: 'Start tracking for free or sign in to sync across devices' },
  ];

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

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <ScrollView
        ref={scrollRef}
        horizontal={true}
        pagingEnabled={true}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
      >
        {pages.map((page, index) => (
          <View key={index} style={{ width }} className="flex-1 items-center justify-center px-8">
            <Text className="text-6xl mb-6">{page.emoji}</Text>
            <Text className="text-3xl font-bold text-white text-center mb-3">{page.title}</Text>
            <Text className="text-base text-gray-400 text-center leading-6">{page.subtitle}</Text>
            {index === 2 && (
              <View className="mt-10 w-full">
                <Button title="Try Free" variant="primary" size="lg" onPress={handleTryFree} />
                <View className="mt-3">
                  <Button title="Sign In" variant="outline" size="lg" onPress={handleSignIn} />
                </View>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
      <View className="flex-row items-center justify-center pb-8 gap-2">
        {pages.map((_, index) => (
          <View
            key={index}
            className={
              index === activePage
                ? 'w-3 h-3 rounded-full bg-rose-500'
                : 'w-2 h-2 rounded-full bg-gray-600'
            }
          />
        ))}
      </View>
    </SafeAreaView>
  );
}
