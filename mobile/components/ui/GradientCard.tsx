import React from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { cn } from '../../lib/cn';

interface GradientCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'glass' | 'neon';
  size?: 'sm' | 'md' | 'lg';
  intensity?: number;
  className?: string;
}

// 2025-2026 Gradient Card with Glassmorphism
const GRADIENTS = {
  default: ['#f43f5e', '#ec4899'],
  glass: ['#6366f1', '#8b5cf6'],
  neon: ['#00d4ff', '#7c3aed'],
  sunset: ['#f59e0b', '#ef4444'],
  forest: ['#22c55e', '#15803d'],
  aurora: ['#6366f1', '#ec4899', '#8b5cf6'],
};

export default function GradientCard({
  children,
  onPress,
  variant = 'default',
  size = 'md',
  intensity = 40,
  className,
}: GradientCardProps) {
  const style: ViewStyle[] = [styles.container];

  // Size variants
  const sizeStyles = {
    sm: { padding: 16 },
    md: { padding: 20 },
    lg: { padding: 24 },
  };
  Object.assign(style, sizeStyles[size]);

  if (variant === 'glass') {
    return (
      <View style={[style, styles.glassContainer]}>
        <LinearGradient
          colors={GRADIENTS.glass}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.glassContent}>
          {children}
        </View>
      </View>
    );
  }

  if (variant === 'neon') {
    return (
      <View style={style}>
        <LinearGradient
          colors={GRADIENTS.neon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          {children}
        </View>
      </View>
    );
  }

  // Default/Aurora gradient
  const Wrapper = onPress ? Pressable : View;
  const wrapperProps = onPress
    ? {
        onPress,
        style: [styles.pressable, onPress && styles.shadow],
      }
    : { style: styles.nonPressable };

  return (
    <Wrapper {...wrapperProps}>
      <LinearGradient
        colors={GRADIENTS.aurora}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={cn(styles.content, className && className)}>
        {children}
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 12,
  },
  glassContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
  },
  glassContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 20,
  },
  content: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 20,
  },
  pressable: {
    borderRadius: 24,
  },
  nonPressable: {
    borderRadius: 24,
  },
  shadow: {
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  absoluteFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
