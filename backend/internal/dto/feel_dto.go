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
