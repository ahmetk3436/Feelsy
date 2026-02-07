import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { isAuthenticated, isGuest, isLoading } = useAuth();
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    const checkOnboarding = async () => {
      const value = await AsyncStorage.getItem('onboarding_complete');
      setHasOnboarded(value === 'true');
    };
    checkOnboarding();
  }, []);

  if (isLoading || hasOnboarded === null) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-950">
        <ActivityIndicator size="large" color="#f43f5e" />
      </View>
    );
  }

  if (!hasOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(protected)/home" />;
  }

  if (isGuest) {
    return <Redirect href="/(protected)/home" />;
  }

  return <Redirect href="/(auth)/login" />;
}
