import React from 'react';
import { View, Pressable, Text, ActivityIndicator } from 'react-native';
import { Redirect, Slot, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { hapticSelection } from '../../lib/haptics';

const TABS = [
  { name: 'home', label: 'Feels', icon: 'heart' },
  { name: 'history', label: 'History', icon: 'time' },
  { name: 'insights', label: 'Insights', icon: 'analytics' },
  { name: 'friends', label: 'Friends', icon: 'people' },
  { name: 'settings', label: 'Settings', icon: 'settings' },
] as const;

const ACCENT = '#f43f5e';
const INACTIVE = '#6b7280';

export default function ProtectedLayout() {
  const { isAuthenticated, isGuest, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-950">
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (!isAuthenticated && !isGuest) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View className="flex-1 bg-gray-950">
      <View className="flex-1">
        <Slot />
      </View>

      {/* Custom Tab Bar */}
      <View
        className="flex-row bg-gray-950 border-t border-gray-800 pt-2"
        style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }}
      >
        {TABS.map((tab) => {
          const isActive = pathname.includes(tab.name);
          return (
            <Pressable
              key={tab.name}
              onPress={() => {
                hapticSelection();
                router.replace(`/(protected)/${tab.name}` as any);
              }}
              className="flex-1 items-center justify-center py-1"
            >
              <Ionicons
                name={
                  (isActive ? tab.icon : `${tab.icon}-outline`) as keyof typeof Ionicons.glyphMap
                }
                size={24}
                color={isActive ? ACCENT : INACTIVE}
              />
              <Text
                className="mt-1 text-xs font-semibold"
                style={{ color: isActive ? ACCENT : INACTIVE }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
