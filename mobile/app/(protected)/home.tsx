import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { hapticSuccess, hapticError, hapticSelection, hapticMedium } from '../../lib/haptics';
import { getColorForScore, getFeelLabel } from '../../types/feel';
import type { FeelCheck, FeelStats, WeeklyRecap } from '../../types/feel';

const MOOD_OPTIONS = [
  { score: 20, emoji: '😢', label: 'Bad' },
  { score: 40, emoji: '😔', label: 'Low' },
  { score: 60, emoji: '😌', label: 'Okay' },
  { score: 80, emoji: '😊', label: 'Good' },
  { score: 100, emoji: '🤩', label: 'Great' },
];

const ENERGY_OPTIONS = [
  { score: 20, label: 'Drained' },
  { score: 40, label: 'Low' },
  { score: 60, label: 'Steady' },
  { score: 80, label: 'Energized' },
  { score: 100, label: 'Peak' },
];

const TAGS = ['Work', 'Family', 'Health', 'Social', 'Creative', 'Exercise', 'Nature', 'Rest'];

const GUEST_USAGE_KEY = 'feelsy_guest_usage';
const MAX_FREE_USES = 3;
const PRIMARY_COLOR = '#f43f5e';

const CELEBRATION_DATA: Record<string, { emoji: string; message: string }> = {
  streak_3: { emoji: '🔥', message: '3 Day Streak! You are building a habit!' },
  streak_7: { emoji: '⭐', message: '1 Week Streak! Incredible consistency!' },
  streak_14: { emoji: '👑', message: '2 Week Streak! You are unstoppable!' },
  streak_30: { emoji: '💎', message: '30 Day Streak! Legendary!' },
  total_10: { emoji: '📊', message: '10 Check-ins! Great dedication!' },
  total_50: { emoji: '⭐', message: '50 Check-ins! A true tracker!' },
  total_100: { emoji: '💎', message: '100 Check-ins! Diamond status!' },
};

export default function HomeScreen() {
  const { user, isGuest, canUseFeature, incrementGuestUsage } = useAuth();
  const router = useRouter();

  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string>('');
  const [note, setNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [todayCheck, setTodayCheck] = useState<FeelCheck | null>(null);
  const [stats, setStats] = useState<FeelStats | null>(null);
  const [recap, setRecap] = useState<WeeklyRecap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRecap, setShowRecap] = useState(false);

  // Journal
  const [showJournal, setShowJournal] = useState(false);
  const [journalText, setJournalText] = useState('');
  const [isSavingJournal, setIsSavingJournal] = useState(false);

  // Celebration
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{ badge: string; emoji: string; message: string } | null>(null);
  const prevBadgesRef = useRef<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (!isGuest) {
        const [todayRes, statsRes] = await Promise.all([
          api.get('/feels/today').catch(() => null),
          api.get('/feels/stats').catch(() => null),
        ]);

        if (todayRes?.data && !todayRes.data.error) {
          setTodayCheck(todayRes.data);
        }
        if (statsRes?.data) {
          setStats(statsRes.data);
          prevBadgesRef.current = statsRes.data.unlocked_badges || [];
        }

        // Load recap on Mondays
        const isMonday = new Date().getDay() === 1;
        if (isMonday) {
          try {
            const lastDismissed = await AsyncStorage.getItem('last_recap_dismissed');
            const today = new Date().toDateString();
            if (lastDismissed !== today) {
              const recapRes = await api.get('/feels/recap');
              if (recapRes?.data && !recapRes.data.error) {
                setRecap(recapRes.data);
                setShowRecap(true);
              }
            }
          } catch {
            // No recap data
          }
        }
      }
    } catch (error) {
      console.log('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const dismissRecap = async () => {
    setShowRecap(false);
    await AsyncStorage.setItem('last_recap_dismissed', new Date().toDateString());
  };

  const handleSubmit = async () => {
    if (!mood) {
      hapticError();
      Alert.alert('Missing Mood', 'Please select how you are feeling first.');
      return;
    }

    if (isGuest && !canUseFeature()) {
      Alert.alert('Limit Reached', 'You have used your free guest entries. Sign up to continue tracking!');
      router.push('/(protected)/paywall' as any);
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedMood = MOOD_OPTIONS.find((m) => m.score === mood);
      const tagStr = selectedTags.length > 0 ? `[${selectedTags.join(', ')}] ` : '';

      const entry = {
        mood_score: mood,
        energy_score: energy || mood, // Default energy to mood if not set
        mood_emoji: selectedEmoji || selectedMood?.emoji || '',
        note: tagStr + note.trim(),
      };

      if (!isGuest) {
        const res = await api.post('/feels', entry);
        setTodayCheck(res.data);

        // Re-fetch stats to check for new badges
        const statsRes = await api.get('/feels/stats');
        if (statsRes.data) {
          const newBadges = (statsRes.data.unlocked_badges || []) as string[];
          const oldBadges = prevBadgesRef.current;

          // Check for new badges
          for (const badge of newBadges) {
            if (!oldBadges.includes(badge) && CELEBRATION_DATA[badge]) {
              setCelebrationData({ badge, ...CELEBRATION_DATA[badge] });
              setShowCelebration(true);
              break;
            }
          }

          setStats(statsRes.data);
          prevBadgesRef.current = newBadges;
        }
      } else {
        await incrementGuestUsage();
        // Track guest usage
        const usageStr = await AsyncStorage.getItem(GUEST_USAGE_KEY);
        const usage = usageStr ? parseInt(usageStr, 10) : 0;
        if (usage >= MAX_FREE_USES - 1) {
          Alert.alert(
            'Last Free Use',
            'This was your last free check-in. Sign up to continue tracking!',
            [
              { text: 'Later', style: 'cancel' },
              {
                text: 'Sign Up',
                onPress: () => router.push('/(auth)/login' as any),
              },
            ]
          );
        }
      }

      hapticSuccess();

      // Reset Form
      setMood(null);
      setEnergy(null);
      setSelectedEmoji('');
      setNote('');
      setSelectedTags([]);

      // Journal prompt (only for authenticated users)
      if (!isGuest && !showCelebration) {
        Alert.alert(
          'Logged!',
          `You are feeling ${selectedMood?.label} today.`,
          [
            { text: 'OK', style: 'cancel' },
            {
              text: 'Add Journal',
              onPress: () => setShowJournal(true),
            },
            {
              text: 'Share',
              onPress: () => {
                Share.share({
                  message: `I'm feeling ${selectedMood?.emoji} ${selectedMood?.label} today! Check in with your feelings on Feelsy.`,
                });
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error(error);
      hapticError();
      const msg = error?.response?.data?.message || 'Could not save your entry. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveJournal = async () => {
    if (!todayCheck?.id || !journalText.trim()) {
      setShowJournal(false);
      return;
    }
    setIsSavingJournal(true);
    try {
      const res = await api.put(`/feels/${todayCheck.id}/journal`, {
        journal_entry: journalText.trim(),
      });
      if (res.data) {
        setTodayCheck(res.data);
      }
      hapticSuccess();
      setShowJournal(false);
      setJournalText('');
    } catch {
      hapticError();
      Alert.alert('Error', 'Failed to save journal entry.');
    } finally {
      setIsSavingJournal(false);
    }
  };

  const toggleTag = (tag: string) => {
    hapticSelection();
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="mt-4 mb-6 flex-row justify-between items-center">
            <View>
              <Text className="text-gray-400 text-sm font-medium">Welcome back</Text>
              <Text className="text-white text-2xl font-bold">
                {isGuest ? 'Guest' : user?.email?.split('@')[0]}
              </Text>
            </View>

            {/* Streak Badge */}
            <Pressable
              className="bg-gray-900 rounded-full px-4 py-2 flex-row items-center border border-gray-800"
              accessibilityLabel={`${stats?.current_streak ?? 0} day streak`}
              accessibilityRole="text"
            >
              <Ionicons name="flame" size={20} color="#f59e0b" />
              <Text className="text-white font-bold ml-2">{stats?.current_streak ?? 0}</Text>
            </Pressable>
          </View>

          {/* Weekly Recap Card (Monday only) */}
          {showRecap && recap && (
            <View className="mb-6 rounded-3xl p-6 border border-rose-500/30" style={{ backgroundColor: '#f43f5e10' }}>
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-semibold text-white">Your Week in Review</Text>
                <Pressable onPress={dismissRecap}>
                  <Ionicons name="close" size={20} color="#9ca3af" />
                </Pressable>
              </View>
              <View className="flex-row items-end justify-between mb-3" style={{ height: 50 }}>
                {recap.daily_scores.map((score, idx) => (
                  <View key={idx} className="items-center" style={{ width: 32 }}>
                    <View
                      style={{
                        width: 24,
                        height: score > 0 ? (score / 100) * 50 : 10,
                        backgroundColor: score > 0 ? PRIMARY_COLOR : '#374151',
                        borderTopLeftRadius: 6,
                        borderTopRightRadius: 6,
                        opacity: score > 0 ? 1 : 0.3,
                      }}
                    />
                  </View>
                ))}
              </View>
              <View className="flex-row justify-between mt-2">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                  <Text key={idx} className="text-xs text-gray-500 text-center" style={{ width: 32 }}>
                    {day}
                  </Text>
                ))}
              </View>
              <View className="flex-row justify-between mt-3">
                <Text className="text-sm text-gray-300">
                  Avg: {Math.round(recap.average_score)} {recap.top_emoji}
                </Text>
                <Text className="text-sm text-gray-300">
                  Best: {recap.best_day}
                </Text>
                <Text className="text-sm text-gray-300">
                  Streak: {recap.current_streak}
                </Text>
              </View>
            </View>
          )}

          {/* Today's Check-in Already Done */}
          {todayCheck && (
            <View
              className="mb-6 rounded-3xl p-6 border border-gray-800"
              style={{ backgroundColor: getColorForScore(todayCheck.feel_score) + '10' }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Text className="text-4xl mr-3">{todayCheck.mood_emoji || '😊'}</Text>
                  <View>
                    <Text className="text-lg font-semibold text-white">
                      {getFeelLabel(todayCheck.feel_score)}
                    </Text>
                    <Text className="text-sm text-gray-400">
                      Score: {todayCheck.feel_score}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() =>
                    Share.share({
                      message: `I'm feeling ${todayCheck.mood_emoji} ${getFeelLabel(todayCheck.feel_score)} today (${todayCheck.feel_score}/100)! Track your feelings on Feelsy.`,
                    })
                  }
                  className="bg-gray-800 rounded-full p-2"
                  accessibilityLabel="Share your mood results"
                  accessibilityRole="button"
                >
                  <Ionicons name="share-outline" size={20} color="#9ca3af" />
                </Pressable>
              </View>
              {todayCheck.note ? (
                <Text className="mt-3 text-sm text-gray-300 italic">"{todayCheck.note}"</Text>
              ) : null}
              {todayCheck.journal_entry ? (
                <View className="mt-3 p-3 rounded-xl bg-gray-900/50 border border-gray-800">
                  <View className="flex-row items-center mb-1">
                    <Text className="text-sm">📖</Text>
                    <Text className="ml-2 text-xs font-semibold text-gray-400">Journal</Text>
                  </View>
                  <Text className="text-sm text-gray-300 italic">{todayCheck.journal_entry}</Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Main Check-in Card */}
          {!todayCheck && (
            <View className="bg-gray-900 rounded-3xl p-6 mb-6 border border-gray-800 shadow-lg shadow-black/20">
              <Text className="text-white text-xl font-semibold mb-4">How are you feeling?</Text>

              {/* Mood Grid */}
              <View className="flex-row justify-between mb-4">
                {MOOD_OPTIONS.map((option) => (
                  <Pressable
                    key={option.score}
                    onPress={() => {
                      hapticSelection();
                      setMood(option.score);
                      if (!selectedEmoji) setSelectedEmoji(option.emoji);
                    }}
                    className={`items-center justify-center w-16 h-20 rounded-2xl border-2 ${
                      mood === option.score
                        ? 'border-rose-500 bg-rose-500/10'
                        : 'border-gray-800 bg-gray-800/50'
                    }`}
                    accessibilityLabel={`Set mood to ${option.label}`}
                    accessibilityRole="button"
                  >
                    <Text className="text-3xl mb-1">{option.emoji}</Text>
                    <Text
                      className={`text-xs font-medium ${
                        mood === option.score ? 'text-rose-500' : 'text-gray-400'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Energy Level */}
              <Text className="text-white text-sm font-medium mb-2">Energy Level</Text>
              <View className="flex-row justify-between mb-4">
                {ENERGY_OPTIONS.map((option) => (
                  <Pressable
                    key={option.score}
                    onPress={() => {
                      hapticSelection();
                      setEnergy(option.score);
                    }}
                    className={`items-center justify-center px-3 py-2 rounded-xl border ${
                      energy === option.score
                        ? 'border-rose-500 bg-rose-500/10'
                        : 'border-gray-800 bg-gray-800/50'
                    }`}
                    accessibilityLabel={`Set energy to ${option.label}`}
                    accessibilityRole="button"
                  >
                    <Text
                      className={`text-xs font-medium ${
                        energy === option.score ? 'text-rose-500' : 'text-gray-400'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Tags */}
              <Text className="text-white text-sm font-medium mb-2">Tags</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {TAGS.map((tag) => (
                  <Pressable
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full border ${
                      selectedTags.includes(tag)
                        ? 'border-rose-500 bg-rose-500/10'
                        : 'border-gray-700 bg-gray-800/50'
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        selectedTags.includes(tag) ? 'text-rose-500' : 'text-gray-400'
                      }`}
                    >
                      {tag}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Note Input */}
              <TextInput
                className="bg-gray-950 text-white rounded-xl p-4 text-base border border-gray-800 mb-4"
                placeholder="Add a note (optional)..."
                placeholderTextColor="#6b7280"
                value={note}
                onChangeText={setNote}
                multiline
                textAlignVertical="top"
                style={{ minHeight: 80 }}
              />

              {/* Submit Button */}
              <Pressable
                onPress={handleSubmit}
                disabled={isSubmitting || !mood}
                className={`rounded-xl p-4 items-center justify-center ${
                  isSubmitting || !mood ? 'bg-gray-800' : 'bg-rose-500'
                }`}
                accessibilityLabel="Log your mood check-in"
                accessibilityRole="button"
                accessibilityHint="Submits your daily mood check-in"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold text-lg">Log Feel</Text>
                )}
              </Pressable>
            </View>
          )}

          {/* Stats Row */}
          {stats && (stats.total_check_ins > 0) && (
            <View className="flex-row gap-3 mb-6">
              <View className="flex-1 rounded-2xl bg-gray-900 p-3 border border-gray-800 items-center">
                <Text className="text-sm text-gray-400">Best Streak</Text>
                <Text className="text-lg font-bold text-white">{stats.longest_streak}</Text>
              </View>
              <View className="flex-1 rounded-2xl bg-gray-900 p-3 border border-gray-800 items-center">
                <Text className="text-sm text-gray-400">Total</Text>
                <Text className="text-lg font-bold text-white">{stats.total_check_ins}</Text>
              </View>
              <View className="flex-1 rounded-2xl bg-gray-900 p-3 border border-gray-800 items-center">
                <Text className="text-sm text-gray-400">Average</Text>
                <Text
                  className="text-lg font-bold"
                  style={{ color: getColorForScore(stats.average_score) }}
                >
                  {Math.round(stats.average_score)}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Journal Modal */}
      <Modal visible={showJournal} animationType="slide" transparent>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="bg-gray-900 rounded-t-3xl p-6 border-t border-gray-800">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-white">Journal Entry</Text>
              <Pressable onPress={() => setShowJournal(false)}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </Pressable>
            </View>
            <Text className="text-sm text-gray-400 mb-3">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            <TextInput
              className="bg-gray-950 text-white rounded-2xl p-4 text-base border border-gray-800 mb-3"
              placeholder="Write about your day..."
              placeholderTextColor="#6b7280"
              value={journalText}
              onChangeText={setJournalText}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              style={{ minHeight: 200 }}
            />
            <Text className="text-xs text-gray-500 mb-4 text-right">
              {journalText.length} characters
            </Text>
            <Pressable
              onPress={handleSaveJournal}
              disabled={isSavingJournal}
              className="rounded-xl p-4 items-center justify-center bg-rose-500"
            >
              {isSavingJournal ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-lg">Save Journal</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Celebration Overlay */}
      <Modal visible={showCelebration} animationType="fade" transparent>
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View className="rounded-3xl bg-gray-900 p-8 mx-8 border border-gray-700 items-center" style={{ shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20 }}>
            <Text className="text-7xl mb-4">{celebrationData?.emoji}</Text>
            <Text className="text-2xl font-bold text-white text-center">
              Badge Unlocked!
            </Text>
            <Text className="text-base text-gray-300 text-center mt-3">
              {celebrationData?.message}
            </Text>
            <Pressable
              onPress={() => {
                hapticSuccess();
                setShowCelebration(false);
              }}
              className="mt-6 rounded-xl px-8 py-3 bg-rose-500"
            >
              <Text className="text-white font-semibold text-lg">Awesome!</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
