import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Share, TextInput, Alert } from 'react-native';
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
      setTimeout(() => {
        Alert.alert(
          'Share Your Vibes?',
          'Let your friends know how you are feeling!',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Share', onPress: handleShare },
          ]
        );
      }, 800);
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
      const label = getFeelLabel(todayCheck.feel_score);
      const filled = Math.floor(todayCheck.feel_score / 10);
      const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(10 - filled);
      const message = `${todayCheck.mood_emoji} My Feelsy Check-In\n\n` +
        `Score: ${todayCheck.feel_score}/100 -- ${label}\n` +
        `${bar}\n\n` +
        `Mood: ${todayCheck.mood_score} | Energy: ${todayCheck.energy_score}\n` +
        (todayCheck.note ? `"${todayCheck.note}"\n\n` : '\n') +
        `${stats?.current_streak || 0} day streak\n\n` +
        `Track your vibes -> Feelsy App`;
      await Share.share({ message });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const feelScore = todayCheck?.feel_score ?? Math.round((moodScore + energyScore) / 2);
  const feelColor = getColorForScore(feelScore);

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="px-6 pt-8">
          {/* Header */}
          <Text className="text-3xl font-bold text-white">
            Hey there
          </Text>
          <Text className="mt-1 text-base text-gray-400">
            How are you feeling today?
          </Text>

          {/* Today's Check-in Card */}
          {todayCheck ? (
            <View
              className="mt-6 rounded-3xl bg-gray-900 p-6 border border-gray-800 overflow-hidden"
            >
              {/* Colored top banner */}
              <View
                className="h-3 rounded-t-3xl -mx-6 -mt-6 mb-4"
                style={{ backgroundColor: feelColor }}
              />

              <Text className="text-sm font-medium text-gray-400">Today's Feelsy Score</Text>

              <View className="mt-4 items-center">
                {/* Daily Check-In Complete badge */}
                <View className="bg-green-900/40 px-3 py-1 rounded-full mb-3 border border-green-800">
                  <Text className="text-green-400 text-sm font-medium">Daily Check-In Complete</Text>
                </View>

                <View
                  className="h-36 w-36 items-center justify-center rounded-full"
                  style={{ backgroundColor: feelColor + '20' }}
                >
                  <Text className="text-5xl">{todayCheck.mood_emoji}</Text>
                </View>
                <Text className="mt-4 text-5xl font-bold" style={{ color: feelColor }}>
                  {todayCheck.feel_score}
                </Text>
                <Text className="mt-1 text-lg font-medium text-gray-300">
                  {getFeelLabel(todayCheck.feel_score)}
                </Text>

                <View className="mt-4 flex-row gap-4">
                  <View className="items-center">
                    <Text className="text-sm text-gray-400">Mood</Text>
                    <Text className="text-lg font-semibold text-white">{todayCheck.mood_score}</Text>
                  </View>
                  <View className="h-8 w-px bg-gray-700" />
                  <View className="items-center">
                    <Text className="text-sm text-gray-400">Energy</Text>
                    <Text className="text-lg font-semibold text-white">{todayCheck.energy_score}</Text>
                  </View>
                </View>

                {/* Streak info */}
                <View className="mt-3 flex-row items-center">
                  <Text className="text-sm text-gray-400">{stats?.current_streak || 0} day streak</Text>
                </View>

                {todayCheck.note && (
                  <Text className="mt-4 text-center text-gray-300 italic">
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
            <View className="mt-6 rounded-3xl bg-gray-900 p-6 border border-gray-800">
              {!showCheckin ? (
                <Pressable
                  onPress={() => { setShowCheckin(true); hapticSelection(); }}
                  className="items-center py-8"
                >
                  <Text className="text-6xl">✨</Text>
                  <Text className="mt-4 text-xl font-semibold text-white">
                    Log Today's Feels
                  </Text>
                  <Text className="mt-2 text-gray-400">
                    Tap to start your daily check-in
                  </Text>
                </Pressable>
              ) : (
                <View>
                  <Text className="text-lg font-semibold text-white mb-4">Daily Check-In</Text>

                  {/* Mood Score */}
                  <View className="mb-6">
                    <Text className="text-sm font-medium text-gray-300 mb-2">
                      Mood: {moodScore}
                    </Text>
                    <View className="flex-row items-center">
                      <Text className="text-xl mr-2">😔</Text>
                      <View className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
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
                    <Text className="text-sm font-medium text-gray-300 mb-2">
                      Energy: {energyScore}
                    </Text>
                    <View className="flex-row items-center">
                      <Text className="text-xl mr-2">😴</Text>
                      <View className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
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
                    <Text className="text-sm font-medium text-gray-300 mb-2">How do you feel?</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View className="flex-row gap-2">
                        {MOOD_EMOJIS.map((emoji) => (
                          <Pressable
                            key={emoji}
                            onPress={() => { setSelectedEmoji(emoji); hapticSelection(); }}
                            className={`w-12 h-12 items-center justify-center rounded-full ${
                              selectedEmoji === emoji ? 'bg-rose-900/40' : 'bg-gray-800'
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
                    <Text className="text-sm font-medium text-gray-300 mb-2">Add a note (optional)</Text>
                    <TextInput
                      value={note}
                      onChangeText={setNote}
                      placeholder="What's on your mind?"
                      placeholderTextColor="#6b7280"
                      className="bg-gray-800 rounded-xl px-4 py-3 text-base text-white"
                      multiline
                      numberOfLines={2}
                    />
                  </View>

                  {/* Preview Score */}
                  <View className="items-center mb-6 p-4 rounded-2xl" style={{ backgroundColor: feelColor + '15' }}>
                    <Text className="text-sm text-gray-300">Your Feelsy Score</Text>
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
              <View className="flex-1 rounded-2xl bg-gray-900 p-4 border border-gray-800">
                <Text className="text-3xl">🔥</Text>
                <Text className="mt-2 text-2xl font-bold text-white">{stats.current_streak}</Text>
                <Text className="text-sm text-gray-400">Day Streak</Text>
              </View>
              <View className="flex-1 rounded-2xl bg-gray-900 p-4 border border-gray-800">
                <Text className="text-3xl">📊</Text>
                <Text className="mt-2 text-2xl font-bold text-white">{stats.total_check_ins}</Text>
                <Text className="text-sm text-gray-400">Check-ins</Text>
              </View>
              <View className="flex-1 rounded-2xl bg-gray-900 p-4 border border-gray-800">
                <Text className="text-3xl">✨</Text>
                <Text className="mt-2 text-2xl font-bold text-white">{Math.round(stats.average_score)}</Text>
                <Text className="text-sm text-gray-400">Avg Score</Text>
              </View>
            </View>
          )}

          {/* Badges */}
          {stats && stats.unlocked_badges.length > 0 && (
            <View className="mt-6 rounded-2xl bg-gray-900 p-4 border border-gray-800">
              <Text className="text-lg font-semibold text-white mb-3">Your Badges</Text>
              <View className="flex-row flex-wrap gap-2">
                {stats.unlocked_badges.map((badge) => (
                  <View key={badge} className="bg-rose-900/30 px-3 py-1 rounded-full border border-rose-800">
                    <Text className="text-rose-300">{badge}</Text>
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
