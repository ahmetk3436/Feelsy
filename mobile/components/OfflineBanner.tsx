import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '../lib/network';

export default function OfflineBanner() {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <View
      className="flex-row items-center justify-center py-2 px-4"
      style={{ backgroundColor: '#ef4444' }}
    >
      <Ionicons name="cloud-offline-outline" size={16} color="white" />
      <Text className="text-white text-sm font-medium ml-2">
        No internet connection
      </Text>
    </View>
  );
}
