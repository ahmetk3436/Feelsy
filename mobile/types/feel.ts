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

export interface FeelStats {
  current_streak: number;
  longest_streak: number;
  total_check_ins: number;
  average_score: number;
  unlocked_badges: string[];
}

export interface GoodVibe {
  id: string;
  sender_id: string;
  sender_name?: string;
  message: string;
  vibe_type: string;
  created_at: string;
}

export interface FriendFeel {
  user_id: string;
  name: string;
  feel_score: number;
  mood_emoji: string;
  color_hex: string;
}

export type VibeType = 'hug' | 'high-five' | 'sunshine' | 'heart' | 'star';

export const VIBE_EMOJIS: Record<VibeType, string> = {
  hug: '🤗',
  'high-five': '✋',
  sunshine: '☀️',
  heart: '💜',
  star: '⭐',
};

export const MOOD_EMOJIS = ['😊', '😌', '😔', '😢', '😤', '😴', '🤩', '😎', '🥺', '😅'];

export const getColorForScore = (score: number): string => {
  if (score >= 80) return '#22c55e'; // Green - great
  if (score >= 60) return '#84cc16'; // Lime - good
  if (score >= 40) return '#eab308'; // Yellow - okay
  if (score >= 20) return '#f97316'; // Orange - not great
  return '#ef4444'; // Red - struggling
};

export const getFeelLabel = (score: number): string => {
  if (score >= 80) return 'Thriving';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Okay';
  if (score >= 20) return 'Low';
  return 'Struggling';
};
