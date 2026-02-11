import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight } from '../../lib/haptics';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  variant?: 'default' | 'premium' | 'new';
  size?: 'sm' | 'md' | 'lg';
  gradient?: string[];
  disabled?: boolean;
}

// 2025-2026 Bento Box Grid Component
export default function FeatureCard({
  title,
  description,
  icon,
  onPress,
  variant = 'default',
  size = 'md',
  gradient,
  disabled = false,
}: FeatureCardProps) {
  const handlePress = () => {
    if (!disabled && onPress) {
      hapticLight();
      onPress();
    }
  };

  const containerStyle: ViewStyle[] = [styles.container];

  // Size variants
  const sizeStyles = {
    sm: { flex: 1, minHeight: 100 },
    md: { flex: 1, minHeight: 140 },
    lg: { flex: 2, minHeight: 180 },
  };
  containerStyle.push(sizeStyles[size]);

  // Variant styles
  if (variant === 'premium') {
    return (
      <LinearGradient
        colors={gradient || ['#f59e0b', '#d97706']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={containerStyle}
      >
        <Pressable
          onPress={handlePress}
          disabled={disabled}
          style={({ pressed }) => [
            styles.pressable,
            pressed && styles.pressed,
            disabled && styles.disabled,
          ]}
        >
          <View style={styles.premiumIconContainer}>
            <Ionicons name={icon} size={28} color="#ffffff" />
          </View>
          <View style={styles.content}>
            <View style={styles.titleRow}>
              <Text style={styles.premiumTitle}>{title}</Text>
              <Ionicons name="lock-closed" size={14} color="#fef3c7" />
            </View>
            <Text style={styles.premiumDescription}>{description}</Text>
          </View>
        </Pressable>
      </LinearGradient>
    );
  }

  if (variant === 'new') {
    return (
      <View style={[containerStyle, { position: 'relative' }]}>
        <LinearGradient
          colors={['#6366f1', '#ec4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', ...StyleSheet.absoluteFill }} />
        <Pressable
          onPress={handlePress}
          disabled={disabled}
          style={({ pressed }) => [
            styles.pressable,
            pressed && styles.pressed,
            disabled && styles.disabled,
          ]}
        >
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={32} color="#ffffff" />
          </View>
          <Text style={styles.defaultTitle}>{title}</Text>
          <Text style={styles.defaultDescription}>{description}</Text>
        </Pressable>
      </View>
    );
  }

  // Default variant
  return (
    <View style={[containerStyle, styles.defaultContainer]}>
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.pressable,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={32} color="#f43f5e" />
        </View>
        <Text style={styles.defaultTitle}>{title}</Text>
        <Text style={styles.defaultDescription}>{description}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    margin: 6,
  },
  defaultContainer: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  pressable: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  premiumIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  content: {
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  defaultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  defaultDescription: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
  },
  premiumDescription: {
    fontSize: 13,
    color: '#fef3c7',
    textAlign: 'center',
  },
  newBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  absoluteFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
