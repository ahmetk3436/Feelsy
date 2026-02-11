import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { hapticMedium } from '../../lib/haptics';

interface CTABannerProps {
  title: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
  ctaText: string;
  onPress: () => void;
  variant?: 'primary' | 'gradient' | 'glass';
  dismissible?: boolean;
  onDismiss?: () => void;
}

// 2025-2026 Contextual Paywall / CTA Banner
export default function CTABanner({
  title,
  description,
  icon,
  ctaText,
  onPress,
  variant = 'gradient',
  dismissible = true,
  onDismiss,
}: CTABannerProps) {
  const handlePress = () => {
    hapticMedium();
    onPress();
  };

  const handleDismiss = () => {
    hapticMedium();
    onDismiss?.();
  };

  if (variant === 'glass') {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: 'rgba(17, 24, 39, 0.8)',
            borderColor: 'rgba(99, 102, 241, 0.3)',
            borderWidth: 1,
          },
        ]}
      >
        <View className="flex-row items-start">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-indigo-500 mr-3">
            <Ionicons name={icon || 'diamond-outline'} size={20} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-base font-semibold text-white">{title}</Text>
            <Text className="text-sm text-gray-300">{description}</Text>
          </View>
        </View>
        <View className="mt-4 flex-row items-center justify-between">
          <Pressable onPress={handlePress} style={styles.ctaButton}>
            <Text className="font-semibold text-white">{ctaText}</Text>
          </Pressable>
          {dismissible && onDismiss && (
            <Pressable onPress={handleDismiss}>
              <Ionicons name="close-outline" size={20} color="#9ca3af" />
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // Gradient variant
  return (
    <LinearGradient
      colors={['#6366f1', '#ec4899']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <View className="flex-row items-start">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-white/20 mr-3">
          <Ionicons name={icon || 'diamond-outline'} size={20} color="#ffffff" />
        </View>
        <View className="flex-1">
          <Text className="mb-1 text-base font-semibold text-white">{title}</Text>
          <Text className="text-sm text-white/90">{description}</Text>
        </View>
        {dismissible && onDismiss && (
          <Pressable onPress={handleDismiss}>
            <Ionicons name="close-outline" size={20} color="#ffffff" />
          </Pressable>
        )}
      </View>
      <Pressable onPress={handlePress} style={styles.ctaButtonSolid}>
        <Text className="font-bold text-white">{ctaText}</Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  ctaButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  ctaButtonSolid: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    marginTop: 12,
    alignSelf: 'flex-start',
  },
});
