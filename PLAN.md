# Implementation Plan: Add History Screen Date Grouping and Enhanced Card Design

## Overview
Modify the history screen (`mobile/app/(protected)/history.tsx`) to replace the flat FlatList with a SectionList grouped by month, add a mini weekly chart at the top, add score filter chips, and enhance individual card design with colored borders, shadows, time display, and styled note quotes. Also update the `FeelCheck` TypeScript interface to include the `created_at` field that the backend already sends.

**Files to modify:** 2 files
1. `mobile/types/feel.ts` — add `created_at` field to FeelCheck interface
2. `mobile/app/(protected)/history.tsx` — complete rewrite of history screen

**No new files.** No new packages. No backend changes.

---

## File 1: MODIFY `mobile/types/feel.ts`

### FILE PURPOSE
Defines TypeScript interfaces for feel check-ins, stats, friends, and vibes, plus helper functions for score-to-color and score-to-label mapping.

### EXACT CHANGE
Add `created_at` optional field to the `FeelCheck` interface. The backend Go model (`backend/internal/models/feel_check.go` line 21) sends `created_at` as a JSON field, but the frontend interface currently lacks it.

**Current code (lines 1-10):**
```typescript
export interface FeelCheck {
  id: string;
  mood_score: number;
  energy_score: number;
  feel_score: number;
  mood_emoji: string;
  note: string;
  color_hex: string;
  check_date: string;
}
```

**New code (exact replacement):**
```typescript
export interface FeelCheck {
  id: string;
  mood_score: number;
  energy_score: number;
  feel_score: number;
  mood_emoji: string;
  note: string;
  color_hex: string;
  check_date: string;
  created_at?: string;
}
```

**What changed:** Added `created_at?: string;` as an optional field (line 10, before the closing brace). It's optional (`?`) because older cached data may not have it. The backend sends ISO 8601 timestamps like `"2026-02-06T14:30:00Z"`.

**No other changes to this file.** All other interfaces, types, constants, and functions remain identical.

---

## File 2: MODIFY `mobile/app/(protected)/history.tsx`

### FILE PURPOSE
History screen that displays all past check-ins with month grouping, weekly mini chart, score filtering, and enhanced card design.

### IMPORTS (complete list — replaces lines 1-5)

**Current imports:**
```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../lib/api';
import { FeelCheck, getColorForScore, getFeelLabel } from '../../types/feel';
```

**New imports (exact replacement):**
```typescript
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, SectionList, RefreshControl, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../lib/api';
import { FeelCheck, getColorForScore, getFeelLabel } from '../../types/feel';
import { hapticSelection } from '../../lib/haptics';
```

**What changed:**
- Line 1: Added `useMemo` to the React import
- Line 2: Replaced `FlatList` with `SectionList`, added `ScrollView` and `Pressable`
- Line 6 (new): Added `hapticSelection` import from `../../lib/haptics` for filter chip tap feedback

---

### STATE VARIABLES (complete list)

**Current state (lines 8-13):**
```typescript
const [checks, setChecks] = useState<FeelCheck[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [isRefreshing, setIsRefreshing] = useState(false);
const [total, setTotal] = useState(0);
const [offset, setOffset] = useState(0);
const limit = 20;
```

**New state (exact replacement — adds 1 new state variable):**
```typescript
const [checks, setChecks] = useState<FeelCheck[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [isRefreshing, setIsRefreshing] = useState(false);
const [total, setTotal] = useState(0);
const [offset, setOffset] = useState(0);
const [scoreFilter, setScoreFilter] = useState('all');
const limit = 20;
```

**What changed:** Added `const [scoreFilter, setScoreFilter] = useState('all');` — tracks the currently active filter chip. Values: `'all'` | `'great'` | `'good'` | `'low'`.

---

### EXISTING FUNCTIONS (kept unchanged)

The following functions remain exactly as they are with zero modifications:

1. **`useEffect(() => { loadHistory(); }, []);`** — unchanged (line 15-17)

2. **`loadHistory(refresh = false)`** — unchanged (lines 19-36). Still fetches from `/feels/history?limit=${limit}&offset=${newOffset}`, still does pagination logic.

3. **`onRefresh()`** — unchanged (lines 38-42). Still sets refreshing state and calls `loadHistory(true)`.

4. **`formatDate(dateStr: string)`** — unchanged (lines 44-51). Still returns `'Mon, Feb 6'` format.

---

### NEW FUNCTIONS (4 new functions, added after `formatDate`)

#### Function 1: `formatTime(dateStr: string): string`

```typescript
const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};
```

**Purpose:** Formats a `created_at` ISO timestamp into a readable time string like `"2:30 PM"`.
**Parameters:** `dateStr` — ISO 8601 string like `"2026-02-06T14:30:00Z"`
**Returns:** String like `"2:30 PM"`
**Used in:** `renderItem` — displayed below the date when `item.created_at` exists.

#### Function 2: `filteredChecks` (useMemo)

```typescript
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
```

**Purpose:** Computes the filtered check-in array based on the active `scoreFilter`. Memoized to avoid recalculating on every render.
**Dependencies:** `[checks, scoreFilter]`
**Returns:** Filtered `FeelCheck[]` — `'great'` keeps scores >= 80, `'good'` keeps scores >= 60, `'low'` keeps scores < 40, `'all'` returns everything.
**Used in:** Passed to `groupByMonth()` for the SectionList sections.

#### Function 3: `groupByMonth(data: FeelCheck[]): { title: string; data: FeelCheck[] }[]`

```typescript
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
```

**Purpose:** Groups an array of FeelCheck objects by month-year. Each check's `check_date` field is parsed into a `Date` object, then formatted as `"February 2026"` using `toLocaleDateString('en-US', { month: 'long', year: 'numeric' })`. Checks with the same month-year key are grouped together.
**Parameters:** `data` — array of `FeelCheck` (already filtered)
**Returns:** Array of `{ title: string; data: FeelCheck[] }` where `title` is like `"February 2026"` and `data` is the checks in that month. The order is preserved from the input (API returns newest first, so the first group will be the most recent month).
**Used in:** `SectionList sections={groupByMonth(filteredChecks)}`

#### Function 4: `getWeeklyData(): { day: string; score: number | null; color: string }[]`

```typescript
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
      color: match ? getColorForScore(match.feel_score) : '#d1d5db',
    });
  }

  return result;
};
```

**Purpose:** Builds an array of 7 entries representing the last 7 days (today and 6 days before), each containing the day label, the feel score (or null if no check-in), and a color.
**Algorithm:**
1. Define `days` array: `['M', 'T', 'W', 'T', 'F', 'S', 'S']` — Monday through Sunday
2. Create `today = new Date()`
3. Loop `i` from 6 down to 0: create a date that is `i` days before today
4. Get `dayOfWeek` via `date.getDay()` — Sunday=0, Monday=1, ..., Saturday=6
5. Map to label: if `dayOfWeek === 0` (Sunday), index 6; else `dayOfWeek - 1` (Monday=index 0, etc.)
6. Create `dateStr` = the `YYYY-MM-DD` portion of the ISO string (e.g., `"2026-02-06"`)
7. Search `checks` array for a check whose `check_date` starts with `dateStr`. The `check_date` field from the API is a date string like `"2026-02-06T00:00:00Z"`, so `startsWith(dateStr)` will match.
8. If match found: `score = match.feel_score`, `color = getColorForScore(match.feel_score)`. If no match: `score = null`, `color = '#d1d5db'` (gray-300).
**Returns:** Array of exactly 7 objects, ordered from 6 days ago to today.
**Used in:** The weekly mini chart section in `ListHeaderComponent`.

---

### RENDER FUNCTIONS

#### `renderSectionHeader` — NEW function

```typescript
const renderSectionHeader = ({ section }: { section: { title: string; data: FeelCheck[] } }) => (
  <View className="px-4 pt-6 pb-2">
    <Text className="text-lg font-bold text-gray-900">{section.title}</Text>
    <Text className="text-sm text-gray-500">
      {section.data.length} check-in{section.data.length !== 1 ? 's' : ''}
    </Text>
  </View>
);
```

**Purpose:** Renders the sticky section header for each month group in the SectionList.
**Parameters:** Receives `section` with `title` (e.g., `"February 2026"`) and `data` (array of checks in that month).
**JSX Structure:**
- `View className="px-4 pt-6 pb-2"` — container with horizontal padding 16px, top padding 24px, bottom padding 8px
  - `Text className="text-lg font-bold text-gray-900"` — month title like "February 2026" in 18px bold dark text
  - `Text className="text-sm text-gray-500"` — count like "5 check-ins" in 14px gray text. Uses conditional pluralization: `check-in` if count is 1, `check-ins` otherwise.

#### `renderItem` — MODIFIED function (replaces lines 53-89)

**Current renderItem (lines 53-89):**
```typescript
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
```

**New renderItem (exact replacement):**
```typescript
const renderItem = ({ item }: { item: FeelCheck }) => {
  const color = getColorForScore(item.feel_score);
  return (
    <View
      className="mx-4 mb-3 rounded-2xl bg-white p-4 shadow-sm"
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
            <Text className="text-lg font-semibold text-gray-900">
              {getFeelLabel(item.feel_score)}
            </Text>
            <Text className="text-sm text-gray-500">
              {formatDate(item.check_date)}
            </Text>
            {item.created_at && (
              <Text className="text-xs text-gray-400">
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
            <Text className="text-xs text-gray-400">M:{item.mood_score}</Text>
            <Text className="text-xs text-gray-400">E:{item.energy_score}</Text>
          </View>
        </View>
      </View>
      {item.note && (
        <View className="mt-3 pl-3" style={{ borderLeftWidth: 2, borderLeftColor: '#e5e7eb' }}>
          <Text className="text-gray-600 italic">"{item.note}"</Text>
        </View>
      )}
    </View>
  );
};
```

**What changed (5 modifications):**

1. **Colored left border on card** — Added `style={{ borderLeftWidth: 4, borderLeftColor: color }}` to the outer card View. This creates a 4px colored left accent that matches the feel score color (green for high, red for low, etc.).

2. **Larger emoji circle** — Changed `className="h-14 w-14"` to `className="h-16 w-16"` (56px → 64px).

3. **Shadow on emoji circle** — Added shadow style properties to the emoji circle View's `style` prop. The existing `backgroundColor: color + '20'` is kept, and the following are added:
   - `shadowColor: color` — shadow color matches the feel score color
   - `shadowOffset: { width: 0, height: 2 }` — shadow drops 2px below
   - `shadowOpacity: 0.2` — 20% opacity shadow
   - `shadowRadius: 4` — 4px blur radius

4. **Time display** — Added conditional time display below the date. When `item.created_at` exists (truthy), renders:
   ```jsx
   <Text className="text-xs text-gray-400">
     {formatTime(item.created_at)}
   </Text>
   ```
   This shows the time like "2:30 PM" below the date like "Thu, Feb 6". Uses `text-xs` (12px) in `text-gray-400` (lighter gray than the date).

5. **Enhanced note display** — Replaced the simple italic Text with a styled quote block:
   - Old: `<Text className="mt-3 text-gray-600 italic">"{item.note}"</Text>`
   - New: Wraps the note in a `View` with `className="mt-3 pl-3"` and `style={{ borderLeftWidth: 2, borderLeftColor: '#e5e7eb' }}`. The `#e5e7eb` is gray-200 from Tailwind's default palette. Inside, the Text keeps `className="text-gray-600 italic"`. This creates a subtle left-border quote effect.

---

### JSX STRUCTURE (complete component return)

Replace the entire return statement (lines 91-123 in the original) with the following:

```jsx
return (
  <SafeAreaView className="flex-1 bg-gray-50">
    <View className="px-6 pt-8 pb-4">
      <Text className="text-3xl font-bold text-gray-900">History</Text>
      <Text className="mt-1 text-base text-gray-500">
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
              ? 'bg-primary-600'
              : 'bg-gray-100'
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              scoreFilter === filter.key
                ? 'text-white'
                : 'text-gray-700'
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
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
      onEndReached={() => {
        if (checks.length < total) loadHistory();
      }}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        checks.length > 0 ? (
          <View className="mx-4 mb-4 rounded-2xl bg-white p-4 shadow-sm">
            <Text className="text-base font-semibold text-gray-900">This Week</Text>
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
                <Text key={index} className="text-xs text-gray-400 text-center" style={{ width: 32 }}>
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
            <Text className="text-lg font-semibold text-gray-900">No check-ins yet</Text>
            <Text className="text-gray-500 mt-2">Start tracking your feels!</Text>
          </View>
        ) : null
      }
      contentContainerStyle={{ paddingBottom: 100 }}
      stickySectionHeadersEnabled={false}
    />
  </SafeAreaView>
);
```

**Detailed JSX structure description (top to bottom):**

### 1. SafeAreaView wrapper
- `className="flex-1 bg-gray-50"` — full screen, light gray background
- Identical to original

### 2. Header section (unchanged)
- `View className="px-6 pt-8 pb-4"` — container
  - `Text className="text-3xl font-bold text-gray-900"` — "History"
  - `Text className="mt-1 text-base text-gray-500"` — "{total} total check-ins"

### 3. Filter Chips section (NEW — inserted between header and list)
- `ScrollView` with `horizontal`, `showsHorizontalScrollIndicator={false}`, `className="px-4 mb-4"`, `contentContainerStyle={{ gap: 8 }}`
- Contains 4 filter chip definitions as an inline array `.map()`:
  - `{ key: 'all', label: 'All' }` — shows all check-ins
  - `{ key: 'great', label: 'Great (80+)' }` — filters to feel_score >= 80
  - `{ key: 'good', label: 'Good (60+)' }` — filters to feel_score >= 60
  - `{ key: 'low', label: 'Low (<40)' }` — filters to feel_score < 40
- Each chip is a `Pressable`:
  - `key={filter.key}` for React key
  - `onPress` sets `scoreFilter` to `filter.key` and calls `hapticSelection()` for tactile feedback
  - `className`: dynamic — active chip gets `bg-primary-600` (purple), inactive gets `bg-gray-100`. Both share `rounded-full px-4 py-2`
  - Inner `Text`:
    - `className`: dynamic — active gets `text-white`, inactive gets `text-gray-700`. Both share `text-sm font-medium`
    - Content: `filter.label`

### 4. SectionList (replaces FlatList)
- **`sections`**: `{groupByMonth(filteredChecks)}` — the filtered checks grouped by month
- **`renderItem`**: `{renderItem}` — the enhanced card renderer
- **`renderSectionHeader`**: `{renderSectionHeader}` — the month header renderer
- **`keyExtractor`**: `{(item) => item.id}` — unchanged
- **`refreshControl`**: `<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />` — unchanged
- **`onEndReached`**: `{() => { if (checks.length < total) loadHistory(); }}` — unchanged, still loads more pages. Note: uses `checks.length` (unfiltered) not `filteredChecks.length` because the total count from the API corresponds to unfiltered data.
- **`onEndReachedThreshold`**: `{0.5}` — unchanged
- **`stickySectionHeadersEnabled`**: `{false}` — section headers scroll with content, not sticky. This gives a cleaner look on iOS.

### 5. ListHeaderComponent (NEW — weekly mini chart)

Rendered at the top of the SectionList, before any section headers. Only shown when `checks.length > 0`.

**JSX structure:**
```
View (mx-4 mb-4 rounded-2xl bg-white p-4 shadow-sm) — card container
  Text (text-base font-semibold text-gray-900) — "This Week"
  View (flex-row items-end justify-between mt-3, style height: 60) — bar chart container
    {getWeeklyData().map()} — 7 bars
      View (items-center, style width: 32) — bar column wrapper
        View (style: dynamic) — the actual bar
          width: 32
          height: score !== null ? (score / 100) * 60 : 20
            — proportional height: a score of 100 = 60px tall, score of 50 = 30px tall
            — null score (no check-in) = 20px placeholder
          backgroundColor: item.color
            — from getColorForScore for real scores, or '#d1d5db' (gray-300) for missing days
          borderTopLeftRadius: 8
          borderTopRightRadius: 8
            — rounded top corners only
          opacity: score !== null ? 1 : 0.3
            — full opacity for real data, 30% opacity for placeholder bars
  View (flex-row justify-between mt-2) — day labels row
    {getWeeklyData().map()} — 7 day labels
      Text (text-xs text-gray-400 text-center, style width: 32) — "M", "T", "W", etc.
```

**Key details:**
- Bar height formula: `(item.score / 100) * 60` — e.g., score 80 → height 48px, score 40 → height 24px
- Placeholder bars for missing days: height 20px, opacity 0.3, color gray-300
- Each bar has `width: 32` and `borderTopLeftRadius: 8, borderTopRightRadius: 8` for rounded top corners
- The container `View` has `style={{ height: 60 }}` to constrain the chart area
- `items-end` on the container aligns bars to the bottom
- `justify-between` distributes the 7 bars evenly across the width
- `getWeeklyData()` is called twice (once for bars, once for labels) — this is acceptable for 7 items, no performance concern

### 6. ListEmptyComponent (unchanged)
- Shows when no sections/data exist and loading is complete
- Same emoji, title, and subtitle text

### 7. contentContainerStyle (unchanged)
- `{{ paddingBottom: 100 }}` — space for tab bar

---

### COMPLETE RESULTING FILE

For absolute clarity, here is the complete `history.tsx` file that should result from all these changes:

```typescript
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
        color: match ? getColorForScore(match.feel_score) : '#d1d5db',
      });
    }

    return result;
  };

  const renderSectionHeader = ({ section }: { section: { title: string; data: FeelCheck[] } }) => (
    <View className="px-4 pt-6 pb-2">
      <Text className="text-lg font-bold text-gray-900">{section.title}</Text>
      <Text className="text-sm text-gray-500">
        {section.data.length} check-in{section.data.length !== 1 ? 's' : ''}
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: FeelCheck }) => {
    const color = getColorForScore(item.feel_score);
    return (
      <View
        className="mx-4 mb-3 rounded-2xl bg-white p-4 shadow-sm"
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
              <Text className="text-lg font-semibold text-gray-900">
                {getFeelLabel(item.feel_score)}
              </Text>
              <Text className="text-sm text-gray-500">
                {formatDate(item.check_date)}
              </Text>
              {item.created_at && (
                <Text className="text-xs text-gray-400">
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
              <Text className="text-xs text-gray-400">M:{item.mood_score}</Text>
              <Text className="text-xs text-gray-400">E:{item.energy_score}</Text>
            </View>
          </View>
        </View>
        {item.note && (
          <View className="mt-3 pl-3" style={{ borderLeftWidth: 2, borderLeftColor: '#e5e7eb' }}>
            <Text className="text-gray-600 italic">"{item.note}"</Text>
          </View>
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
                ? 'bg-primary-600'
                : 'bg-gray-100'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                scoreFilter === filter.key
                  ? 'text-white'
                  : 'text-gray-700'
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
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        onEndReached={() => {
          if (checks.length < total) loadHistory();
        }}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          checks.length > 0 ? (
            <View className="mx-4 mb-4 rounded-2xl bg-white p-4 shadow-sm">
              <Text className="text-base font-semibold text-gray-900">This Week</Text>
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
                  <Text key={index} className="text-xs text-gray-400 text-center" style={{ width: 32 }}>
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
              <Text className="text-lg font-semibold text-gray-900">No check-ins yet</Text>
              <Text className="text-gray-500 mt-2">Start tracking your feels!</Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}
```

---

### STYLING REFERENCE

Key NativeWind classes and inline styles used:

| Element | Classes / Style | Purpose |
|---------|----------------|---------|
| Card container | `mx-4 mb-3 rounded-2xl bg-white p-4 shadow-sm` + `borderLeftWidth: 4, borderLeftColor: color` | Card with colored left accent border |
| Emoji circle | `h-16 w-16 items-center justify-center rounded-full` + `shadowColor, shadowOffset, shadowOpacity, shadowRadius` | Larger circle (64px) with colored shadow |
| Time text | `text-xs text-gray-400` | 12px light gray time display |
| Note quote | `mt-3 pl-3` + `borderLeftWidth: 2, borderLeftColor: '#e5e7eb'` | Left-bordered quote block using gray-200 |
| Section header container | `px-4 pt-6 pb-2` | Section header padding |
| Section title | `text-lg font-bold text-gray-900` | 18px bold month title |
| Section count | `text-sm text-gray-500` | 14px gray check-in count |
| Filter chip (active) | `rounded-full px-4 py-2 bg-primary-600` | Purple pill, white text |
| Filter chip (inactive) | `rounded-full px-4 py-2 bg-gray-100` | Gray pill, dark text |
| Weekly chart card | `mx-4 mb-4 rounded-2xl bg-white p-4 shadow-sm` | White card for chart |
| Weekly chart title | `text-base font-semibold text-gray-900` | "This Week" label |
| Bar container | `flex-row items-end justify-between mt-3`, `height: 60` | 60px tall bar area, aligned bottom |
| Individual bar | `width: 32`, dynamic `height`, `borderTopLeftRadius: 8, borderTopRightRadius: 8` | Rounded-top bar |
| Day label | `text-xs text-gray-400 text-center`, `width: 32` | Centered day letter |

---

### API ENDPOINTS

No new API endpoints. Existing endpoints used:
- `GET /api/feels/history?limit=20&offset=0` — returns `{ data: FeelCheck[], total: number, limit: number, offset: number }`. Each FeelCheck in data includes `check_date` (date) and `created_at` (timestamp).

---

### NAVIGATION FLOW

- **Where does this screen come from?** Tab bar in `(protected)/_layout.tsx` — it's the "History" tab
- **Where does it navigate to?** Nowhere — this is a read-only list view
- **What data does it pass?** None

---

### APPLE COMPLIANCE CHECK

1. **Does this screen work without login?** This is a protected screen — guest mode users can access it but it requires auth context. The screen handles empty data gracefully with the ListEmptyComponent.
2. **Is there placeholder text?** No. All text is real: "History", "This Week", "No check-ins yet", "Start tracking your feels!", month names, day labels, filter labels.
3. **Does it use haptic feedback on interactions?** Yes — `hapticSelection()` is called when tapping filter chips. Pull-to-refresh and scroll are system gestures that don't need custom haptics.
4. **No external URLs or links.**

---

### SUMMARY OF ALL CHANGES

| # | File | What Changes |
|---|------|-------------|
| 1 | `mobile/types/feel.ts` | Add `created_at?: string` field to FeelCheck interface |
| 2 | `mobile/app/(protected)/history.tsx` | Replace imports: add useMemo, SectionList, ScrollView, Pressable, hapticSelection; remove FlatList |
| 3 | `mobile/app/(protected)/history.tsx` | Add `scoreFilter` state variable |
| 4 | `mobile/app/(protected)/history.tsx` | Add `formatTime()` helper function |
| 5 | `mobile/app/(protected)/history.tsx` | Add `filteredChecks` useMemo computed value |
| 6 | `mobile/app/(protected)/history.tsx` | Add `groupByMonth()` helper function |
| 7 | `mobile/app/(protected)/history.tsx` | Add `getWeeklyData()` helper function |
| 8 | `mobile/app/(protected)/history.tsx` | Add `renderSectionHeader()` render function |
| 9 | `mobile/app/(protected)/history.tsx` | Enhance `renderItem()`: colored left border, larger emoji with shadow, time display, styled note quote |
| 10 | `mobile/app/(protected)/history.tsx` | Replace FlatList with SectionList in JSX |
| 11 | `mobile/app/(protected)/history.tsx` | Add filter chips ScrollView above SectionList |
| 12 | `mobile/app/(protected)/history.tsx` | Add weekly mini chart as ListHeaderComponent |

**No other files need to be created or modified.**

---

## Verification

### TypeScript Check
Run: `cd mobile && npx tsc --noEmit`

Expected: No type errors.
- `SectionList`, `ScrollView`, `Pressable` are standard react-native exports
- `useMemo` is a standard React hook
- `hapticSelection` is exported from `../../lib/haptics`
- `created_at?: string` is optional so existing code won't break
- `groupByMonth` return type matches SectionList's `sections` prop type
- `renderSectionHeader` parameter type matches SectionList's expected type

### Files Changed Summary
| Action | File |
|--------|------|
| MODIFY | `mobile/types/feel.ts` |
| MODIFY | `mobile/app/(protected)/history.tsx` |
