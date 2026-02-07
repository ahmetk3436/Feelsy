import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { hapticSelection } from '../../lib/haptics';
import { getColorForScore } from '../../types/feel';
import type { FeelStats } from '../../types/feel';

const BADGE_CONFIG: Record<string, { emoji: string; label: string }> = {
  streak_3: { emoji: '3', label: '3 Day Streak' },
  streak_7: { emoji: '7', label: '7 Day Streak' },
  streak_14: { emoji: '14', label: '14 Day Streak' },
  streak_30: { emoji: '30', label: '30 Day Streak' },
  total_10: { emoji: '10', label: '10 Check-ins' },
  total_50: { emoji: '50', label: '50 Check-ins' },
  total_100: { emoji: '100', label: '100 Check-ins' },
};

const MILESTONE_ORDER = ['streak_3', 'streak_7', 'streak_14', 'streak_30', 'total_10', 'total_50', 'total_100'];

const MILESTONE_THRESHOLDS: Record<string, { field: 'streak' | 'total'; target: number }> = {
  streak_3: { field: 'streak', target: 3 },
  streak_7: { field: 'streak', target: 7 },
  streak_14: { field: 'streak', target: 14 },
  streak_30: { field: 'streak', target: 30 },
  total_10: { field: 'total', target: 10 },
  total_50: { field: 'total', target: 50 },
  total_100: { field: 'total', target: 100 },
};

export default function ProfileScreen() {
  const { user, isGuest } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<FeelStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      if (!isGuest) {
        const res = await api.get('/feels/stats');
        setStats(res.data);
      }
    } catch (error) {
      console.log('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const userInitial = isGuest
    ? 'G'
    : user?.email?.charAt(0).toUpperCase() || '?';
  const displayEmail = isGuest ? 'Guest User' : user?.email || '';

  // Next milestones
  const getNextMilestones = () => {
    if (!stats) return [];
    const unlocked = new Set(stats.unlocked_badges || []);
    const milestones: { key: string; progress: number; target: number; label: string }[] = [];

    for (const key of MILESTONE_ORDER) {
      if (unlocked.has(key)) continue;
      const threshold = MILESTONE_THRESHOLDS[key];
      if (!threshold) continue;
      const current = threshold.field === 'streak'
        ? stats.current_streak
        : stats.total_check_ins;
      milestones.push({
        key,
        progress: current,
        target: threshold.target,
        label: BADGE_CONFIG[key]?.label || key,
      });
      if (milestones.length >= 3) break;
    }
    return milestones;
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f43f5e" />
        </View>
      </SafeAreaView>
    );
  }

  const badges = stats?.unlocked_badges || [];
  const nextMilestones = getNextMilestones();

  return (
    <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-4 flex-row items-center justify-between">
          <Text className="text-3xl font-bold text-white">Profile</Text>
          <Pressable
            onPress={() => {
              hapticSelection();
              router.push('/(protected)/settings' as any);
            }}
            className="w-10 h-10 items-center justify-center rounded-full bg-gray-900 border border-gray-800"
          >
            <Ionicons name="settings-outline" size={20} color="#9ca3af" />
          </Pressable>
        </View>

        {/* Avatar Section */}
        <View className="items-center mt-6">
          <View
            className="w-24 h-24 rounded-full items-center justify-center border-2 border-rose-500/30"
            style={{ backgroundColor: '#f43f5e15' }}
          >
            <Text className="text-4xl font-bold" style={{ color: '#f43f5e' }}>
              {userInitial}
            </Text>
          </View>
          <Text className="mt-3 text-base text-gray-400">{displayEmail}</Text>
        </View>

        {/* Stats Grid */}
        <View className="mt-6 px-6 flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-gray-900 p-4 border border-gray-800 items-center">
            <Text className="text-2xl">🔥</Text>
            <Text className="mt-1 text-xl font-bold text-white">
              {stats?.current_streak ?? 0}
            </Text>
            <Text className="text-xs text-gray-400">Day Streak</Text>
          </View>
          <View className="flex-1 rounded-2xl bg-gray-900 p-4 border border-gray-800 items-center">
            <Text className="text-2xl">📊</Text>
            <Text className="mt-1 text-xl font-bold text-white">
              {stats?.total_check_ins ?? 0}
            </Text>
            <Text className="text-xs text-gray-400">Check-ins</Text>
          </View>
          <View className="flex-1 rounded-2xl bg-gray-900 p-4 border border-gray-800 items-center">
            <Text className="text-2xl">✨</Text>
            <Text
              className="mt-1 text-xl font-bold"
              style={{ color: stats?.average_score ? getColorForScore(stats.average_score) : '#9ca3af' }}
            >
              {stats?.average_score ? Math.round(stats.average_score) : 0}
            </Text>
            <Text className="text-xs text-gray-400">Avg Score</Text>
          </View>
        </View>

        {/* Badge Showcase */}
        <View className="mt-6 px-6">
          <Text className="text-lg font-semibold text-white mb-3">Your Badges</Text>
          {badges.length > 0 ? (
            <View className="flex-row flex-wrap gap-3">
              {badges.map((badge) => {
                const config = BADGE_CONFIG[badge];
                return (
                  <View
                    key={badge}
                    className="rounded-2xl bg-gray-900 p-4 border border-gray-800 items-center"
                    style={{ width: 100 }}
                  >
                    <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: '#f43f5e20' }}>
                      <Text className="text-lg font-bold" style={{ color: '#f43f5e' }}>
                        {config?.emoji || badge}
                      </Text>
                    </View>
                    <Text className="mt-2 text-xs text-gray-300 text-center">
                      {config?.label || badge}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="rounded-2xl bg-gray-900 p-6 border border-gray-800 items-center">
              <Text className="text-3xl">🔒</Text>
              <Text className="mt-2 text-sm text-gray-400 text-center">
                Keep checking in to unlock badges!
              </Text>
            </View>
          )}
        </View>

        {/* Next Milestones */}
        {nextMilestones.length > 0 && (
          <View className="mt-6 px-6">
            <Text className="text-lg font-semibold text-white mb-3">Next Milestones</Text>
            {nextMilestones.map((milestone) => {
              const percent = Math.min(100, Math.round((milestone.progress / milestone.target) * 100));
              return (
                <View key={milestone.key} className="mb-3 rounded-2xl bg-gray-900 p-4 border border-gray-800">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-sm font-medium text-white">{milestone.label}</Text>
                    <Text className="text-xs text-gray-400">
                      {milestone.progress}/{milestone.target}
                    </Text>
                  </View>
                  <View className="h-2 rounded-full bg-gray-700">
                    <View
                      className="h-2 rounded-full"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: '#f43f5e',
                      }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
