package services

import (
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/ahmetcoskunkizilkaya/feelsy/backend/internal/dto"
	"github.com/ahmetcoskunkizilkaya/feelsy/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type FeelService struct {
	db                *gorm.DB
	moderationService *ModerationService
}

func NewFeelService(db *gorm.DB, moderationService *ModerationService) *FeelService {
	return &FeelService{db: db, moderationService: moderationService}
}

// CreateFeelCheck creates a new daily mood check-in
func (s *FeelService) CreateFeelCheck(userID uuid.UUID, moodScore, energyScore int, moodEmoji, note, journalEntry string) (*models.FeelCheck, error) {
	// Validate scores
	if moodScore < 1 || moodScore > 100 || energyScore < 1 || energyScore > 100 {
		return nil, errors.New("scores must be between 1 and 100")
	}

	today := time.Now().Truncate(24 * time.Hour)

	// Check if already checked in today
	var existing models.FeelCheck
	err := s.db.Where("user_id = ? AND check_date = ?", userID, today).First(&existing).Error
	if err == nil {
		return nil, errors.New("already checked in today")
	}

	// Filter note for prohibited content
	if s.moderationService != nil && note != "" {
		sanitized, _ := s.moderationService.FilterNote(note)
		note = sanitized
	}

	// Filter journal entry for prohibited content
	if s.moderationService != nil && journalEntry != "" {
		sanitized, _ := s.moderationService.FilterNote(journalEntry)
		journalEntry = sanitized
	}

	check := &models.FeelCheck{
		UserID:       userID,
		MoodScore:    moodScore,
		EnergyScore:  energyScore,
		MoodEmoji:    moodEmoji,
		Note:         note,
		JournalEntry: journalEntry,
		CheckDate:    today,
	}
	check.CalculateFeelScore()
	check.ColorHex = check.GetColorHex()

	if err := s.db.Create(check).Error; err != nil {
		return nil, err
	}

	// Update streak
	go s.UpdateStreak(userID)

	return check, nil
}

// UpdateJournalEntry updates the journal entry for a specific check-in
func (s *FeelService) UpdateJournalEntry(userID uuid.UUID, checkID uuid.UUID, journalEntry string) (*models.FeelCheck, error) {
	var check models.FeelCheck
	if err := s.db.Where("id = ? AND user_id = ?", checkID, userID).First(&check).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("check-in not found")
		}
		return nil, err
	}

	// Filter journal entry
	if s.moderationService != nil && journalEntry != "" {
		sanitized, _ := s.moderationService.FilterNote(journalEntry)
		journalEntry = sanitized
	}

	check.JournalEntry = journalEntry
	if err := s.db.Save(&check).Error; err != nil {
		return nil, err
	}

	return &check, nil
}

// GetTodayCheck returns today's check-in for a user
func (s *FeelService) GetTodayCheck(userID uuid.UUID) (*models.FeelCheck, error) {
	today := time.Now().Truncate(24 * time.Hour)
	var check models.FeelCheck
	err := s.db.Where("user_id = ? AND check_date = ?", userID, today).First(&check).Error
	if err != nil {
		return nil, err
	}
	return &check, nil
}

// GetFeelHistory returns check-in history for a user
func (s *FeelService) GetFeelHistory(userID uuid.UUID, limit, offset int) ([]models.FeelCheck, int64, error) {
	var checks []models.FeelCheck
	var total int64

	s.db.Model(&models.FeelCheck{}).Where("user_id = ?", userID).Count(&total)

	err := s.db.Where("user_id = ?", userID).
		Order("check_date DESC").
		Limit(limit).
		Offset(offset).
		Find(&checks).Error

	return checks, total, err
}

// GetFeelStats returns statistics for a user
func (s *FeelService) GetFeelStats(userID uuid.UUID) (map[string]interface{}, error) {
	var streak models.FeelStreak
	err := s.db.Where("user_id = ?", userID).First(&streak).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return map[string]interface{}{
				"current_streak":  0,
				"longest_streak":  0,
				"total_check_ins": 0,
				"average_score":   0,
				"unlocked_badges": []string{},
			}, nil
		}
		return nil, err
	}

	var badgeList []string
	if streak.UnlockedBadges != "" {
		badgeList = strings.Split(streak.UnlockedBadges, ",")
	} else {
		badgeList = []string{}
	}

	return map[string]interface{}{
		"current_streak":  streak.CurrentStreak,
		"longest_streak":  streak.LongestStreak,
		"total_check_ins": streak.TotalCheckIns,
		"average_score":   streak.AverageScore,
		"unlocked_badges": badgeList,
	}, nil
}

// UpdateStreak updates the user's streak after a check-in
func (s *FeelService) UpdateStreak(userID uuid.UUID) error {
	today := time.Now().Truncate(24 * time.Hour)

	var streak models.FeelStreak
	err := s.db.Where("user_id = ?", userID).First(&streak).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		// Create new streak
		streak = models.FeelStreak{
			UserID:         userID,
			CurrentStreak:  1,
			LongestStreak:  1,
			TotalCheckIns:  1,
			LastCheckDate:  &today,
			UnlockedBadges: "",
		}
		return s.db.Create(&streak).Error
	}

	// Update existing streak
	if streak.LastCheckDate != nil {
		daysSince := int(today.Sub(*streak.LastCheckDate).Hours() / 24)
		if daysSince == 1 {
			// Consecutive day
			streak.CurrentStreak++
		} else if daysSince > 1 {
			// Streak broken
			streak.CurrentStreak = 1
		}
		// daysSince == 0 means same day, keep streak
	} else {
		streak.CurrentStreak = 1
	}

	streak.TotalCheckIns++
	streak.LastCheckDate = &today

	if streak.CurrentStreak > streak.LongestStreak {
		streak.LongestStreak = streak.CurrentStreak
	}

	// Calculate average score
	var avgScore float64
	s.db.Model(&models.FeelCheck{}).
		Where("user_id = ?", userID).
		Select("AVG(feel_score)").
		Scan(&avgScore)
	streak.AverageScore = avgScore

	// Check for badge unlocks
	streak.UnlockedBadges = s.checkBadgeUnlocks(streak.CurrentStreak, streak.TotalCheckIns, streak.UnlockedBadges)

	return s.db.Save(&streak).Error
}

func (s *FeelService) checkBadgeUnlocks(streak, total int, current string) string {
	badges := make(map[string]bool)
	if current != "" {
		for _, b := range strings.Split(current, ",") {
			badges[b] = true
		}
	}

	// Streak badges
	if streak >= 3 && !badges["streak_3"] {
		badges["streak_3"] = true
	}
	if streak >= 7 && !badges["streak_7"] {
		badges["streak_7"] = true
	}
	if streak >= 14 && !badges["streak_14"] {
		badges["streak_14"] = true
	}
	if streak >= 30 && !badges["streak_30"] {
		badges["streak_30"] = true
	}

	// Total check-in badges
	if total >= 10 && !badges["total_10"] {
		badges["total_10"] = true
	}
	if total >= 50 && !badges["total_50"] {
		badges["total_50"] = true
	}
	if total >= 100 && !badges["total_100"] {
		badges["total_100"] = true
	}

	result := make([]string, 0, len(badges))
	for badge := range badges {
		result = append(result, badge)
	}
	return strings.Join(result, ",")
}

// SendGoodVibe sends positive energy to a friend
func (s *FeelService) SendGoodVibe(senderID, receiverID uuid.UUID, message, vibeType string) (*models.GoodVibe, error) {
	if senderID == receiverID {
		return nil, errors.New("cannot send vibe to yourself")
	}

	vibe := &models.GoodVibe{
		SenderID:   senderID,
		ReceiverID: receiverID,
		Message:    message,
		VibeType:   vibeType,
	}

	if err := s.db.Create(vibe).Error; err != nil {
		return nil, err
	}

	return vibe, nil
}

// GetReceivedVibes returns vibes received by a user
func (s *FeelService) GetReceivedVibes(userID uuid.UUID, limit int) ([]models.GoodVibe, error) {
	var vibes []models.GoodVibe
	err := s.db.Where("receiver_id = ?", userID).
		Preload("Sender").
		Order("created_at DESC").
		Limit(limit).
		Find(&vibes).Error
	return vibes, err
}

// GetFriendFeels returns today's feels for user's friends
func (s *FeelService) GetFriendFeels(userID uuid.UUID) ([]map[string]interface{}, error) {
	today := time.Now().Truncate(24 * time.Hour)

	// Get accepted friends
	var friends []models.FeelFriend
	err := s.db.Where("(user_id = ? OR friend_id = ?) AND status = ?", userID, userID, "accepted").
		Find(&friends).Error
	if err != nil {
		return nil, err
	}

	friendIDs := make([]uuid.UUID, 0)
	for _, f := range friends {
		if f.UserID == userID {
			friendIDs = append(friendIDs, f.FriendID)
		} else {
			friendIDs = append(friendIDs, f.UserID)
		}
	}

	if len(friendIDs) == 0 {
		return []map[string]interface{}{}, nil
	}

	// Get today's checks for friends
	var checks []models.FeelCheck
	err = s.db.Where("user_id IN ? AND check_date = ?", friendIDs, today).
		Find(&checks).Error
	if err != nil {
		return nil, err
	}

	// Get user info
	var users []models.User
	s.db.Where("id IN ?", friendIDs).Find(&users)
	userMap := make(map[uuid.UUID]models.User)
	for _, u := range users {
		userMap[u.ID] = u
	}

	result := make([]map[string]interface{}, 0)
	for _, check := range checks {
		user := userMap[check.UserID]
		result = append(result, map[string]interface{}{
			"user_id":    check.UserID,
			"name":       user.Email,
			"feel_score": check.FeelScore,
			"mood_emoji": check.MoodEmoji,
			"color_hex":  check.ColorHex,
			"check_date": check.CheckDate,
		})
	}

	return result, nil
}

// SendFriendRequest sends a friend request to a user by email
func (s *FeelService) SendFriendRequest(userID uuid.UUID, friendEmail string) (*models.FeelFriend, error) {
	// Look up friend by email
	var friend models.User
	if err := s.db.Where("email = ?", friendEmail).First(&friend).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found with that email")
		}
		return nil, err
	}

	// Cannot add yourself
	if friend.ID == userID {
		return nil, errors.New("cannot send friend request to yourself")
	}

	// Check for existing relationship in either direction
	var existing models.FeelFriend
	err := s.db.Where(
		"((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))",
		userID, friend.ID, friend.ID, userID,
	).First(&existing).Error
	if err == nil {
		if existing.Status == "pending" {
			return nil, errors.New("friend request already pending")
		}
		if existing.Status == "accepted" {
			return nil, errors.New("already friends")
		}
		if existing.Status == "blocked" {
			return nil, errors.New("cannot send friend request")
		}
	}

	// Create friend request
	request := &models.FeelFriend{
		UserID:   userID,
		FriendID: friend.ID,
		Status:   "pending",
	}
	if err := s.db.Create(request).Error; err != nil {
		return nil, err
	}

	// Preload Friend relationship for the response
	s.db.Preload("Friend").First(request, "id = ?", request.ID)

	return request, nil
}

// AcceptFriendRequest accepts a pending friend request
func (s *FeelService) AcceptFriendRequest(userID, requestID uuid.UUID) error {
	var request models.FeelFriend
	if err := s.db.First(&request, "id = ?", requestID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("friend request not found")
		}
		return err
	}

	// Only the recipient (friend_id) can accept
	if request.FriendID != userID {
		return errors.New("not authorized to accept this request")
	}

	if request.Status != "pending" {
		return errors.New("request is not pending")
	}

	request.Status = "accepted"
	return s.db.Save(&request).Error
}

// RejectFriendRequest rejects and deletes a pending friend request
func (s *FeelService) RejectFriendRequest(userID, requestID uuid.UUID) error {
	var request models.FeelFriend
	if err := s.db.First(&request, "id = ?", requestID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("friend request not found")
		}
		return err
	}

	// Only the recipient (friend_id) can reject
	if request.FriendID != userID {
		return errors.New("not authorized to reject this request")
	}

	if request.Status != "pending" {
		return errors.New("request is not pending")
	}

	return s.db.Delete(&request).Error
}

// ListFriendRequests returns pending friend requests received by a user
func (s *FeelService) ListFriendRequests(userID uuid.UUID) ([]models.FeelFriend, error) {
	var requests []models.FeelFriend
	err := s.db.Where("friend_id = ? AND status = ?", userID, "pending").
		Preload("User").
		Order("created_at DESC").
		Find(&requests).Error
	return requests, err
}

// ListFriends returns all accepted friends for a user
func (s *FeelService) ListFriends(userID uuid.UUID) ([]map[string]interface{}, error) {
	var friendships []models.FeelFriend
	err := s.db.Where("(user_id = ? OR friend_id = ?) AND status = ?", userID, userID, "accepted").
		Find(&friendships).Error
	if err != nil {
		return nil, err
	}

	if len(friendships) == 0 {
		return []map[string]interface{}{}, nil
	}

	// Collect the other user's ID from each friendship
	friendIDs := make([]uuid.UUID, 0, len(friendships))
	friendshipMap := make(map[uuid.UUID]uuid.UUID) // friendUserID -> friendshipID
	for _, f := range friendships {
		if f.UserID == userID {
			friendIDs = append(friendIDs, f.FriendID)
			friendshipMap[f.FriendID] = f.ID
		} else {
			friendIDs = append(friendIDs, f.UserID)
			friendshipMap[f.UserID] = f.ID
		}
	}

	var users []models.User
	s.db.Where("id IN ?", friendIDs).Find(&users)

	result := make([]map[string]interface{}, 0, len(users))
	for _, u := range users {
		result = append(result, map[string]interface{}{
			"id":           friendshipMap[u.ID].String(),
			"friend_id":    u.ID.String(),
			"friend_email": u.Email,
			"status":       "accepted",
		})
	}

	return result, nil
}

// RemoveFriend removes a friend connection
func (s *FeelService) RemoveFriend(userID, friendshipID uuid.UUID) error {
	var friendship models.FeelFriend
	if err := s.db.First(&friendship, "id = ?", friendshipID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("friendship not found")
		}
		return err
	}

	// Either party can remove the friendship
	if friendship.UserID != userID && friendship.FriendID != userID {
		return errors.New("not authorized to remove this friendship")
	}

	return s.db.Delete(&friendship).Error
}

// GetWeeklyInsights returns mood trend analysis comparing current and previous week
func (s *FeelService) GetWeeklyInsights(userID uuid.UUID) (*dto.InsightsResponse, error) {
	now := time.Now()

	// Calculate current week start (Monday) and end (today)
	weekday := now.Weekday()
	if weekday == time.Sunday {
		weekday = 7
	}
	daysSinceMonday := int(weekday) - 1
	currentWeekStart := now.AddDate(0, 0, -daysSinceMonday).Truncate(24 * time.Hour)
	currentWeekEnd := now.Truncate(24 * time.Hour)

	// Previous week is the 7 days before current week start
	previousWeekStart := currentWeekStart.AddDate(0, 0, -7)
	previousWeekEnd := currentWeekStart.AddDate(0, 0, -1)

	// Query current week check-ins
	var currentChecks []models.FeelCheck
	if err := s.db.Where("user_id = ? AND check_date >= ? AND check_date <= ?", userID, currentWeekStart, currentWeekEnd).
		Order("check_date ASC").
		Find(&currentChecks).Error; err != nil {
		return nil, err
	}

	// Query previous week check-ins
	var previousChecks []models.FeelCheck
	if err := s.db.Where("user_id = ? AND check_date >= ? AND check_date <= ?", userID, previousWeekStart, previousWeekEnd).
		Order("check_date ASC").
		Find(&previousChecks).Error; err != nil {
		return nil, err
	}

	// Build current week insight
	currentInsight := s.buildWeeklyInsight(currentChecks, currentWeekStart, currentWeekEnd)

	// Build previous week insight
	previousInsight := s.buildWeeklyInsight(previousChecks, previousWeekStart, previousWeekEnd)

	// Get current streak
	var streak models.FeelStreak
	if err := s.db.Where("user_id = ?", userID).First(&streak).Error; err == nil {
		currentInsight.StreakAtEnd = streak.CurrentStreak
	}

	// Calculate improvement percentage
	var improvement float64
	if previousInsight.AverageFeel > 0 {
		improvement = ((currentInsight.AverageFeel - previousInsight.AverageFeel) / previousInsight.AverageFeel) * 100
		improvement = math.Round(improvement*100) / 100
	}

	// Determine mood trend
	if previousInsight.AverageFeel > 0 {
		diff := ((currentInsight.AverageFeel - previousInsight.AverageFeel) / previousInsight.AverageFeel) * 100
		if diff > 5 {
			currentInsight.MoodTrend = "improving"
		} else if diff < -5 {
			currentInsight.MoodTrend = "declining"
		} else {
			currentInsight.MoodTrend = "stable"
		}
	} else {
		currentInsight.MoodTrend = "stable"
	}

	// Generate personalized message
	message := s.generatePersonalizedMessage(currentInsight, previousInsight, improvement, &streak)

	return &dto.InsightsResponse{
		CurrentWeek:  currentInsight,
		PreviousWeek: previousInsight,
		Improvement:  improvement,
		Message:      message,
	}, nil
}

// generatePersonalizedMessage creates a data-driven insight message
func (s *FeelService) generatePersonalizedMessage(current, previous dto.WeeklyInsight, improvement float64, streak *models.FeelStreak) string {
	type messageTemplate struct {
		condition func() bool
		message   string
		idx       int
	}

	templates := []messageTemplate{
		{func() bool { return current.AverageFeel >= 80 && improvement > 5 }, "You're on fire this week! Your mood has been climbing steadily. Keep up whatever you're doing!", 0},
		{func() bool { return current.AverageFeel >= 80 && improvement <= 5 }, "Consistently great vibes! You're maintaining a strong positive mindset.", 1},
		{func() bool { return current.AverageFeel >= 60 && improvement < -5 }, fmt.Sprintf("Your scores are solid but trending down slightly. Consider what made %s feel so great and replicate it.", current.BestDay), 2},
		{func() bool { return current.AverageFeel >= 60 && improvement > 5 }, fmt.Sprintf("Nice improvement! Your mood climbed %.1f%% this week. That positive momentum is powerful.", math.Abs(improvement)), 3},
		{func() bool {
			return current.AverageMood > current.AverageEnergy+15
		}, "Your mood is good but energy is lagging. Try getting more sleep or adding a short walk to your routine.", 4},
		{func() bool {
			return current.AverageEnergy > current.AverageMood+15
		}, "Interesting -- high energy but your mood hasn't caught up. Try a calming activity or mindfulness exercise.", 5},
		{func() bool { return current.TotalCheckIns >= 7 }, fmt.Sprintf("7 days straight -- your consistency is impressive! Regular check-ins build self-awareness."), 6},
		{func() bool { return current.TotalCheckIns >= 5 }, "Great check-in habit forming! Just a couple more days for a perfect week.", 7},
		{func() bool { return previous.AverageFeel < 50 && current.AverageFeel >= 50 && improvement > 10 }, fmt.Sprintf("You're bouncing back! Your scores improved by %.1f%% this week. That takes real resilience.", math.Abs(improvement)), 8},
		{func() bool { return current.AverageFeel < 40 && improvement < -10 }, "Tough week. Remember: tracking even the hard days builds awareness. Consider reaching out to someone you trust.", 9},
		{func() bool { return current.AverageFeel < 40 }, "Hang in there. Low periods are part of the journey. Each day you check in is a step toward understanding yourself better.", 10},
		{func() bool {
			if streak == nil {
				return false
			}
			return streak.CurrentStreak >= 14
		}, fmt.Sprintf("Two weeks strong! Your %d-day streak shows incredible dedication to self-awareness.", streak.CurrentStreak), 11},
		{func() bool {
			if streak == nil {
				return false
			}
			return streak.CurrentStreak >= 7
		}, "One week streak! You're building a powerful habit of self-reflection.", 12},
		{func() bool { return current.AverageFeel >= 60 }, fmt.Sprintf("Solid week! Your average feel score is %.0f. Keep the positive energy flowing.", current.AverageFeel), 13},
		{func() bool { return improvement > 0 }, fmt.Sprintf("Progress! Your mood improved by %.1f%% compared to last week.", math.Abs(improvement)), 14},
		{func() bool { return improvement < 0 }, fmt.Sprintf("Your mood dipped %.1f%% from last week. Try to identify what changed and adjust.", math.Abs(improvement)), 15},
		{func() bool { return current.TotalCheckIns > 0 }, "Keep checking in daily to unlock deeper insights about your mood patterns!", 16},
		{func() bool { return true }, "Start checking in to see your weekly mood insights!", 17},
	}

	// Try to avoid repeating the same message
	lastIdx := 0
	if streak != nil {
		lastIdx = streak.LastMessageIdx
	}

	for _, t := range templates {
		if t.condition() && t.idx != lastIdx {
			// Update last message index
			if streak != nil && streak.ID != uuid.Nil {
				streak.LastMessageIdx = t.idx
				s.db.Model(streak).Update("last_message_idx", t.idx)
			}
			return t.message
		}
	}

	// Fallback: allow repeat if no other match
	for _, t := range templates {
		if t.condition() {
			return t.message
		}
	}

	return "Start checking in to see your weekly mood insights!"
}

// GetWeeklyRecap returns a summary of the past 7 days for the recap card
func (s *FeelService) GetWeeklyRecap(userID uuid.UUID) (*dto.WeeklyRecapResponse, error) {
	now := time.Now()
	weekEnd := now.Truncate(24 * time.Hour)
	weekStart := weekEnd.AddDate(0, 0, -6)

	var checks []models.FeelCheck
	if err := s.db.Where("user_id = ? AND check_date >= ? AND check_date <= ?", userID, weekStart, weekEnd).
		Order("check_date ASC").
		Find(&checks).Error; err != nil {
		return nil, err
	}

	if len(checks) == 0 {
		return nil, errors.New("no check-ins this week")
	}

	var totalScore float64
	bestScore := 0
	bestDay := ""
	emojiCount := make(map[string]int)

	// Build daily scores array (7 days)
	dailyScores := make([]int, 7)
	dateToIndex := make(map[string]int)
	for i := 0; i < 7; i++ {
		day := weekStart.AddDate(0, 0, i)
		dateToIndex[day.Format("2006-01-02")] = i
	}

	for _, check := range checks {
		totalScore += float64(check.FeelScore)
		dateKey := check.CheckDate.Format("2006-01-02")
		if idx, ok := dateToIndex[dateKey]; ok {
			dailyScores[idx] = check.FeelScore
		}
		if check.FeelScore > bestScore {
			bestScore = check.FeelScore
			bestDay = check.CheckDate.Format("Monday")
		}
		if check.MoodEmoji != "" {
			emojiCount[check.MoodEmoji]++
		}
	}

	// Find top emoji
	topEmoji := ""
	maxCount := 0
	for emoji, count := range emojiCount {
		if count > maxCount {
			maxCount = count
			topEmoji = emoji
		}
	}

	// Get streak
	currentStreak := 0
	var streak models.FeelStreak
	if err := s.db.Where("user_id = ?", userID).First(&streak).Error; err == nil {
		currentStreak = streak.CurrentStreak
	}

	avgScore := math.Round((totalScore/float64(len(checks)))*100) / 100

	return &dto.WeeklyRecapResponse{
		TotalCheckins: len(checks),
		AverageScore:  avgScore,
		BestScore:     bestScore,
		BestDay:       bestDay,
		TopEmoji:      topEmoji,
		DailyScores:   dailyScores,
		CurrentStreak: currentStreak,
		WeekStart:     weekStart.Format("2006-01-02"),
		WeekEnd:       weekEnd.Format("2006-01-02"),
	}, nil
}

// buildWeeklyInsight aggregates a slice of FeelCheck records into a WeeklyInsight
func (s *FeelService) buildWeeklyInsight(checks []models.FeelCheck, weekStart, weekEnd time.Time) dto.WeeklyInsight {
	insight := dto.WeeklyInsight{
		WeekStart: weekStart.Format("2006-01-02"),
		WeekEnd:   weekEnd.Format("2006-01-02"),
	}

	if len(checks) == 0 {
		return insight
	}

	var totalMood, totalEnergy, totalFeel float64
	var bestCheck, worstCheck models.FeelCheck
	emojiCount := make(map[string]int)

	bestCheck = checks[0]
	worstCheck = checks[0]

	for _, check := range checks {
		totalMood += float64(check.MoodScore)
		totalEnergy += float64(check.EnergyScore)
		totalFeel += float64(check.FeelScore)

		if check.FeelScore > bestCheck.FeelScore {
			bestCheck = check
		}
		if check.FeelScore < worstCheck.FeelScore {
			worstCheck = check
		}

		if check.MoodEmoji != "" {
			emojiCount[check.MoodEmoji]++
		}
	}

	count := float64(len(checks))
	insight.AverageMood = math.Round((totalMood/count)*100) / 100
	insight.AverageEnergy = math.Round((totalEnergy/count)*100) / 100
	insight.AverageFeel = math.Round((totalFeel/count)*100) / 100
	insight.TotalCheckIns = len(checks)
	insight.BestDay = bestCheck.CheckDate.Format("2006-01-02")
	insight.WorstDay = worstCheck.CheckDate.Format("2006-01-02")

	// Find dominant emoji
	var maxCount int
	for emoji, c := range emojiCount {
		if c > maxCount {
			maxCount = c
			insight.DominantEmoji = emoji
		}
	}

	return insight
}
