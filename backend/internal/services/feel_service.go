package services

import (
	"errors"
	"time"

	"github.com/ahmetcoskunkizilkaya/feelsy/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type FeelService struct {
	db *gorm.DB
}

func NewFeelService(db *gorm.DB) *FeelService {
	return &FeelService{db: db}
}

// CreateFeelCheck creates a new daily mood check-in
func (s *FeelService) CreateFeelCheck(userID uuid.UUID, moodScore, energyScore int, moodEmoji, note string) (*models.FeelCheck, error) {
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

	check := &models.FeelCheck{
		UserID:      userID,
		MoodScore:   moodScore,
		EnergyScore: energyScore,
		MoodEmoji:   moodEmoji,
		Note:        note,
		CheckDate:   today,
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

	return map[string]interface{}{
		"current_streak":  streak.CurrentStreak,
		"longest_streak":  streak.LongestStreak,
		"total_check_ins": streak.TotalCheckIns,
		"average_score":   streak.AverageScore,
		"unlocked_badges": streak.UnlockedBadges,
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
			UnlockedBadges: []string{},
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

func (s *FeelService) checkBadgeUnlocks(streak, total int, current []string) []string {
	badges := make(map[string]bool)
	for _, b := range current {
		badges[b] = true
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
	return result
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
