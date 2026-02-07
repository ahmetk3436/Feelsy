package middleware

import (
	"github.com/ahmetcoskunkizilkaya/feelsy/backend/internal/config"
	"github.com/ahmetcoskunkizilkaya/feelsy/backend/internal/dto"
	jwtware "github.com/gofiber/contrib/jwt"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

func JWTProtected(cfg *config.Config) fiber.Handler {
	return jwtware.New(jwtware.Config{
		SigningKey: jwtware.SigningKey{Key: []byte(cfg.JWTSecret)},
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusUnauthorized).JSON(dto.ErrorResponse{
				Error:   true,
				Message: "Unauthorized: invalid or expired token",
			})
		},
	})
}

// AdminOnly restricts access to users with the "admin" role in their JWT claims.
func AdminOnly(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		token := c.Locals("user").(*jwt.Token)
		claims := token.Claims.(jwt.MapClaims)
		role, ok := claims["role"].(string)
		if !ok || role != "admin" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":   true,
				"message": "Forbidden: admin access required",
			})
		}
		return c.Next()
	}
}
