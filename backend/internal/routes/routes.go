package routes

import (
	"github.com/ahmetcoskunkizilkaya/feelsy/backend/internal/config"
	"github.com/ahmetcoskunkizilkaya/feelsy/backend/internal/handlers"
	"github.com/ahmetcoskunkizilkaya/feelsy/backend/internal/middleware"
	"github.com/gofiber/fiber/v2"
)

func Setup(
	app *fiber.App,
	cfg *config.Config,
	authHandler *handlers.AuthHandler,
	healthHandler *handlers.HealthHandler,
	webhookHandler *handlers.WebhookHandler,
	moderationHandler *handlers.ModerationHandler,
	feelHandler *handlers.FeelHandler,
	legalHandler *handlers.LegalHandler,
) {
	api := app.Group("/api")

	// Health
	api.Get("/health", healthHandler.Check)

	// Legal pages (public)
	api.Get("/privacy-policy", legalHandler.PrivacyPolicy)
	api.Get("/terms", legalHandler.TermsOfService)

	// Auth (public)
	auth := api.Group("/auth")
	auth.Post("/register", authHandler.Register)
	auth.Post("/login", authHandler.Login)
	auth.Post("/refresh", authHandler.Refresh)
	auth.Post("/apple", authHandler.AppleSignIn) // Sign in with Apple (Guideline 4.8)

	// Auth (protected)
	protected := api.Group("", middleware.JWTProtected(cfg))
	protected.Post("/auth/logout", authHandler.Logout)
	protected.Delete("/auth/account", authHandler.DeleteAccount) // Account deletion (Guideline 5.1.1)

	// Moderation - User endpoints (protected)
	protected.Post("/reports", moderationHandler.CreateReport)     // Report content (Guideline 1.2)
	protected.Post("/blocks", moderationHandler.BlockUser)         // Block user (Guideline 1.2)
	protected.Delete("/blocks/:id", moderationHandler.UnblockUser) // Unblock user

	// Feelsy - Daily mood check-ins (protected)
	feels := protected.Group("/feels")
	feels.Post("", feelHandler.CreateFeelCheck)         // Create daily check-in
	feels.Get("/today", feelHandler.GetTodayCheck)      // Get today's check-in
	feels.Get("/history", feelHandler.GetFeelHistory)   // Get check-in history
	feels.Get("/stats", feelHandler.GetFeelStats)       // Get stats & streaks
	feels.Get("/insights", feelHandler.GetWeeklyInsights) // Get weekly mood insights
	feels.Get("/recap", feelHandler.GetWeeklyRecap)      // Get weekly recap summary
	feels.Put("/:id/journal", feelHandler.UpdateJournal) // Update journal entry
	feels.Post("/vibe", feelHandler.SendGoodVibe)       // Send good vibes to friend
	feels.Get("/vibes", feelHandler.GetReceivedVibes)   // Get received vibes
	feels.Get("/friends", feelHandler.GetFriendFeels)   // Get friend feels today

	// Friend request management
	feels.Post("/friends/add", feelHandler.SendFriendRequest)              // Send friend request by email
	feels.Get("/friends/requests", feelHandler.ListFriendRequests)         // List pending incoming requests
	feels.Get("/friends/list", feelHandler.ListFriends)                    // List accepted friends
	feels.Put("/friends/:id/accept", feelHandler.AcceptFriendRequest)      // Accept friend request
	feels.Delete("/friends/:id/reject", feelHandler.RejectFriendRequest)   // Reject friend request
	feels.Delete("/friends/:id", feelHandler.RemoveFriend)                 // Remove friend

	// Admin moderation panel (protected + admin role required)
	admin := api.Group("/admin", middleware.JWTProtected(cfg), middleware.AdminOnly(cfg))
	admin.Get("/moderation/reports", moderationHandler.ListReports)
	admin.Put("/moderation/reports/:id", moderationHandler.ActionReport)

	// Webhooks (verified by auth header, not JWT)
	webhooks := api.Group("/webhooks")
	webhooks.Post("/revenuecat", webhookHandler.HandleRevenueCat)
}
