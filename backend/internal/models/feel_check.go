package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// FeelCheck represents a daily mood/energy check-in
type FeelCheck struct {
	ID          uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID      uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	MoodScore   int            `gorm:"not null" json:"mood_score"`   // 1-100
	EnergyScore int            `gorm:"not null" json:"energy_score"` // 1-100
	FeelScore   int            `gorm:"not null" json:"feel_score"`   // Combined score 1-100
	MoodEmoji   string         `gorm:"size:10" json:"mood_emoji"`    // 😊 😢 😤 etc.
	Note        string         `gorm:"size:280" json:"note"`         // Optional note
	ColorHex    string         `gorm:"size:7" json:"color_hex"`      // Gradient color based on score
	CheckDate   time.Time      `gorm:"type:date;not null;index" json:"check_date"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	User User `gorm:"foreignKey:UserID" json:"-"`
}

// CalculateFeelScore computes the combined feel score
func (f *FeelCheck) CalculateFeelScore() {
	f.FeelScore = (f.MoodScore + f.EnergyScore) / 2
}

// GetColorHex returns a color based on the feel score
func (f *FeelCheck) GetColorHex() string {
	switch {
	case f.FeelScore >= 90:
		return "#22c55e" // Green - Amazing
	case f.FeelScore >= 75:
		return "#84cc16" // Lime - Great
	case f.FeelScore >= 60:
		return "#eab308" // Yellow - Good
	case f.FeelScore >= 45:
		return "#f97316" // Orange - Okay
	case f.FeelScore >= 30:
		return "#ef4444" // Red - Not great
	default:
		return "#8b5cf6" // Purple - Low
	}
}

// FeelStreak tracks daily check-in streaks
type FeelStreak struct {
	ID             uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID         uuid.UUID      `gorm:"type:uuid;not null;uniqueIndex" json:"user_id"`
	CurrentStreak  int            `gorm:"default:0" json:"current_streak"`
	LongestStreak  int            `gorm:"default:0" json:"longest_streak"`
	TotalCheckIns  int            `gorm:"default:0" json:"total_check_ins"`
	LastCheckDate  *time.Time     `gorm:"type:date" json:"last_check_date"`
	AverageScore   float64        `gorm:"default:0" json:"average_score"`
	UnlockedBadges []string       `gorm:"type:text[];default:'{}'" json:"unlocked_badges"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`

	User User `gorm:"foreignKey:UserID" json:"-"`
}

// FeelFriend represents friend connections for comparing feels
type FeelFriend struct {
	ID        uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID    uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	FriendID  uuid.UUID      `gorm:"type:uuid;not null;index" json:"friend_id"`
	Status    string         `gorm:"size:20;default:'pending'" json:"status"` // pending, accepted, blocked
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	User   User `gorm:"foreignKey:UserID" json:"-"`
	Friend User `gorm:"foreignKey:FriendID" json:"friend,omitempty"`
}

// GoodVibe represents positive energy sent between friends
type GoodVibe struct {
	ID         uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	SenderID   uuid.UUID      `gorm:"type:uuid;not null;index" json:"sender_id"`
	ReceiverID uuid.UUID      `gorm:"type:uuid;not null;index" json:"receiver_id"`
	Message    string         `gorm:"size:100" json:"message"` // Short positive message
	VibeType   string         `gorm:"size:20" json:"vibe_type"` // hug, high-five, sunshine, etc.
	CreatedAt  time.Time      `json:"created_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`

	Sender   User `gorm:"foreignKey:SenderID" json:"sender,omitempty"`
	Receiver User `gorm:"foreignKey:ReceiverID" json:"-"`
}
