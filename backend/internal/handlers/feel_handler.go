package handlers

import (
	"strconv"

	"github.com/ahmetcoskunkizilkaya/feelsy/backend/internal/dto"
	"github.com/ahmetcoskunkizilkaya/feelsy/backend/internal/services"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type FeelHandler struct {
	service *services.FeelService
}

func NewFeelHandler(service *services.FeelService) *FeelHandler {
	return &FeelHandler{service: service}
}

// CreateFeelCheck handles POST /api/feels
func (h *FeelHandler) CreateFeelCheck(c *fiber.Ctx) error {
	userToken := c.Locals("user").(*jwt.Token)
	claims := userToken.Claims.(jwt.MapClaims)
	userID, _ := uuid.Parse(claims["sub"].(string))

	var req dto.CreateFeelCheckRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid request body",
		})
	}

	check, err := h.service.CreateFeelCheck(userID, req.MoodScore, req.EnergyScore, req.MoodEmoji, req.Note)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(check)
}

// GetTodayCheck handles GET /api/feels/today
func (h *FeelHandler) GetTodayCheck(c *fiber.Ctx) error {
	userToken := c.Locals("user").(*jwt.Token)
	claims := userToken.Claims.(jwt.MapClaims)
	userID, _ := uuid.Parse(claims["sub"].(string))

	check, err := h.service.GetTodayCheck(userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error":   true,
			"message": "No check-in today",
		})
	}

	return c.JSON(check)
}

// GetFeelHistory handles GET /api/feels/history
func (h *FeelHandler) GetFeelHistory(c *fiber.Ctx) error {
	userToken := c.Locals("user").(*jwt.Token)
	claims := userToken.Claims.(jwt.MapClaims)
	userID, _ := uuid.Parse(claims["sub"].(string))

	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	if limit > 100 {
		limit = 100
	}

	checks, total, err := h.service.GetFeelHistory(userID, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Failed to fetch history",
		})
	}

	return c.JSON(fiber.Map{
		"data":   checks,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// GetFeelStats handles GET /api/feels/stats
func (h *FeelHandler) GetFeelStats(c *fiber.Ctx) error {
	userToken := c.Locals("user").(*jwt.Token)
	claims := userToken.Claims.(jwt.MapClaims)
	userID, _ := uuid.Parse(claims["sub"].(string))

	stats, err := h.service.GetFeelStats(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Failed to fetch stats",
		})
	}

	return c.JSON(stats)
}

// SendGoodVibe handles POST /api/feels/vibe
func (h *FeelHandler) SendGoodVibe(c *fiber.Ctx) error {
	userToken := c.Locals("user").(*jwt.Token)
	claims := userToken.Claims.(jwt.MapClaims)
	senderID, _ := uuid.Parse(claims["sub"].(string))

	var req dto.SendGoodVibeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid request body",
		})
	}

	receiverID, err := uuid.Parse(req.ReceiverID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid receiver ID",
		})
	}

	vibe, err := h.service.SendGoodVibe(senderID, receiverID, req.Message, req.VibeType)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(vibe)
}

// GetReceivedVibes handles GET /api/feels/vibes
func (h *FeelHandler) GetReceivedVibes(c *fiber.Ctx) error {
	userToken := c.Locals("user").(*jwt.Token)
	claims := userToken.Claims.(jwt.MapClaims)
	userID, _ := uuid.Parse(claims["sub"].(string))

	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if limit > 50 {
		limit = 50
	}

	vibes, err := h.service.GetReceivedVibes(userID, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Failed to fetch vibes",
		})
	}

	return c.JSON(fiber.Map{
		"data": vibes,
	})
}

// GetFriendFeels handles GET /api/feels/friends
func (h *FeelHandler) GetFriendFeels(c *fiber.Ctx) error {
	userToken := c.Locals("user").(*jwt.Token)
	claims := userToken.Claims.(jwt.MapClaims)
	userID, _ := uuid.Parse(claims["sub"].(string))

	feels, err := h.service.GetFriendFeels(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Failed to fetch friend feels",
		})
	}

	return c.JSON(fiber.Map{
		"data": feels,
	})
}
