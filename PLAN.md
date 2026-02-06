# Implementation Plan: Add Mood Insights Screen with Weekly Trends

## Overview
Two files need changes:
1. **CREATE** `mobile/app/(protected)/insights.tsx` — New Insights tab screen
2. **MODIFY** `mobile/app/(protected)/_layout.tsx` — Add Insights tab to tab bar

---

## FILE 1: CREATE `mobile/app/(protected)/insights.tsx`

### File Purpose
Displays weekly mood analysis with personalized messages, trend indicators, stat comparisons, best/worst day cards, and a check-in progress bar. Data comes from the backend `GET /api/feels/insights` endpoint.

### Imports
```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../lib/api';
import { getColorForScore, getFeelLabel } from '../../types/feel';
```

### Type Definitions (defined at top of file, before component)

```typescript
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
  streak_at_end: number;
}

interface InsightsData {
  current_week: WeeklyInsight;
  previous_week: WeeklyInsight;
  improvement: number;
  message: string;
}
```

These interfaces match the backend DTO exactly as defined in `backend/internal/dto/feel_dto.go` lines 59-80. Field names use snake_case matching the JSON tags.

### State Variables
```typescript
const [insights, setInsights] = useState<InsightsData | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [isRefreshing, setIsRefreshing] = useState(false);
```

### Functions

#### `loadInsights(refresh?: boolean)`
```
Purpose: Fetches weekly insights from backend API
Parameters: refresh (optional boolean, default false) — if true, sets isRefreshing instead of isLoading
Flow:
  1. If refresh is false (initial load), do NOT set isLoading again (already true from initial state). If refresh is true, setIsRefreshing(true) was called by onRefresh.
  2. try: const res = await api.get('/feels/insights');
  3. setInsights(res.data);
  4. catch (error): console.log('Error loading insights:', error);
  5. finally: setIsLoading(false); setIsRefreshing(false);
```

#### `onRefresh()`
```
Purpose: Pull-to-refresh handler, wrapped in useCallback
Flow:
  1. setIsRefreshing(true);
  2. call loadInsights(true);
```

#### `formatDate(dateStr: string): string`
```
Purpose: Formats ISO date string to human-readable short format
Implementation:
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
```

#### `getTrendIcon(trend: string): { icon: string; color: string }`
```
Purpose: Returns arrow icon and color based on mood trend
Implementation:
  if (trend === 'improving') return { icon: '▲', color: '#22c55e' };
  if (trend === 'declining') return { icon: '▼', color: '#ef4444' };
  return { icon: '●', color: '#9ca3af' };
```

### useEffect
```typescript
useEffect(() => {
  loadInsights();
}, []);
```

### Component Structure (JSX Tree)

```
export default function InsightsScreen() {
  // ... state, functions defined above ...

  // Loading state (shown when isLoading is true AND insights is null)
  if (isLoading && !insights) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      </SafeAreaView>
    );
  }

  // trend variables (computed before JSX return)
  const trend = insights ? getTrendIcon(insights.current_week.mood_trend) : null;
  const cw = insights?.current_week;  // shorthand
  const pw = insights?.previous_week; // shorthand

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header - matches exact pattern from history.tsx */}
      <View className="px-6 pt-8 pb-4">
        <Text className="text-3xl font-bold text-gray-900">Insights</Text>
        <Text className="mt-1 text-base text-gray-500">Your weekly mood trends</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {insights && cw ? (
          <View className="px-6">

            {/* === SECTION 1: Personalized Message Card === */}
            <View
              className="rounded-3xl p-6 shadow-sm mb-6"
              style={{ backgroundColor: getColorForScore(cw.average_feel) + '15' }}
            >
              <Text className="text-5xl text-center">{cw.dominant_emoji || '😊'}</Text>
              <Text className="mt-4 text-lg font-medium text-gray-800 text-center">
                {insights.message}
              </Text>

              {/* Trend Indicator Row */}
              <View className="mt-4 flex-row items-center justify-center">
                <Text style={{ color: trend.color, fontSize: 16 }}>{trend.icon}</Text>
                <Text className="ml-2 text-base font-semibold" style={{ color: trend.color }}>
                  {cw.mood_trend === 'improving'
                    ? `+${Math.abs(insights.improvement).toFixed(1)}%`
                    : cw.mood_trend === 'declining'
                    ? `-${Math.abs(insights.improvement).toFixed(1)}%`
                    : 'Stable'}
                </Text>
                <Text className="ml-1 text-sm text-gray-500">vs last week</Text>
              </View>
            </View>

            {/* === SECTION 2: This Week Stats — 3-column grid === */}
            <Text className="text-lg font-semibold text-gray-900 mb-3">This Week</Text>
            <View className="flex-row gap-3 mb-6">
              {/* Mood Average */}
              <View className="flex-1 rounded-2xl bg-white p-4 shadow-sm items-center">
                <Text className="text-sm text-gray-500">Mood</Text>
                <Text
                  className="mt-1 text-2xl font-bold"
                  style={{ color: getColorForScore(cw.average_mood) }}
                >
                  {Math.round(cw.average_mood)}
                </Text>
                <Text className="text-xs text-gray-400">{getFeelLabel(cw.average_mood)}</Text>
              </View>

              {/* Energy Average */}
              <View className="flex-1 rounded-2xl bg-white p-4 shadow-sm items-center">
                <Text className="text-sm text-gray-500">Energy</Text>
                <Text
                  className="mt-1 text-2xl font-bold"
                  style={{ color: getColorForScore(cw.average_energy) }}
                >
                  {Math.round(cw.average_energy)}
                </Text>
                <Text className="text-xs text-gray-400">{getFeelLabel(cw.average_energy)}</Text>
              </View>

              {/* Feel Average */}
              <View className="flex-1 rounded-2xl bg-white p-4 shadow-sm items-center">
                <Text className="text-sm text-gray-500">Feel</Text>
                <Text
                  className="mt-1 text-2xl font-bold"
                  style={{ color: getColorForScore(cw.average_feel) }}
                >
                  {Math.round(cw.average_feel)}
                </Text>
                <Text className="text-xs text-gray-400">{getFeelLabel(cw.average_feel)}</Text>
              </View>
            </View>

            {/* === SECTION 3: vs Last Week Comparison === */}
            {pw && pw.total_checkins > 0 && (
              <View className="rounded-2xl bg-white p-4 shadow-sm mb-6">
                <Text className="text-lg font-semibold text-gray-900 mb-3">vs Last Week</Text>
                <View className="flex-row justify-between">
                  {/* Mood comparison */}
                  <View className="items-center flex-1">
                    <Text className="text-sm text-gray-500">Mood</Text>
                    <Text className="text-lg font-semibold text-gray-700">
                      {Math.round(pw.average_mood)}
                    </Text>
                    <Text
                      className="text-sm font-medium"
                      style={{
                        color: cw.average_mood >= pw.average_mood ? '#22c55e' : '#ef4444',
                      }}
                    >
                      {cw.average_mood >= pw.average_mood ? '+' : ''}
                      {Math.round(cw.average_mood - pw.average_mood)}
                    </Text>
                  </View>

                  {/* Energy comparison */}
                  <View className="items-center flex-1">
                    <Text className="text-sm text-gray-500">Energy</Text>
                    <Text className="text-lg font-semibold text-gray-700">
                      {Math.round(pw.average_energy)}
                    </Text>
                    <Text
                      className="text-sm font-medium"
                      style={{
                        color: cw.average_energy >= pw.average_energy ? '#22c55e' : '#ef4444',
                      }}
                    >
                      {cw.average_energy >= pw.average_energy ? '+' : ''}
                      {Math.round(cw.average_energy - pw.average_energy)}
                    </Text>
                  </View>

                  {/* Feel comparison */}
                  <View className="items-center flex-1">
                    <Text className="text-sm text-gray-500">Feel</Text>
                    <Text className="text-lg font-semibold text-gray-700">
                      {Math.round(pw.average_feel)}
                    </Text>
                    <Text
                      className="text-sm font-medium"
                      style={{
                        color: cw.average_feel >= pw.average_feel ? '#22c55e' : '#ef4444',
                      }}
                    >
                      {cw.average_feel >= pw.average_feel ? '+' : ''}
                      {Math.round(cw.average_feel - pw.average_feel)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* === SECTION 4: Best / Worst Day Cards — side by side === */}
            <View className="flex-row gap-3 mb-6">
              {/* Best Day */}
              <View
                className="flex-1 rounded-2xl p-4 shadow-sm"
                style={{ backgroundColor: '#22c55e15' }}
              >
                <Text className="text-3xl">🌟</Text>
                <Text className="mt-2 text-sm font-semibold text-gray-900">Best Day</Text>
                <Text className="text-sm text-gray-600">
                  {cw.best_day ? formatDate(cw.best_day) : 'No data yet'}
                </Text>
              </View>

              {/* Worst Day */}
              <View
                className="flex-1 rounded-2xl p-4 shadow-sm"
                style={{ backgroundColor: '#f9731615' }}
              >
                <Text className="text-3xl">💪</Text>
                <Text className="mt-2 text-sm font-semibold text-gray-900">Tough Day</Text>
                <Text className="text-sm text-gray-600">
                  {cw.worst_day ? formatDate(cw.worst_day) : 'No data yet'}
                </Text>
                {cw.worst_day && (
                  <Text className="text-xs text-gray-500 mt-1">You got through it!</Text>
                )}
              </View>
            </View>

            {/* === SECTION 5: Check-in Progress Bar === */}
            <View className="rounded-2xl bg-white p-4 shadow-sm mb-6">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-semibold text-gray-900">Check-in Progress</Text>
                <Text className="text-sm text-gray-500">
                  {cw.total_checkins} of 7 days tracked
                </Text>
              </View>
              <View className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min((cw.total_checkins / 7) * 100, 100)}%`,
                    backgroundColor: '#8b5cf6',
                  }}
                />
              </View>
              {cw.total_checkins < 7 && (
                <Text className="text-xs text-gray-500 mt-2">
                  {7 - cw.total_checkins} more day{7 - cw.total_checkins !== 1 ? 's' : ''} to complete your week!
                </Text>
              )}
              {cw.total_checkins >= 7 && (
                <Text className="text-xs text-green-600 mt-2 font-medium">
                  Full week tracked! Amazing consistency!
                </Text>
              )}
            </View>

          </View>
        ) : (
          /* === EMPTY STATE: No insights data === */
          <View className="flex-1 items-center justify-center py-20 px-6">
            <Text className="text-6xl mb-4">📊</Text>
            <Text className="text-lg font-semibold text-gray-900">No insights yet</Text>
            <Text className="text-gray-500 mt-2 text-center">
              Start logging your daily feels to see weekly mood trends and personalized insights.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
```

### Styling Summary (NativeWind classes for key elements)
- **Screen container**: `flex-1 bg-gray-50` (SafeAreaView) — matches history.tsx, home.tsx
- **Header section**: `px-6 pt-8 pb-4` — matches history.tsx exactly
- **Header title**: `text-3xl font-bold text-gray-900` — matches all screens
- **Header subtitle**: `mt-1 text-base text-gray-500` — matches all screens
- **Personalized message card**: `rounded-3xl p-6 shadow-sm mb-6` + dynamic bg via `style={{ backgroundColor: getColorForScore(...) + '15' }}` — same pattern as home.tsx line 243
- **Stat columns**: `flex-1 rounded-2xl bg-white p-4 shadow-sm items-center` — matches home.tsx stats cards
- **Comparison card**: `rounded-2xl bg-white p-4 shadow-sm mb-6` — standard card pattern
- **Best day card**: `flex-1 rounded-2xl p-4 shadow-sm` with `style={{ backgroundColor: '#22c55e15' }}` (green tint)
- **Worst day card**: `flex-1 rounded-2xl p-4 shadow-sm` with `style={{ backgroundColor: '#f9731615' }}` (orange tint)
- **Progress bar outer**: `h-2 rounded-full bg-gray-200 overflow-hidden`
- **Progress bar inner**: `h-full rounded-full` with `style={{ width: '...%', backgroundColor: '#8b5cf6' }}`
- **Empty state**: `flex-1 items-center justify-center py-20 px-6` — matches history.tsx pattern

### API Endpoint
- **Method + Path**: `GET /api/feels/insights`
- **Auth**: JWT required (protected route, defined in `backend/internal/routes/routes.go` line 47)
- **Request body**: None (GET request)
- **Response body** (from `backend/internal/dto/feel_dto.go` lines 75-80):
```json
{
  "current_week": {
    "week_start": "2026-02-02T00:00:00Z",
    "week_end": "2026-02-06T00:00:00Z",
    "average_mood": 72.5,
    "average_energy": 65.0,
    "average_feel": 68.75,
    "total_checkins": 5,
    "best_day": "2026-02-04T00:00:00Z",
    "worst_day": "2026-02-03T00:00:00Z",
    "mood_trend": "improving",
    "dominant_emoji": "😊",
    "streak_at_end": 5
  },
  "previous_week": {
    "week_start": "2026-01-26T00:00:00Z",
    "week_end": "2026-02-01T00:00:00Z",
    "average_mood": 60.0,
    "average_energy": 55.0,
    "average_feel": 57.5,
    "total_checkins": 4,
    "best_day": "2026-01-28T00:00:00Z",
    "worst_day": "2026-01-30T00:00:00Z",
    "mood_trend": "",
    "dominant_emoji": "😌",
    "streak_at_end": 0
  },
  "improvement": 19.57,
  "message": "Great progress! Your mood has improved by 19.6% this week."
}
```

### Navigation Flow
- This screen is a tab screen in the protected layout — users navigate to it by tapping the "Insights" tab in the bottom tab bar
- No outbound navigation — this is a read-only display screen
- No data is passed in or out — the screen fetches its own data from the API on mount

### Apple Compliance Check
- **Guest mode**: This screen is inside (protected) layout which allows guest access (line 19 of _layout.tsx: `!isAuthenticated && !isGuest`). Guests can access the tab but the API call will fail (requires JWT). The screen will show the empty state "No insights yet" gracefully because the catch block sets isLoading to false, and insights remains null. This is acceptable behavior — guest users see a clean empty state encouraging them to sign up.
- **Placeholder text**: Zero placeholder text. All displayed text is either dynamic data or descriptive labels.
- **Haptic feedback**: Not needed — this screen has no interactive buttons or tappable elements. It's a read-only data display with only pull-to-refresh (which has system-level haptics already).

---

## FILE 2: MODIFY `mobile/app/(protected)/_layout.tsx`

### File Purpose
Protected tab layout — need to add the Insights tab between the History tab and the Friends tab.

### Current State (lines 54-70)
```tsx
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
```

### Exact Change Required

Insert the following new `Tabs.Screen` block AFTER the closing `/>` of the "history" `Tabs.Screen` (after line 62) and BEFORE the opening `<Tabs.Screen` of "friends" (line 63):

```tsx
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics-outline" size={size} color={color} />
          ),
        }}
      />
```

### After Modification (lines 54-80 will be)
```tsx
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
```

### No Import Changes Needed
The `Ionicons` import and `hapticSelection` import are already present in the file (lines 4-6). No new imports required.

### Tab Order After Change
1. Feels (home) — heart-outline
2. History — calendar-outline
3. **Insights — analytics-outline** ← NEW
4. Friends — people-outline
5. Settings — settings-outline
6. Paywall — hidden (href: null)

---

## Verification

### TypeScript Check
Run: `cd mobile && npx tsc --noEmit`

Expected: No type errors. The interfaces defined in `insights.tsx` match the backend DTO exactly. All imported functions (`getColorForScore`, `getFeelLabel`) exist in `types/feel.ts` and accept `number` parameters. The `api` import returns an Axios instance with `.get()` method.

### Files Changed Summary
| Action | File | Lines Changed |
|--------|------|---------------|
| CREATE | `mobile/app/(protected)/insights.tsx` | ~220 lines (new file) |
| MODIFY | `mobile/app/(protected)/_layout.tsx` | +9 lines (insert new Tabs.Screen) |
