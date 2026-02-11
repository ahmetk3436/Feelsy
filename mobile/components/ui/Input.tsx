import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '../../lib/cn';
import { hapticSelection } from '../../lib/haptics';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  showCharCount?: boolean;
  maxLength?: number;
  isPassword?: boolean;
}

export default function Input({
  label,
  error,
  showCharCount = false,
  maxLength,
  isPassword = false,
  className,
  value,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const charCount = value?.toString().length || 0;

  const handleFocus = (e: any) => {
    setIsFocused(true);
    props.onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    props.onBlur?.(e);
  };

  const togglePassword = () => {
    hapticSelection();
    setShowPassword(!showPassword);
  };

  return (
    <View className="w-full">
      {label && (
        <View className="mb-1.5 flex-row items-center justify-between">
          <Text className="text-sm font-medium text-gray-300">
            {label}
          </Text>
          {props.required && (
            <Text className="text-rose-500">*</Text>
          )}
        </View>
      )}
      <View className="relative">
        <TextInput
          className={cn(
            'w-full rounded-xl border bg-gray-800 px-4 py-3 text-base text-white',
            isFocused
              ? 'border-rose-500'
              : 'border-gray-700',
            error && 'border-red-500',
            isPassword && 'pr-12',
            className
          )}
          placeholderTextColor="#6b7280"
          onFocus={handleFocus}
          onBlur={handleBlur}
          value={value}
          secureTextEntry={isPassword && !showPassword}
          maxLength={maxLength}
          {...props}
        />
        {isPassword && (
          <Pressable
            className="absolute right-3 top-1/2 -translate-y-1/2"
            onPress={togglePassword}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#9ca3af"
            />
          </Pressable>
        )}
      </View>
      <View className="mt-1 flex-row items-center justify-between">
        {error ? (
          <View className="flex-row items-center flex-1">
            <Ionicons name="alert-circle" size={14} color="#f87171" />
            <Text className="ml-1 text-sm text-red-400">{error}</Text>
          </View>
        ) : (
          <View className="flex-1" />
        )}
        {showCharCount && maxLength && (
          <Text className={cn(
            'text-xs',
            charCount > maxLength * 0.9 ? 'text-rose-400' : 'text-gray-500'
          )}>
            {charCount}/{maxLength}
          </Text>
        )}
      </View>
    </View>
  );
}
