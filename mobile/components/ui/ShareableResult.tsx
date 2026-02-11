import React, { useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Share,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { hapticSuccess } from '../../lib/haptics';

interface ShareableResultProps {
  title: string;
  result: string;
  subtitle?: string;
  emoji?: string;
  userName?: string;
  stats?: Array<{ label: string; value: string }>;
  gradientColors?: string[];
  onShare?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32; // 16px padding on each side
const CARD_HEIGHT = CARD_WIDTH * 1.6; // 9:16 aspect ratio-ish

// 2025-2026 Viral Share Card (Spotify Wrapped Pattern)
export default function ShareableResult({
  title,
  result,
  subtitle,
  emoji,
  userName,
  stats,
  gradientColors = ['#6366f1', '#ec4899', '#8b5cf6'],
  onShare,
}: ShareableResultProps) {
  const cardRef = useRef<View>(null);

  const handleShare = async () => {
    hapticSuccess();
    onShare?.();

    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        backgroundColor: '#6366f1',
      });

      if (uri) {
        const fileUri = FileSystem.cacheDirectory + 'share-card.png';
        await FileSystem.copyAsync({ from: uri, to: fileUri });

        await Sharing.shareAsync(fileUri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your result',
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  return (
    <View className="items-center">
      {/* Shareable Card (Instagram Story size) */}
      <View
        ref={cardRef}
        className="overflow-hidden"
        style={[
          styles.shareCard,
          { width: CARD_WIDTH, height: CARD_HEIGHT },
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Glassmorphism overlay (2025-2026 trend) */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
          ]}
        />

        {/* Content */}
        <View className="p-8 relative">
          {/* App watermark (subtle) */}
          <View className="mb-4 flex-row items-center">
            <Text className="text-xl">{'\u{1F497}'}</Text>
            <Text className="ml-2 text-xs font-semibold text-white/70 uppercase tracking-wider">
              Feelsy
            </Text>
          </View>

          {/* Main result */}
          <View className="mb-4">
            {emoji && (
              <Text className="mb-3 text-center text-6xl">{emoji}</Text>
            )}
            {title && (
              <Text className="mb-2 text-center text-sm font-semibold text-white/80 uppercase tracking-widest">
                {title}
              </Text>
            )}
            <Text
              className="text-center text-5xl font-black text-white"
              style={{ textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 8 }}
            >
              {result}
            </Text>
            {subtitle && (
              <Text className="mt-2 text-center text-lg text-white/90">
                {subtitle}
              </Text>
            )}
          </View>

          {/* Stats row */}
          {stats && stats.length > 0 && (
            <View className="mt-6 flex-row justify-between gap-4">
              {stats.map((stat, index) => (
                <View key={index} className="flex-1 items-center">
                  <Text className="text-center text-xs text-white/60 uppercase tracking-wider">
                    {stat.label}
                  </Text>
                  <Text className="mt-1 text-center text-lg font-bold text-white">
                    {stat.value}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* User attribution */}
          {userName && (
            <View className="mt-6 border-t border-white/20 pt-4">
              <Text className="text-center text-sm text-white/70">@{userName}</Text>
              <Text className="text-center text-xs text-white/50 mt-1">
                {new Date().toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
          )}

          {/* Bottom CTA */}
          <View className="mt-6 items-center">
            <Text className="text-center text-xs font-semibold text-white/80">
              Get Feelsy - Track your feelings
            </Text>
          </View>
        </View>
      </View>

      {/* Share button */}
      <Pressable
        onPress={handleShare}
        className="mt-6 flex-row items-center justify-center rounded-2xl bg-rose-500 px-6 py-3 shadow-glow-md"
      >
        <Ionicons name="share-outline" size={20} color="#ffffff" />
        <Text className="ml-2 font-semibold text-white">Share Result</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shareCard: {
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  absoluteFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
