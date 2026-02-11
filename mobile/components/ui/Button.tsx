import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  View,
  type PressableProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../../lib/cn';
import { hapticLight } from '../../lib/haptics';

interface ButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles = {
  primary: 'bg-rose-500 active:bg-rose-600',
  secondary: 'bg-gray-700 active:bg-gray-800',
  outline: 'border-2 border-rose-500 bg-transparent active:bg-rose-500/10',
  destructive: 'bg-red-600 active:bg-red-700',
  gradient: '', // Handled separately
};

const variantTextStyles = {
  primary: 'text-white',
  secondary: 'text-white',
  outline: 'text-rose-500',
  destructive: 'text-white',
  gradient: 'text-white',
};

const sizeStyles = {
  sm: 'px-3 py-2',
  md: 'px-5 py-3',
  lg: 'px-7 py-4',
  xl: 'px-8 py-5',
};

const sizeTextStyles = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

// 2025-2026 Gradient colors (AI Gradient Haze trend)
const gradientColors = {
  default: ['#f43f5e', '#ec4899', '#8b5cf6'],
  destructive: ['#ef4444', '#dc2626'],
};

export default function Button({
  title,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  fullWidth = false,
  leftIcon,
  rightIcon,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;
  const [isPressed, setIsPressed] = React.useState(false);

  const handlePressIn = () => {
    setIsPressed(true);
    hapticLight();
  };

  const handlePressOut = () => {
    setIsPressed(false);
  };

  const buttonContent = (
    <>
      {isLoading ? (
        <ActivityIndicator
          color={variant === 'outline' ? '#f43f5e' : '#ffffff'}
          size={size === 'sm' ? 'small' : 'small'}
        />
      ) : (
        <View className="flex-row items-center justify-center">
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text
            className={cn(
              'font-semibold',
              variantTextStyles[variant],
              sizeTextStyles[size]
            )}
          >
            {title}
          </Text>
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </View>
      )}
    </>
  );

  // Gradient button (2025-2026 trend)
  if (variant === 'gradient') {
    return (
      <Pressable
        className={cn(
          'items-center justify-center rounded-xl overflow-hidden',
          sizeStyles[size],
          fullWidth && 'w-full',
          isDisabled && 'opacity-50'
        )}
        disabled={isDisabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: isLoading }}
        {...props}
      >
        <LinearGradient
          colors={gradientColors.default}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
        >
          {buttonContent}
        </LinearGradient>
      </Pressable>
    );
  }

  // Standard button
  return (
    <Pressable
      className={cn(
        'items-center justify-center rounded-xl',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        isDisabled && 'opacity-50',
        isPressed && 'scale-95'
      )}
      disabled={isDisabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isLoading }}
      {...props}
    >
      {buttonContent}
    </Pressable>
  );
}
