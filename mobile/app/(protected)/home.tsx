import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Share, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import api from '../../lib/api';
import { hapticSuccess, hapticSelection, hapticMedium } from '../../lib/haptics';
import { FeelCheck, FeelStats, MOOD_EMOJIS, getColorForScore, getFeelLabel } from '../../types/feel';

export default function HomeScreen() {
  const { user } = useAuth();
  const [todayCheck, setTodayCheck] = useState<FeelCheck | null>(null);
  const [stats, setStats] = useState<FeelStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);

  // Check-in form state
  const [moodScore, setMoodScore] = useState(50);
  const [energyScore, setEnergyScore] = useState(50);
  const [selectedEmoji, setSelectedEmoji] = useState('😊');
  const [note, setNote] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [todayRes, statsRes] = await Promise.all([
        api.get('/feels/today').catch(() => null),
        api.get('/feels/stats'),
      ]);
      if (todayRes?.data) setTodayCheck(todayRes.data);
      if (statsRes?.data) setStats(statsRes.data);
    } catch (error) {
      console.log('Error loading data:', error);
    }
  };

  const handleCheckIn = async () => {
    setIsLoading(true);
    try {
      const res = await api.post('/feels', {
        mood_score: moodScore,
        energy_score: energyScore,
        mood_emoji: selectedEmoji,
        note,
      });
      setTodayCheck(res.data);
      setShowCheckin(false);
      hapticSuccess();
      loadData();
    } catch (error: any) {
      console.log('Check-in error:', error.response?.data?.message || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!todayCheck) return;
    hapticMedium();
    try {
      await Share.share({
        message: `${selectedEmoji} My Feelsy Score: ${todayCheck.feel_score}/100 - ${getFeelLabel(todayCheck.feel_score)}!\n\nTrack your daily vibes with Feelsy`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const feelScore = todayCheck?.feel_score ?? Math.round((moodScore + energyScore) / 2);
  const feelColor = getColorForScore(feelScore);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="px-6 pt-8">
          {/* Header */}
          <Text className="text-3xl font-bold text-gray-900">
            Hey there
          </Text>
          <Text className="mt-1 text-base text-gray-500">
            How are you feeling today?
          </Text>

          {/* Today's Check-in Card */}
          {todayCheck ? (
            <View className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
              <Text className="text-sm font-medium text-gray-500">Today's Feelsy Score</Text>
              <View className="mt-4 items-center">
                <View
                  className="h-32 w-32 items-center justify-center rounded-full"
                  style={{ backgroundColor: feelColor + '20' }}
                >
                  <Text className="text-5xl">{todayCheck.mood_emoji}</Text>
                </View>
                <Text className="mt-4 text-5xl font-bold" style={{ color: feelColor }}>
                  {todayCheck.feel_score}
                </Text>
                <Text className="mt-1 text-lg font-medium text-gray-600">
                  {getFeelLabel(todayCheck.feel_score)}
                </Text>

                <View className="mt-4 flex-row gap-4">
                  <View className="items-center">
                    <Text className="text-sm text-gray-500">Mood</Text>
                    <Text className="text-lg font-semibold text-gray-900">{todayCheck.mood_score}</Text>
                  </View>
                  <View className="h-8 w-px bg-gray-200" />
                  <View className="items-center">
                    <Text className="text-sm text-gray-500">Energy</Text>
                    <Text className="text-lg font-semibold text-gray-900">{todayCheck.energy_score}</Text>
                  </View>
                </View>

                {todayCheck.note && (
                  <Text className="mt-4 text-center text-gray-600 italic">
                    "{todayCheck.note}"
                  </Text>
                )}
              </View>

              <Button
                title="Share Your Vibes"
                variant="outline"
                onPress={handleShare}
                size="md"
              />
            </View>
          ) : (
            // Check-in Form
            <View className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
              {!showCheckin ? (
                <Pressable
                  onPress={() => { setShowCheckin(true); hapticSelection(); }}
                  className="items-center py-8"
                >
                  <Text className="text-6xl">✨</Text>
                  <Text className="mt-4 text-xl font-semibold text-gray-900">
                    Log Today's Feels
                  </Text>
                  <Text className="mt-2 text-gray-500">
                    Tap to start your daily check-in
                  </Text>
                </Pressable>
              ) : (
                <View>
                  <Text className="text-lg font-semibold text-gray-900 mb-4">Daily Check-In</Text>

                  {/* Mood Score */}
                  <View className="mb-6">
                    <Text className="text-sm font-medium text-gray-700 mb-2">
                      Mood: {moodScore}
                    </Text>
                    <View className="flex-row items-center">
                      <Text className="text-xl mr-2">😔</Text>
                      <View className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <View
                          className="h-full rounded-full"
                          style={{ width: `${moodScore}%`, backgroundColor: getColorForScore(moodScore) }}
                        />
                      </View>
                      <Text className="text-xl ml-2">😊</Text>
                    </View>
                    <View className="flex-row justify-between mt-2">
                      {[20, 40, 60, 80, 100].map((val) => (
                        <Pressable
                          key={val}
                          onPress={() => { setMoodScore(val); hapticSelection(); }}
                          className="px-3 py-1 rounded-full"
                          style={{ backgroundColor: moodScore === val ? getColorForScore(val) + '30' : 'transparent' }}
                        >
                          <Text style={{ color: getColorForScore(val) }}>{val}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Energy Score */}
                  <View className="mb-6">
                    <Text className="text-sm font-medium text-gray-700 mb-2">
                      Energy: {energyScore}
                    </Text>
                    <View className="flex-row items-center">
                      <Text className="text-xl mr-2">😴</Text>
                      <View className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <View
                          className="h-full rounded-full"
                          style={{ width: `${energyScore}%`, backgroundColor: getColorForScore(energyScore) }}
                        />
                      </View>
                      <Text className="text-xl ml-2">⚡</Text>
                    </View>
                    <View className="flex-row justify-between mt-2">
                      {[20, 40, 60, 80, 100].map((val) => (
                        <Pressable
                          key={val}
                          onPress={() => { setEnergyScore(val); hapticSelection(); }}
                          className="px-3 py-1 rounded-full"
                          style={{ backgroundColor: energyScore === val ? getColorForScore(val) + '30' : 'transparent' }}
                        >
                          <Text style={{ color: getColorForScore(val) }}>{val}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Emoji Selector */}
                  <View className="mb-6">
                    <Text className="text-sm font-medium text-gray-700 mb-2">How do you feel?</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View className="flex-row gap-2">
                        {MOOD_EMOJIS.map((emoji) => (
                          <Pressable
                            key={emoji}
                            onPress={() => { setSelectedEmoji(emoji); hapticSelection(); }}
                            className={`w-12 h-12 items-center justify-center rounded-full ${
                              selectedEmoji === emoji ? 'bg-primary-100' : 'bg-gray-100'
                            }`}
                          >
                            <Text className="text-2xl">{emoji}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>
                  </View>

                  {/* Note */}
                  <View className="mb-6">
                    <Text className="text-sm font-medium text-gray-700 mb-2">Add a note (optional)</Text>
                    <TextInput
                      value={note}
                      onChangeText={setNote}
                      placeholder="What's on your mind?"
                      className="bg-gray-100 rounded-xl px-4 py-3 text-base"
                      multiline
                      numberOfLines={2}
                    />
                  </View>

                  {/* Preview Score */}
                  <View className="items-center mb-6 p-4 rounded-2xl" style={{ backgroundColor: feelColor + '15' }}>
                    <Text className="text-sm text-gray-600">Your Feelsy Score</Text>
                    <Text className="text-4xl font-bold" style={{ color: feelColor }}>{feelScore}</Text>
                    <Text className="text-lg" style={{ color: feelColor }}>{getFeelLabel(feelScore)}</Text>
                  </View>

                  <Button
                    title="Log My Feels"
                    onPress={handleCheckIn}
                    isLoading={isLoading}
                    size="lg"
                  />
                </View>
              )}
            </View>
          )}

          {/* Stats Cards */}
          {stats && (
            <View className="mt-6 flex-row gap-3">
              <View className="flex-1 rounded-2xl bg-white p-4 shadow-sm">
                <Text className="text-3xl">🔥</Text>
                <Text className="mt-2 text-2xl font-bold text-gray-900">{stats.current_streak}</Text>
                <Text className="text-sm text-gray-500">Day Streak</Text>
              </View>
              <View className="flex-1 rounded-2xl bg-white p-4 shadow-sm">
                <Text className="text-3xl">📊</Text>
                <Text className="mt-2 text-2xl font-bold text-gray-900">{stats.total_check_ins}</Text>
                <Text className="text-sm text-gray-500">Check-ins</Text>
              </View>
              <View className="flex-1 rounded-2xl bg-white p-4 shadow-sm">
                <Text className="text-3xl">✨</Text>
                <Text className="mt-2 text-2xl font-bold text-gray-900">{Math.round(stats.average_score)}</Text>
                <Text className="text-sm text-gray-500">Avg Score</Text>
              </View>
            </View>
          )}

          {/* Badges */}
          {stats && stats.unlocked_badges.length > 0 && (
            <View className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
              <Text className="text-lg font-semibold text-gray-900 mb-3">Your Badges</Text>
              <View className="flex-row flex-wrap gap-2">
                {stats.unlocked_badges.map((badge) => (
                  <View key={badge} className="bg-primary-50 px-3 py-1 rounded-full">
                    <Text className="text-primary-700">{badge}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
