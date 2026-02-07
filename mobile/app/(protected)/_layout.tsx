import React from 'react';
import { View, Pressable, Text, ActivityIndicator } from 'react-native';
import { Redirect, Slot, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { hapticSelection } from '../../lib/haptics';

const TABS = [
  { name: 'home', title: 'Feels', icon: 'heart', activeIcon: 'heart' },
  { name: 'history', title: 'History', icon: 'calendar-outline', activeIcon: 'calendar' },
  { name: 'insights', title: 'Insights', icon: 'analytics-outline', activeIcon: 'analytics' },
  { name: 'friends', title: 'Friends', icon: 'people-outline', activeIcon: 'people' },
  { name: 'profile', title: 'Profile', icon: 'person-outline', activeIcon: 'person' },
] as const;

const ACCENT = '#f43f5e';
const INACTIVE = '#6b7280';

function CustomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="bg-gray-950 border-t border-gray-800">
      {/* Top accent line */}
      <View className="h-[3px]" style={{ backgroundColor: ACCENT, opacity: 0.6 }} />

      <View
        className="flex-row justify-around pt-2"
        style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }}
      >
        {TABS.map((tab) => {
          const isActive = pathname.includes(tab.name);
          const iconName = isActive ? tab.activeIcon : tab.icon;

          return (
            <Pressable
              key={tab.name}
              onPress={() => {
                hapticSelection();
                router.replace(`/(protected)/${tab.name}` as any);
              }}
              className="items-center py-1 px-3"
            >
              <Ionicons
                name={iconName as keyof typeof Ionicons.glyphMap}
                size={24}
                color={isActive ? ACCENT : INACTIVE}
              />
              {/* Active indicator dot */}
              {isActive && (
                <View
                  className="mt-1 rounded-full"
                  style={{ width: 4, height: 4, backgroundColor: ACCENT }}
                />
              )}
              {!isActive && (
                <Text className="mt-1 text-xs" style={{ color: INACTIVE }}>
                  {tab.title}
                </Text>
              )}
              {isActive && (
                <Text className="text-xs font-semibold" style={{ color: ACCENT }}>
                  {tab.title}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function ProtectedLayout() {
  const { isAuthenticated, isGuest, isLoading } = useAuth();

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
      <CustomTabBar />
    </View>
  );
}
