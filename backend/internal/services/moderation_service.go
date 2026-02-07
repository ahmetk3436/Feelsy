package services

import (
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/ahmetcoskunkizilkaya/feelsy/backend/internal/dto"
	"github.com/ahmetcoskunkizilkaya/feelsy/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrReportNotFound = errors.New("report not found")
	ErrAlreadyBlocked = errors.New("user already blocked")
	ErrSelfBlock      = errors.New("cannot block yourself")
)

// moderationPattern represents a content filter pattern with severity scoring
type moderationPattern struct {
	pattern  *regexp.Regexp
	severity int // 1-10, higher = more severe
	category string
}

// Comprehensive content moderation patterns (Apple Guideline 1.2)
var moderationPatterns = []moderationPattern{
	// Spam indicators (severity 3-5)
	{regexp.MustCompile(`(?i)\b(spam|scam|phishing)\b`), 4, "spam"},
	{regexp.MustCompile(`(?i)\b(buy now|click here|free money|act now)\b`), 3, "spam"},
	{regexp.MustCompile(`(?i)(https?://\S+){3,}`), 5, "spam"}, // Multiple URLs
	{regexp.MustCompile(`[a-zA-Z]{20,}`), 3, "spam"},              // Long repeated/gibberish text

	// Profanity (severity 2-6)
	{regexp.MustCompile(`(?i)\b(fuck|shit|bitch|asshole|bastard|damn)\b`), 4, "profanity"},
	{regexp.MustCompile(`(?i)\b(crap|hell|piss|dick|cock|pussy)\b`), 3, "profanity"},
	{regexp.MustCompile(`(?i)\b(motherfucker|bullshit|goddamn)\b`), 5, "profanity"},

	// Harassment (severity 5-8)
	{regexp.MustCompile(`(?i)\b(kill yourself|kys|die|go die)\b`), 8, "harassment"},
	{regexp.MustCompile(`(?i)\b(loser|idiot|stupid|dumb|ugly|fat|worthless)\b`), 4, "harassment"},
	{regexp.MustCompile(`(?i)\b(hate you|hope you die|you suck)\b`), 7, "harassment"},
	{regexp.MustCompile(`(?i)\b(retard|retarded)\b`), 6, "harassment"},

	// Self-harm keywords (severity 9-10)
	{regexp.MustCompile(`(?i)\b(suicide|suicidal|self.?harm|cut myself|end it all)\b`), 9, "self-harm"},
	{regexp.MustCompile(`(?i)\b(want to die|don't want to live|kill myself)\b`), 10, "self-harm"},

	// Slurs (severity 8-10)
	{regexp.MustCompile(`(?i)\b(nigger|nigga|faggot|fag|tranny|chink|spic|kike|wetback)\b`), 10, "slur"},
}

type ModerationService struct {
	db *gorm.DB
}

func NewModerationService(db *gorm.DB) *ModerationService {
	return &ModerationService{db: db}
}

// --- Content Filtering ---

// FilterContent checks text against profanity patterns. Returns true if clean, false if flagged.
func (s *ModerationService) FilterContent(text string) (bool, string) {
	totalScore := 0
	var matched []string

	for _, mp := range moderationPatterns {
		if mp.pattern.MatchString(text) {
			totalScore += mp.severity
			matched = append(matched, mp.category)
		}
	}

	if totalScore > 5 {
		return false, fmt.Sprintf("Content flagged (score %d) in categories: %s", totalScore, strings.Join(uniqueStrings(matched), ", "))
	}
	return true, ""
}

// SanitizeContent replaces prohibited content with asterisks of the same length.
func (s *ModerationService) SanitizeContent(text string) string {
	result := text
	for _, mp := range moderationPatterns {
		result = mp.pattern.ReplaceAllStringFunc(result, func(match string) string {
			return strings.Repeat("*", len(match))
		})
	}
	return result
}

// FilterNote filters check-in notes for prohibited content.
// Returns sanitized text and whether the content was flagged.
func (s *ModerationService) FilterNote(text string) (string, bool) {
	clean, _ := s.FilterContent(text)
	if !clean {
		sanitized := s.SanitizeContent(text)
		return sanitized, true
	}
	return text, false
}

// uniqueStrings returns unique strings from a slice
func uniqueStrings(items []string) []string {
	seen := make(map[string]bool)
	result := make([]string, 0)
	for _, item := range items {
		if !seen[item] {
			seen[item] = true
			result = append(result, item)
		}
	}
	return result
}

// --- Reports ---

func (s *ModerationService) CreateReport(reporterID uuid.UUID, req *dto.CreateReportRequest) (*models.Report, error) {
	validTypes := map[string]bool{"user": true, "post": true, "comment": true}
	if !validTypes[req.ContentType] {
		return nil, errors.New("invalid content_type: must be user, post, or comment")
	}

	if strings.TrimSpace(req.Reason) == "" {
		return nil, errors.New("reason is required")
	}

	report := models.Report{
		ID:          uuid.New(),
		ReporterID:  reporterID,
		ContentType: req.ContentType,
		ContentID:   req.ContentID,
		Reason:      req.Reason,
		Status:      "pending",
	}

	if err := s.db.Create(&report).Error; err != nil {
		return nil, fmt.Errorf("failed to create report: %w", err)
	}

	return &report, nil
}

func (s *ModerationService) ListReports(status string, limit, offset int) ([]models.Report, int64, error) {
	var reports []models.Report
	var total int64

	query := s.db.Model(&models.Report{})
	if status != "" {
		query = query.Where("status = ?", status)
	}

	query.Count(&total)

	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&reports).Error; err != nil {
		return nil, 0, err
	}

	return reports, total, nil
}

func (s *ModerationService) ActionReport(reportID uuid.UUID, req *dto.ActionReportRequest) error {
	validStatuses := map[string]bool{"reviewed": true, "actioned": true, "dismissed": true}
	if !validStatuses[req.Status] {
		return errors.New("invalid status: must be reviewed, actioned, or dismissed")
	}

	result := s.db.Model(&models.Report{}).
		Where("id = ?", reportID).
		Updates(map[string]interface{}{
			"status":     req.Status,
			"admin_note": req.AdminNote,
		})

	if result.RowsAffected == 0 {
		return ErrReportNotFound
	}

	return result.Error
}

// --- Blocking ---

func (s *ModerationService) BlockUser(blockerID, blockedID uuid.UUID) error {
	if blockerID == blockedID {
		return ErrSelfBlock
	}

	var existing models.Block
	if err := s.db.Where("blocker_id = ? AND blocked_id = ?", blockerID, blockedID).First(&existing).Error; err == nil {
		return ErrAlreadyBlocked
	}

	block := models.Block{
		ID:        uuid.New(),
		BlockerID: blockerID,
		BlockedID: blockedID,
	}

	return s.db.Create(&block).Error
}

func (s *ModerationService) UnblockUser(blockerID, blockedID uuid.UUID) error {
	return s.db.Where("blocker_id = ? AND blocked_id = ?", blockerID, blockedID).
		Delete(&models.Block{}).Error
}

func (s *ModerationService) GetBlockedIDs(userID uuid.UUID) ([]uuid.UUID, error) {
	var blocks []models.Block
	if err := s.db.Where("blocker_id = ?", userID).Find(&blocks).Error; err != nil {
		return nil, err
	}

	ids := make([]uuid.UUID, len(blocks))
	for i, b := range blocks {
		ids[i] = b.BlockedID
	}
	return ids, nil
}
