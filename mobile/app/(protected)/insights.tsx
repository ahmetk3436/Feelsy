import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../lib/api';
import { getColorForScore, getFeelLabel } from '../../types/feel';

interface WeeklyInsight {
  week_start: string;
  week_end: string;
  average_mood: number;
  average_energy: number;
  average_feel: number;
  total_checkins: number;
  best_day: string;
  worst_day: string;
  mood_trend: string;
  dominant_emoji: string;
}

interface InsightsData {
  current_week: WeeklyInsight;
  previous_week: WeeklyInsight;
  improvement: number;
  message: string;
}

const formatDay = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()] || '';
};

export default function InsightsScreen() {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadInsights = useCallback(async () => {
    try {
      const res = await api.get('/feels/insights');
      if (res.data) {
        setInsights(res.data);
      }
    } catch (error) {
      console.log('Error loading insights:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadInsights();
  }, [loadInsights]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      </SafeAreaView>
    );
  }

  if (!insights) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
          }
        >
          <View className="px-6 pt-8">
            <Text className="text-3xl font-bold text-gray-900">Insights</Text>
            <Text className="mt-1 text-base text-gray-500">Your weekly mood trends</Text>
            <View className="mt-12 items-center">
              <Text className="text-6xl">📊</Text>
              <Text className="mt-4 text-xl font-semibold text-gray-900">No insights yet</Text>
              <Text className="mt-2 text-center text-gray-500">
                Start logging your daily feels to unlock weekly mood insights and trends.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const current = insights.current_week;
  const previous = insights.previous_week;

  const moodDiff = +(current.average_mood - previous.average_mood).toFixed(1);
  const energyDiff = +(current.average_energy - previous.average_energy).toFixed(1);
  const feelDiff = +(current.average_feel - previous.average_feel).toFixed(1);

  const trendArrow = current.mood_trend === 'improving' ? '▲' : current.mood_trend === 'declining' ? '▼' : '●';
  const trendColor = current.mood_trend === 'improving' ? '#22c55e' : current.mood_trend === 'declining' ? '#ef4444' : '#9ca3af';

  const checkinPercent = Math.min(100, Math.round((current.total_checkins / 7) * 100));

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
        }
      >
        <View className="px-6 pt-8">
          {/* Header */}
          <Text className="text-3xl font-bold text-gray-900">Insights</Text>
          <Text className="mt-1 text-base text-gray-500">Your weekly mood trends</Text>

          {/* Personalized Message Card */}
          <View
            className="mt-6 rounded-3xl p-6 shadow-sm"
            style={{ backgroundColor: getColorForScore(current.average_feel) + '15' }}
          >
            <View className="flex-row items-center">
              <Text className="text-5xl">{current.dominant_emoji || '✨'}</Text>
              <View className="ml-4 flex-1">
                <Text className="text-lg font-medium text-gray-800">
                  {insights.message}
                </Text>
                <View className="mt-2 flex-row items-center">
                  <Text style={{ color: trendColor, fontSize: 16, fontWeight: '700' }}>
                    {trendArrow}
                  </Text>
                  <Text className="ml-1 text-sm font-semibold" style={{ color: trendColor }}>
                    {insights.improvement > 0 ? '+' : ''}{insights.improvement.toFixed(1)}% {current.mood_trend}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* This Week Stats */}
          <Text className="mt-6 text-lg font-semibold text-gray-900">This Week</Text>
          <View className="mt-3 flex-row gap-3">
            <View className="flex-1 rounded-2xl bg-white p-4 shadow-sm items-center">
              <Text className="text-sm text-gray-500">Mood</Text>
              <Text
                className="mt-1 text-2xl font-bold"
                style={{ color: getColorForScore(current.average_mood) }}
              >
                {current.average_mood.toFixed(0)}
              </Text>
              <Text className="text-xs text-gray-400">{getFeelLabel(current.average_mood)}</Text>
            </View>
            <View className="flex-1 rounded-2xl bg-white p-4 shadow-sm items-center">
              <Text className="text-sm text-gray-500">Energy</Text>
              <Text
                className="mt-1 text-2xl font-bold"
                style={{ color: getColorForScore(current.average_energy) }}
              >
                {current.average_energy.toFixed(0)}
              </Text>
              <Text className="text-xs text-gray-400">{getFeelLabel(current.average_energy)}</Text>
            </View>
            <View className="flex-1 rounded-2xl bg-white p-4 shadow-sm items-center">
              <Text className="text-sm text-gray-500">Feel</Text>
              <Text
                className="mt-1 text-2xl font-bold"
                style={{ color: getColorForScore(current.average_feel) }}
              >
                {current.average_feel.toFixed(0)}
              </Text>
              <Text className="text-xs text-gray-400">{getFeelLabel(current.average_feel)}</Text>
            </View>
          </View>

          {/* Comparison Section */}
          <Text className="mt-6 text-lg font-semibold text-gray-900">vs Last Week</Text>
          <View className="mt-3 flex-row gap-3">
            <View className="flex-1 rounded-2xl bg-white p-4 shadow-sm items-center">
              <Text className="text-sm text-gray-500">Mood</Text>
              <Text className="mt-1 text-lg text-gray-700">{previous.average_mood.toFixed(0)}</Text>
              <Text
                className="text-xs font-semibold"
                style={{ color: moodDiff >= 0 ? '#22c55e' : '#ef4444' }}
              >
                {moodDiff >= 0 ? '+' : ''}{moodDiff}
              </Text>
            </View>
            <View className="flex-1 rounded-2xl bg-white p-4 shadow-sm items-center">
              <Text className="text-sm text-gray-500">Energy</Text>
              <Text className="mt-1 text-lg text-gray-700">{previous.average_energy.toFixed(0)}</Text>
              <Text
                className="text-xs font-semibold"
                style={{ color: energyDiff >= 0 ? '#22c55e' : '#ef4444' }}
              >
                {energyDiff >= 0 ? '+' : ''}{energyDiff}
              </Text>
            </View>
            <View className="flex-1 rounded-2xl bg-white p-4 shadow-sm items-center">
              <Text className="text-sm text-gray-500">Feel</Text>
              <Text className="mt-1 text-lg text-gray-700">{previous.average_feel.toFixed(0)}</Text>
              <Text
                className="text-xs font-semibold"
                style={{ color: feelDiff >= 0 ? '#22c55e' : '#ef4444' }}
              >
                {feelDiff >= 0 ? '+' : ''}{feelDiff}
              </Text>
            </View>
          </View>

          {/* Best / Worst Day */}
          <View className="mt-6 flex-row gap-3">
            <View
              className="flex-1 rounded-2xl p-4 shadow-sm"
              style={{ backgroundColor: '#22c55e15' }}
            >
              <Text className="text-3xl">🌟</Text>
              <Text className="mt-2 text-sm font-semibold text-gray-900">Best Day</Text>
              <Text className="mt-1 text-sm text-gray-600">
                {formatDay(current.best_day)}
              </Text>
            </View>
            <View
              className="flex-1 rounded-2xl p-4 shadow-sm"
              style={{ backgroundColor: '#f9731615' }}
            >
              <Text className="text-3xl">💪</Text>
              <Text className="mt-2 text-sm font-semibold text-gray-900">Tough Day</Text>
              <Text className="mt-1 text-sm text-gray-600">
                {formatDay(current.worst_day)}
              </Text>
              <Text className="mt-1 text-xs text-gray-400">You got through it!</Text>
            </View>
          </View>

          {/* Check-in Progress */}
          <View className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-gray-900">Check-in Progress</Text>
              <Text className="text-sm text-gray-500">
                {current.total_checkins} of 7 days tracked
              </Text>
            </View>
            <View className="mt-3 h-2 rounded-full bg-gray-200">
              <View
                className="h-2 rounded-full"
                style={{
                  width: `${checkinPercent}%`,
                  backgroundColor: '#8b5cf6',
                }}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
