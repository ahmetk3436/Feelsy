# Implementation Plan: Add Share Result Card with Gradient Background After Check-In

## Overview
Modify the home screen (`mobile/app/(protected)/home.tsx`) to enhance the post-check-in result card with a richer visual design (colored top banner, completion badge, streak info, border accent) and upgrade the share functionality from plain text to a formatted card-style text share with emoji bars. Also add an auto-share prompt 800ms after successful check-in.

**Files to modify:** 1 file only — `mobile/app/(protected)/home.tsx`
**No new files.** No new packages. No backend changes.

---

## File 1: MODIFY `mobile/app/(protected)/home.tsx`

### FILE PURPOSE
Main home screen that shows the daily check-in form (when no check-in exists) or the result card (after check-in), plus stats and badges.

### IMPORTS (full list — line 1-8 of the current file)

Replace the existing import block (lines 1-8) with the following. The ONLY change is adding `Alert` to the react-native import on line 2:

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Share, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import api from '../../lib/api';
import { hapticSuccess, hapticSelection, hapticMedium } from '../../lib/haptics';
import { FeelCheck, FeelStats, MOOD_EMOJIS, getColorForScore, getFeelLabel } from '../../types/feel';
```

**What changed:** Added `Alert` to the `react-native` import on line 2. All other imports stay identical.

---

### STATE VARIABLES (no changes)

All existing state hooks remain exactly as they are (lines 11-21):
```typescript
const { user } = useAuth();
const [todayCheck, setTodayCheck] = useState<FeelCheck | null>(null);
const [stats, setStats] = useState<FeelStats | null>(null);
const [isLoading, setIsLoading] = useState(false);
const [showCheckin, setShowCheckin] = useState(false);
const [moodScore, setMoodScore] = useState(50);
const [energyScore, setEnergyScore] = useState(50);
const [selectedEmoji, setSelectedEmoji] = useState('😊');
const [note, setNote] = useState('');
```

No new state variables are needed.

---

### FUNCTION CHANGES

#### Change 1: Replace `handleShare` function (lines 60-70)

**Current code (to be replaced):**
```typescript
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
```

**New code (exact replacement):**
```typescript
  const handleShare = async () => {
    if (!todayCheck) return;
    hapticMedium();
    try {
      const label = getFeelLabel(todayCheck.feel_score);
      const filled = Math.floor(todayCheck.feel_score / 10);
      const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
      const message = `${todayCheck.mood_emoji} My Feelsy Check-In\n\n` +
        `Score: ${todayCheck.feel_score}/100 — ${label}\n` +
        `${bar}\n\n` +
        `Mood: ${todayCheck.mood_score} | Energy: ${todayCheck.energy_score}\n` +
        (todayCheck.note ? `"${todayCheck.note}"\n\n` : '\n') +
        `🔥 ${stats?.current_streak || 0} day streak\n\n` +
        `Track your vibes → Feelsy App`;
      await Share.share({ message });
    } catch (error) {
      console.log('Share error:', error);
    }
  };
```

**What changed:**
- Uses `todayCheck.mood_emoji` instead of `selectedEmoji` (selectedEmoji is local form state; todayCheck.mood_emoji is the saved value)
- Computes `label` via `getFeelLabel(todayCheck.feel_score)`
- Computes `filled` = `Math.floor(todayCheck.feel_score / 10)` — integer from 0 to 10
- Builds `bar` = filled `█` chars + remaining `░` chars (always 10 chars total)
- Multi-line message includes: emoji + title, score + label, visual bar, mood + energy breakdown, optional quoted note, streak count, call-to-action
- The `stats?.current_streak || 0` safely handles null stats

#### Change 2: Add auto-share prompt in `handleCheckIn` (lines 40-58)

**Current code (lines 49-52 inside handleCheckIn):**
```typescript
      setTodayCheck(res.data);
      setShowCheckin(false);
      hapticSuccess();
      loadData();
```

**New code (exact replacement for those 4 lines):**
```typescript
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
```

**What changed:** Added a `setTimeout` after `loadData()` that shows an `Alert.alert` after 800ms. The alert has two buttons: "Not now" (cancel style, dismisses alert) and "Share" (calls `handleShare`). This prompts users to share immediately after check-in while the experience is fresh.

---

### JSX STRUCTURE CHANGES

#### Change 3: Enhance the result card (lines 88-130)

Replace the entire todayCheck truthy branch (lines 88-130) — from the opening `<View className="mt-6 rounded-3xl bg-white p-6 shadow-sm">` to the closing `</View>` before `) : (`.

**Current JSX (lines 88-130):**
```jsx
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
```

**New JSX (exact replacement):**
```jsx
            <View
              className="mt-6 rounded-3xl bg-white p-6 shadow-sm overflow-hidden"
              style={{ borderWidth: 1, borderColor: feelColor + '40' }}
            >
              {/* Colored top banner */}
              <View
                className="h-3 rounded-t-3xl -mx-6 -mt-6 mb-4"
                style={{ backgroundColor: feelColor }}
              />

              <Text className="text-sm font-medium text-gray-500">Today's Feelsy Score</Text>

              <View className="mt-4 items-center">
                {/* Daily Check-In Complete badge */}
                <View className="bg-green-100 px-3 py-1 rounded-full mb-3">
                  <Text className="text-green-700 text-sm font-medium">Daily Check-In Complete ✓</Text>
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

                {/* Streak info */}
                <View className="mt-3 flex-row items-center">
                  <Text className="text-sm text-gray-500">🔥 {stats?.current_streak || 0} day streak</Text>
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
```

**Detailed description of every JSX change (top to bottom):**

1. **Outer `<View>` — border and overflow:**
   - Old: `className="mt-6 rounded-3xl bg-white p-6 shadow-sm"`
   - New: `className="mt-6 rounded-3xl bg-white p-6 shadow-sm overflow-hidden"` plus `style={{ borderWidth: 1, borderColor: feelColor + '40' }}`
   - Added `overflow-hidden` className so the top banner's negative margins don't bleed outside the rounded corners
   - Added inline `style` with `borderWidth: 1` and `borderColor` set to `feelColor + '40'` (the feel color at 25% opacity via hex alpha). Examples: if feelColor is `#22c55e`, borderColor becomes `#22c55e40`

2. **New colored top banner (inserted as first child of outer View, before the "Today's Feelsy Score" text):**
   ```jsx
   <View
     className="h-3 rounded-t-3xl -mx-6 -mt-6 mb-4"
     style={{ backgroundColor: feelColor }}
   />
   ```
   - `h-3`: 12px tall strip
   - `rounded-t-3xl`: matches the card's top border radius
   - `-mx-6`: negative horizontal margin cancels the parent's `p-6` so the banner spans full width
   - `-mt-6`: negative top margin cancels the parent's `p-6` so the banner sits flush at the card top edge
   - `mb-4`: 16px margin below to separate from the score title text
   - `backgroundColor: feelColor`: dynamic color based on the user's feel score (green for high, red for low, etc.)

3. **"Today's Feelsy Score" text — unchanged:** Stays exactly as is.

4. **New "Daily Check-In Complete ✓" badge (inserted inside the `items-center` View, as the first child before the emoji circle):**
   ```jsx
   <View className="bg-green-100 px-3 py-1 rounded-full mb-3">
     <Text className="text-green-700 text-sm font-medium">Daily Check-In Complete ✓</Text>
   </View>
   ```
   - `bg-green-100`: light green background pill
   - `px-3 py-1`: horizontal 12px, vertical 4px padding
   - `rounded-full`: pill shape
   - `mb-3`: 12px margin below before the emoji circle
   - Text uses `text-green-700` (dark green), `text-sm` (14px), `font-medium` (500 weight)
   - Content is the literal string `Daily Check-In Complete ✓` (with Unicode check mark U+2713)

5. **Emoji circle — size increase:**
   - Old: `className="h-32 w-32 items-center justify-center rounded-full"`
   - New: `className="h-36 w-36 items-center justify-center rounded-full"`
   - Changed `h-32 w-32` (128px) to `h-36 w-36` (144px) — 16px larger in both dimensions
   - Everything else about the emoji circle stays identical (style, inner Text)

6. **Score text, label text, mood/energy breakdown — all unchanged.** These stay exactly as they are.

7. **New streak info (inserted immediately after the mood/energy `flex-row gap-4` View, before the note conditional):**
   ```jsx
   <View className="mt-3 flex-row items-center">
     <Text className="text-sm text-gray-500">🔥 {stats?.current_streak || 0} day streak</Text>
   </View>
   ```
   - `mt-3`: 12px margin above
   - `flex-row items-center`: horizontal layout, vertically centered
   - Text: `text-sm text-gray-500` — 14px, gray-500 color
   - Content uses fire emoji `🔥` followed by a space, then `{stats?.current_streak || 0}` (safely handles null stats by defaulting to 0), then ` day streak`

8. **Note conditional and Share button — unchanged.** Both stay exactly as they are.

---

### COMPLETE RESULTING FILE

For absolute clarity, here is the complete file that should result from these changes:

```typescript
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
      const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
      const message = `${todayCheck.mood_emoji} My Feelsy Check-In\n\n` +
        `Score: ${todayCheck.feel_score}/100 — ${label}\n` +
        `${bar}\n\n` +
        `Mood: ${todayCheck.mood_score} | Energy: ${todayCheck.energy_score}\n` +
        (todayCheck.note ? `"${todayCheck.note}"\n\n` : '\n') +
        `🔥 ${stats?.current_streak || 0} day streak\n\n` +
        `Track your vibes → Feelsy App`;
      await Share.share({ message });
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
            <View
              className="mt-6 rounded-3xl bg-white p-6 shadow-sm overflow-hidden"
              style={{ borderWidth: 1, borderColor: feelColor + '40' }}
            >
              {/* Colored top banner */}
              <View
                className="h-3 rounded-t-3xl -mx-6 -mt-6 mb-4"
                style={{ backgroundColor: feelColor }}
              />

              <Text className="text-sm font-medium text-gray-500">Today's Feelsy Score</Text>

              <View className="mt-4 items-center">
                {/* Daily Check-In Complete badge */}
                <View className="bg-green-100 px-3 py-1 rounded-full mb-3">
                  <Text className="text-green-700 text-sm font-medium">Daily Check-In Complete ✓</Text>
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

                {/* Streak info */}
                <View className="mt-3 flex-row items-center">
                  <Text className="text-sm text-gray-500">🔥 {stats?.current_streak || 0} day streak</Text>
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
```

---

### STYLING REFERENCE

Key NativeWind classes used in this change:

| Element | Classes | Purpose |
|---------|---------|---------|
| Outer card | `mt-6 rounded-3xl bg-white p-6 shadow-sm overflow-hidden` | Card container with overflow hidden for banner clipping |
| Outer card style | `borderWidth: 1, borderColor: feelColor + '40'` | Subtle colored border (25% opacity) |
| Top banner | `h-3 rounded-t-3xl -mx-6 -mt-6 mb-4` | 12px colored strip flush with card top |
| Complete badge wrapper | `bg-green-100 px-3 py-1 rounded-full mb-3` | Light green pill badge |
| Complete badge text | `text-green-700 text-sm font-medium` | Dark green badge text |
| Emoji circle | `h-36 w-36 items-center justify-center rounded-full` | 144px circle (was 128px) |
| Streak info wrapper | `mt-3 flex-row items-center` | Horizontal streak display |
| Streak info text | `text-sm text-gray-500` | Small gray streak text |

---

### API ENDPOINTS

No new API endpoints. Existing endpoints used:
- `GET /api/feels/today` — returns today's `FeelCheck` or 404
- `GET /api/feels/stats` — returns `FeelStats` with `current_streak`, `total_check_ins`, `average_score`, `unlocked_badges`
- `POST /api/feels` — creates a new check-in, body: `{ mood_score, energy_score, mood_emoji, note }`

---

### NAVIGATION FLOW

- **Where does this screen come from?** Tab bar in `(protected)/_layout.tsx` — it's the "Home" tab
- **Where does it navigate to?** Nowhere — the share sheet is a system modal opened by `Share.share()`; the Alert is a native dialog
- **What data does it pass?** Share message is a formatted string passed to the system share sheet

---

### APPLE COMPLIANCE CHECK

1. **Does this screen work without login?** This is a protected screen — guest mode users can access it but it requires the auth context. Guest mode is handled by AuthContext. No changes affect guest mode functionality.
2. **Is there placeholder text?** No. All text is real content: "Daily Check-In Complete ✓", "Today's Feelsy Score", "Share Your Vibes?", etc.
3. **Does it use haptic feedback on interactions?** Yes — `hapticMedium()` on share button press, `hapticSuccess()` on successful check-in, `hapticSelection()` on form interactions. No new interactive elements were added that lack haptics.
4. **Alert dialog:** Uses native `Alert.alert` which is fully compliant with iOS HIG. "Not now" uses `style: 'cancel'` for proper iOS button styling.

---

### SUMMARY OF ALL CHANGES

| # | Location | What Changes | Lines Affected |
|---|----------|-------------|----------------|
| 1 | Import line 2 | Add `Alert` to react-native imports | Line 2 |
| 2 | `handleShare` function | Replace plain text share with formatted card-style text | Lines 60-70 |
| 3 | `handleCheckIn` function | Add `setTimeout` + `Alert.alert` after `loadData()` | After line 52 |
| 4 | Result card outer View | Add `overflow-hidden`, add border style | Line 89 |
| 5 | New top banner | Insert colored `View` as first child of card | After line 89 |
| 6 | New completion badge | Insert green pill badge before emoji circle | Before emoji circle |
| 7 | Emoji circle | Change `h-32 w-32` to `h-36 w-36` | Line 93 |
| 8 | New streak info | Insert streak text after mood/energy breakdown | After line 115 |

**No other files need to be created or modified.**

---

## Verification

### TypeScript Check
Run: `cd mobile && npx tsc --noEmit`

Expected: No type errors. `Alert` is a standard react-native export. All other types and functions are already imported and used. The `stats?.current_streak` uses optional chaining matching the existing `FeelStats | null` type.

### Files Changed Summary
| Action | File | Lines Changed |
|--------|------|---------------|
| MODIFY | `mobile/app/(protected)/home.tsx` | ~25 lines modified/added |
