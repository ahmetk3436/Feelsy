import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface UsageBadgeProps {
  current: number;
  max: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showWarning?: boolean;
}

// 2025-2026 Gamified Usage Badge
export default function UsageBadge({
  current,
  max,
  label = 'uses left',
  size = 'md',
  showWarning = true,
}: UsageBadgeProps) {
  const percentage = (current / max) * 100;
  const isLow = percentage >= 80;
  const isCritical = percentage >= 100;

  const sizeStyles = {
    sm: { paddingHorizontal: 10, paddingVertical: 4 },
    md: { paddingHorizontal: 14, paddingVertical: 6 },
    lg: { paddingHorizontal: 18, paddingVertical: 8 },
  };

  const textSizes = {
    sm: 11,
    md: 12,
    lg: 14,
  };

  const dotSizes = {
    sm: 4,
    md: 5,
    lg: 6,
  };

  if (isCritical) {
    return (
      <View style={[styles.container, sizeStyles[size], styles.criticalContainer]}>
        <View style={[styles.dot, { width: dotSizes[size], height: dotSizes[size] }]} />
        <Text style={[styles.text, { fontSize: textSizes[size] }]}>
          Limit reached
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, sizeStyles[size]]}>
      {isLow && showWarning ? (
        <LinearGradient
          colors={['#f59e0b', '#ef4444']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.dot, { width: dotSizes[size], height: dotSizes[size] }]}
        />
      ) : (
        <View style={[styles.dot, { width: dotSizes[size], height: dotSizes[size], backgroundColor: isLow ? '#f59e0b' : '#22c55e' }]} />
      )}
      <Text style={[styles.text, { fontSize: textSizes[size] }]}>
        {current}/{max} {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
    borderWidth: 1,
    borderColor: '#374151',
    alignSelf: 'flex-start',
  },
  criticalContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#ef4444',
  },
  dot: {
    borderRadius: 10,
    marginRight: 8,
  },
  text: {
    fontWeight: '600',
    color: '#f3f4f6',
  },
});
