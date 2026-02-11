import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  Pressable,
  ScrollView,
  type ModalProps as RNModalProps,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { hapticLight } from '../../lib/haptics';

interface ModalProps extends Omit<RNModalProps, 'visible'> {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  showCloseButton?: boolean;
  enableBackdropBlur?: boolean;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const sizeStyles = {
  sm: { maxHeight: SCREEN_HEIGHT * 0.3 },
  md: { maxHeight: SCREEN_HEIGHT * 0.5 },
  lg: { maxHeight: SCREEN_HEIGHT * 0.7 },
  full: { maxHeight: SCREEN_HEIGHT * 0.9 },
};

export default function Modal({
  visible,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  enableBackdropBlur = true,
  ...props
}: ModalProps) {
  const handleBackdropPress = () => {
    hapticLight();
    onClose();
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      {...props}
    >
      {/* Backdrop with blur effect (2025-2026 trend) */}
      <Pressable
        className="flex-1"
        onPress={handleBackdropPress}
        style={{ backgroundColor: enableBackdropBlur ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.5)' }}
      >
        {enableBackdropBlur && (
          <BlurView
            intensity={20}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
        )}
      </Pressable>

      {/* Modal Content */}
      <View className="absolute inset-0 items-center justify-center px-6">
        <Pressable
          className="w-full max-w-sm"
          onPress={() => {}}
          style={[
            {
              borderRadius: 24,
              backgroundColor: '#111827',
              borderWidth: 1,
              borderColor: '#1f2937',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 8,
            },
            sizeStyles[size],
          ]}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-gray-800 px-6 py-4">
            {title && (
              <Text className="text-xl font-bold text-white flex-1">
                {title}
              </Text>
            )}
            {showCloseButton && (
              <Pressable
                className="ml-2 rounded-full p-1"
                onPress={() => {
                  hapticLight();
                  onClose();
                }}
              >
                <Ionicons name="close" size={24} color="#9ca3af" />
              </Pressable>
            )}
          </View>

          {/* Scrollable Content */}
          <ScrollView
            className="px-6 py-4"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {children}
          </ScrollView>
        </Pressable>
      </View>
    </RNModal>
  );
}

const StyleSheet = {
  absoluteFill: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
};
