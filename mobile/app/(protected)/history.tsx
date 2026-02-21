import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../lib/api';
import { FeelCheck, getColorForScore, getFeelLabel } from '../../types/feel';

export default function HistoryScreen() {
  const [checks, setChecks] = useState<FeelCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
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

  const renderItem = ({ item }: { item: FeelCheck }) => {
    const color = getColorForScore(item.feel_score);
    return (
      <View className="mx-4 mb-3 rounded-2xl bg-white p-4 shadow-sm">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View
              className="h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: color + '20' }}
            >
              <Text className="text-2xl">{item.mood_emoji || '😊'}</Text>
            </View>
            <View className="ml-3">
              <Text className="text-lg font-semibold text-gray-900">
                {getFeelLabel(item.feel_score)}
              </Text>
              <Text className="text-sm text-gray-500">
                {formatDate(item.check_date)}
              </Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-2xl font-bold" style={{ color }}>
              {item.feel_score}
            </Text>
            <View className="flex-row gap-2 mt-1">
              <Text className="text-xs text-gray-400">M:{item.mood_score}</Text>
              <Text className="text-xs text-gray-400">E:{item.energy_score}</Text>
            </View>
          </View>
        </View>
        {item.note && (
          <Text className="mt-3 text-gray-600 italic">"{item.note}"</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-6 pt-8 pb-4">
        <Text className="text-3xl font-bold text-gray-900">History</Text>
        <Text className="mt-1 text-base text-gray-500">
          {total} total check-ins
        </Text>
      </View>

      <FlatList
        data={checks}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        onEndReached={() => {
          if (checks.length < total) loadHistory();
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !isLoading ? (
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-6xl mb-4">📝</Text>
              <Text className="text-lg font-semibold text-gray-900">No check-ins yet</Text>
              <Text className="text-gray-500 mt-2">Start tracking your feels!</Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </SafeAreaView>
  );
}
