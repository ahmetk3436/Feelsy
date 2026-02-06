package dto

// CreateFeelCheckRequest represents a request to create a feel check-in
type CreateFeelCheckRequest struct {
	MoodScore   int    `json:"mood_score" validate:"required,min=1,max=100"`
	EnergyScore int    `json:"energy_score" validate:"required,min=1,max=100"`
	MoodEmoji   string `json:"mood_emoji"`
	Note        string `json:"note"`
}

// SendGoodVibeRequest represents a request to send good vibes
type SendGoodVibeRequest struct {
	ReceiverID string `json:"receiver_id" validate:"required,uuid"`
	Message    string `json:"message"`
	VibeType   string `json:"vibe_type" validate:"required"` // hug, high-five, sunshine, heart, star
}

// FeelCheckResponse represents a feel check response
type FeelCheckResponse struct {
	ID          string `json:"id"`
	MoodScore   int    `json:"mood_score"`
	EnergyScore int    `json:"energy_score"`
	FeelScore   int    `json:"feel_score"`
	MoodEmoji   string `json:"mood_emoji"`
	Note        string `json:"note"`
	ColorHex    string `json:"color_hex"`
	CheckDate   string `json:"check_date"`
}

// FeelStatsResponse represents feel statistics
type FeelStatsResponse struct {
	CurrentStreak  int      `json:"current_streak"`
	LongestStreak  int      `json:"longest_streak"`
	TotalCheckIns  int      `json:"total_check_ins"`
	AverageScore   float64  `json:"average_score"`
	UnlockedBadges []string `json:"unlocked_badges"`
}

// SendFriendRequestRequest represents a request to send a friend request
type SendFriendRequestRequest struct {
	FriendEmail string `json:"friend_email" validate:"required,email"`
}

// FriendRequestResponse represents a friend request in API responses
type FriendRequestResponse struct {
	ID          string `json:"id"`
	UserID      string `json:"user_id"`
	FriendID    string `json:"friend_id"`
	Status      string `json:"status"`
	FriendEmail string `json:"friend_email"`
	CreatedAt   string `json:"created_at"`
}

// AcceptFriendRequestRequest represents a request to accept a friend request
type AcceptFriendRequestRequest struct {
	RequestID string `json:"request_id" validate:"required,uuid"`
}

// WeeklyInsight represents mood data aggregated for a single week
type WeeklyInsight struct {
	WeekStart     string  `json:"week_start"`
	WeekEnd       string  `json:"week_end"`
	AverageMood   float64 `json:"average_mood"`
	AverageEnergy float64 `json:"average_energy"`
	AverageFeel   float64 `json:"average_feel"`
	TotalCheckIns int     `json:"total_checkins"`
	BestDay       string  `json:"best_day"`
	WorstDay      string  `json:"worst_day"`
	MoodTrend     string  `json:"mood_trend"`
	DominantEmoji string  `json:"dominant_emoji"`
	StreakAtEnd   int     `json:"streak_at_end"`
}

// InsightsResponse represents the weekly insights API response
type InsightsResponse struct {
	CurrentWeek  WeeklyInsight `json:"current_week"`
	PreviousWeek WeeklyInsight `json:"previous_week"`
	Improvement  float64       `json:"improvement"`
	Message      string        `json:"message"`
}
