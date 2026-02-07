import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, SectionList, RefreshControl, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../lib/api';
import { FeelCheck, getColorForScore, getFeelLabel } from '../../types/feel';
import { hapticSelection } from '../../lib/haptics';

export default function HistoryScreen() {
  const [checks, setChecks] = useState<FeelCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [scoreFilter, setScoreFilter] = useState('all');
  const limit = 20;

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async (refresh = false) => {
    try {
      const newOffset = refresh ? 0 : offset;
      const res = await api.get(`/feels/history?limit=${limit}&offset=${newOffset}`);
      if (refresh) {
        setChecks(res.data.data || []);
      } else {
        setChecks(prev => [...prev, ...(res.data.data || [])]);
      }
      setTotal(res.data.total || 0);
      setOffset(newOffset + limit);
    } catch (error) {
      console.log('Error loading history:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    setOffset(0);
    loadHistory(true);
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const filteredChecks = useMemo(() => {
    switch (scoreFilter) {
      case 'great':
        return checks.filter((c) => c.feel_score >= 80);
      case 'good':
        return checks.filter((c) => c.feel_score >= 60);
      case 'low':
        return checks.filter((c) => c.feel_score < 40);
      default:
        return checks;
    }
  }, [checks, scoreFilter]);

  const groupByMonth = (data: FeelCheck[]): { title: string; data: FeelCheck[] }[] => {
    const groups: Record<string, FeelCheck[]> = {};
    data.forEach((check) => {
      const date = new Date(check.check_date);
      const key = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(check);
    });
    return Object.entries(groups).map(([title, items]) => ({
      title,
      data: items,
    }));
  };

  const getWeeklyData = (): { day: string; score: number | null; color: string }[] => {
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const today = new Date();
    const result: { day: string; score: number | null; color: string }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayOfWeek = date.getDay();
      const dayLabel = days[dayOfWeek === 0 ? 6 : dayOfWeek - 1];

      const dateStr = date.toISOString().split('T')[0];
      const match = checks.find((c) => c.check_date.startsWith(dateStr));

      result.push({
        day: dayLabel,
        score: match ? match.feel_score : null,
        color: match ? getColorForScore(match.feel_score) : '#374151',
      });
    }

    return result;
  };

  const renderSectionHeader = ({ section }: { section: { title: string; data: FeelCheck[] } }) => (
    <View className="px-4 pt-6 pb-2">
      <Text className="text-lg font-bold text-white">{section.title}</Text>
      <Text className="text-sm text-gray-400">
        {section.data.length} check-in{section.data.length !== 1 ? 's' : ''}
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: FeelCheck }) => {
    const color = getColorForScore(item.feel_score);
    return (
      <View
        className="mx-4 mb-3 rounded-2xl bg-gray-900 p-4 border border-gray-800"
        style={{ borderLeftWidth: 4, borderLeftColor: color }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View
              className="h-16 w-16 items-center justify-center rounded-full"
              style={{
                backgroundColor: color + '20',
                shadowColor: color,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
              }}
            >
              <Text className="text-2xl">{item.mood_emoji || '😊'}</Text>
            </View>
            <View className="ml-3">
              <Text className="text-lg font-semibold text-white">
                {getFeelLabel(item.feel_score)}
              </Text>
              <Text className="text-sm text-gray-400">
                {formatDate(item.check_date)}
              </Text>
              {item.created_at && (
                <Text className="text-xs text-gray-500">
                  {formatTime(item.created_at)}
                </Text>
              )}
            </View>
          </View>
          <View className="items-end">
            <Text className="text-2xl font-bold" style={{ color }}>
              {item.feel_score}
            </Text>
            <View className="flex-row gap-2 mt-1">
              <Text className="text-xs text-gray-500">M:{item.mood_score}</Text>
              <Text className="text-xs text-gray-500">E:{item.energy_score}</Text>
            </View>
          </View>
        </View>
        {item.note && (
          <View className="mt-3 pl-3" style={{ borderLeftWidth: 2, borderLeftColor: '#374151' }}>
            <Text className="text-gray-300 italic">"{item.note}"</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <View className="px-6 pt-8 pb-4">
        <Text className="text-3xl font-bold text-white">History</Text>
        <Text className="mt-1 text-base text-gray-400">
          {total} total check-ins
        </Text>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-4 mb-4"
        contentContainerStyle={{ gap: 8 }}
      >
        {[
          { key: 'all', label: 'All' },
          { key: 'great', label: 'Great (80+)' },
          { key: 'good', label: 'Good (60+)' },
          { key: 'low', label: 'Low (<40)' },
        ].map((filter) => (
          <Pressable
            key={filter.key}
            onPress={() => {
              setScoreFilter(filter.key);
              hapticSelection();
            }}
            className={`rounded-full px-4 py-2 ${
              scoreFilter === filter.key
                ? 'bg-rose-500'
                : 'bg-gray-800'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                scoreFilter === filter.key
                  ? 'text-white'
                  : 'text-gray-300'
              }`}
            >
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <SectionList
        sections={groupByMonth(filteredChecks)}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#f43f5e" />
        }
        onEndReached={() => {
          if (checks.length < total) loadHistory();
        }}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          checks.length > 0 ? (
            <View className="mx-4 mb-4 rounded-2xl bg-gray-900 p-4 border border-gray-800">
              <Text className="text-base font-semibold text-white">This Week</Text>
              <View className="flex-row items-end justify-between mt-3" style={{ height: 60 }}>
                {getWeeklyData().map((item, index) => (
                  <View key={index} className="items-center" style={{ width: 32 }}>
                    <View
                      style={{
                        width: 32,
                        height: item.score !== null ? (item.score / 100) * 60 : 20,
                        backgroundColor: item.color,
                        borderTopLeftRadius: 8,
                        borderTopRightRadius: 8,
                        opacity: item.score !== null ? 1 : 0.3,
                      }}
                    />
                  </View>
                ))}
              </View>
              <View className="flex-row justify-between mt-2">
                {getWeeklyData().map((item, index) => (
                  <Text key={index} className="text-xs text-gray-500 text-center" style={{ width: 32 }}>
                    {item.day}
                  </Text>
                ))}
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-6xl mb-4">📝</Text>
              <Text className="text-lg font-semibold text-white">No check-ins yet</Text>
              <Text className="text-gray-400 mt-2">Start tracking your feels!</Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}
