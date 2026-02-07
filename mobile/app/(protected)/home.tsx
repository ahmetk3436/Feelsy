import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Alert, Share, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { hapticSuccess, hapticError, hapticSelection } from '../../lib/haptics';

const MOOD_OPTIONS = [
  { score: 20, emoji: '😢', label: 'Bad' },
  { score: 40, emoji: '😔', label: 'Low' },
  { score: 60, emoji: '😌', label: 'Okay' },
  { score: 80, emoji: '😊', label: 'Good' },
  { score: 100, emoji: '🤩', label: 'Great' },
];

const GUEST_USAGE_KEY = 'feelsy_guest_usage';
const STREAK_KEY = 'feelsy_streak';
const MAX_FREE_USES = 3;
const PRIMARY_COLOR = '#f43f5e';

export default function HomeScreen() {
  const { user, isGuest, canUseFeature, incrementGuestUsage } = useAuth();
  const router = useRouter();
  
  const [mood, setMood] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    loadHistory();
    loadStreak();
  }, []);

  const loadStreak = async () => {
    try {
      const streakData = await AsyncStorage.getItem(STREAK_KEY);
      if (streakData) {
        const { count } = JSON.parse(streakData);
        setStreak(count);
      }
    } catch (e) {
      console.error('Failed to load streak', e);
    }
  };

  const loadHistory = async () => {
    try {
      // Try API first if authenticated
      if (!isGuest) {
        const res = await api.get('/feels/history');
        setHistory(res.data || []);
      } else {
        // Load local history for guests
        const localHistory = await AsyncStorage.getItem('feelsy_local_history');
        setHistory(localHistory ? JSON.parse(localHistory) : []);
      }
    } catch (error) {
      console.log('Error loading history:', error);
      // Fallback to local storage on error
      try {
        const localHistory = await AsyncStorage.getItem('feelsy_local_history');
        setHistory(localHistory ? JSON.parse(localHistory) : []);
      } catch (e) {
        setHistory([]);
      }
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSubmit = async () => {
    if (!mood) {
      hapticError();
      Alert.alert('Missing Mood', 'Please select how you are feeling first.');
      return;
    }

    if (isGuest && !canUseFeature()) {
      Alert.alert('Limit Reached', 'You have used your free guest entries. Sign up to continue tracking!');
      router.push('/(protected)/paywall');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedMood = MOOD_OPTIONS.find(m => m.score === mood);
      
      // Prepare data
      const entry = {
        mood_score: mood,
        mood_label: selectedMood?.label,
        note: note.trim(),
        timestamp: new Date().toISOString(),
      };

      // API Call or Local Storage
      if (!isGuest) {
        await api.post('/feels', entry);
      } else {
        await incrementGuestUsage();
        const localHistory = await AsyncStorage.getItem('feelsy_local_history');
        const currentHistory = localHistory ? JSON.parse(localHistory) : [];
        const newHistory = [entry, ...currentHistory].slice(0, 10); // Keep last 10
        await AsyncStorage.setItem('feelsy_local_history', JSON.stringify(newHistory));
        setHistory(newHistory);
      }

      // Update Streak
      const lastDate = await AsyncStorage.getItem('feelsy_last_entry_date');
      const today = new Date().toDateString();
      let newStreak = streak;
      
      if (lastDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastDate === yesterday.toDateString()) {
          newStreak = streak + 1;
        } else if (lastDate !== today) {
          newStreak = 1; // Reset or start new
        }
        
        await AsyncStorage.setItem(STREAK_KEY, JSON.stringify({ count: newStreak }));
        await AsyncStorage.setItem('feelsy_last_entry_date', today);
        setStreak(newStreak);
      }

      hapticSuccess();
      
      // Reset Form
      setMood(null);
      setNote('');

      // Share Prompt
      Alert.alert(
        'Logged!',
        `You're feeling ${selectedMood?.label} today.`,
        [
          { text: 'OK', style: 'cancel' },
          { 
            text: 'Share', 
            onPress: () => {
              Share.share({
                message: `I'm feeling ${selectedMood?.emoji} ${selectedMood?.label} today! Check in with your feelings on Feelsy.`,
              });
            }
          },
        ]
      );

    } catch (error) {
      console.error(error);
      hapticError();
      Alert.alert('Error', 'Could not save your entry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <View className="bg-gray-900 rounded-full px-4 py-2 flex-row items-center border border-gray-800">
              <Ionicons name="flame" size={20} color="#f59e0b" />
              <Text className="text-white font-bold ml-2">{streak}</Text>
            </View>
          </View>

          {/* Main Card */}
          <View className="bg-gray-900 rounded-3xl p-6 mb-6 border border-gray-800 shadow-lg shadow-black/20">
            <Text className="text-white text-xl font-semibold mb-4">How are you feeling?</Text>
            
            {/* Mood Grid */}
            <View className="flex-row justify-between mb-6">
              {MOOD_OPTIONS.map((option) => (
                <Pressable
                  key={option.score}
                  onPress={() => {
                    hapticSelection();
                    setMood(option.score);
                  }}
                  className={`items-center justify-center w-16 h-20 rounded-2xl border-2 transition-all ${
                    mood === option.score 
                      ? 'border-rose-500 bg-rose-500/10' 
                      : 'border-gray-800 bg-gray-800/50'
                  }`}
                >
                  <Text className="text-3xl mb-1">{option.emoji}</Text>
                  <Text className={`text-xs font-medium ${
                    mood === option.score ? 'text-rose-500' : 'text-gray-400'
                  }`}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Note Input */}
            <TextInput
              className="bg-gray-950 text-white rounded-xl p-4 text-base border border-gray-800 focus:border-rose-500 mb-4 min-h-[100px] text-top"
              placeholder="Add a note (optional)..."
              placeholderTextColor="#6b7280"
              value={note}
              onChangeText={setNote}
              multiline
              textAlignVertical="top"
            />

            {/* Submit Button */}
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting || !mood}
              className={`rounded-xl p-4 items-center justify-center ${
                isSubmitting || !mood ? 'bg-gray-800' : 'bg-rose-500'
              }`}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-lg">Log Feel</Text>
              )}
            </Pressable>
          </View>

          {/* Recent History */}
          <View className="mb-4">
            <Text className="text-white text-lg font-semibold mb-3">Recent History</Text>
            {isLoadingHistory ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="large" color={PRIMARY_COLOR} />
              </View>
            ) : history.length === 0 ? (
              <View className="bg-gray-900 rounded-2xl p-6 items-center border border-gray-800">
                <Ionicons name="time-outline" size={40} color="#4b5563" />
                <Text className="text-gray-400 mt-2">No history yet</Text>
              </View>
            ) : (
              <View className="gap-3">
                {history.map((item, index) => {
                  const moodOption = MOOD_OPTIONS.find(m => m.score === item.mood_score);
                  return (
                    <View key={index} className="bg-gray-900 rounded-xl p-4 flex-row items-center justify-between border border-gray-800">
                      <View className="flex-row items-center">
                        <Text className="text-2xl mr-3">{moodOption?.emoji}</Text>
                        <View>
                          <Text className="text-white font-medium">{moodOption?.label}</Text>
                          {item.note ? (
                            <Text className="text-gray-400 text-sm w-48" numberOfLines={1}>
                              {item.note}
                            </Text>
                          ) : (
                            <Text className="text-gray-500 text-xs">
                              {new Date(item.timestamp).toLocaleDateString()}
                            </Text>
                          )}
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#4b5563" />
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}