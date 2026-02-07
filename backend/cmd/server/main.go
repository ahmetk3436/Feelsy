package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/ahmetcoskunkizilkaya/feelsy/backend/internal/config"
	"github.com/ahmetcoskunkizilkaya/feelsy/backend/internal/database"
	"github.com/ahmetcoskunkizilkaya/feelsy/backend/internal/handlers"
	"github.com/ahmetcoskunkizilkaya/feelsy/backend/internal/middleware"
	"github.com/ahmetcoskunkizilkaya/feelsy/backend/internal/routes"
	"github.com/ahmetcoskunkizilkaya/feelsy/backend/internal/services"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	fiberlogger "github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"
	"time"
)

func main() {
	fmt.Println("=== Feelsy backend starting ===")
	cfg := config.Load()
	fmt.Printf("DB_HOST=%s DB_PORT=%s DB_USER=%s DB_NAME=%s PORT=%s JWT_SECRET_LEN=%d DB_PASSWORD_LEN=%d\n",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBName, cfg.Port, len(cfg.JWTSecret), len(cfg.DBPassword))

	if cfg.JWTSecret == "" {
		log.Fatal("JWT_SECRET environment variable is required")
	}
	if cfg.DBPassword == "" {
		log.Fatal("DB_PASSWORD environment variable is required")
	}

	// Database
	fmt.Println("=== Connecting to database ===")
	if err := database.Connect(cfg); err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}
	fmt.Println("=== Database connected, running migrations ===")
	if err := database.Migrate(); err != nil {
		log.Fatalf("Database migration failed: %v", err)
	}
	fmt.Println("=== Migrations complete, initializing services ===")

	// Services
	authService := services.NewAuthService(database.DB, cfg)
	subscriptionService := services.NewSubscriptionService(database.DB)
	moderationService := services.NewModerationService(database.DB)
	feelService := services.NewFeelService(database.DB, moderationService)

	// Handlers
	authHandler := handlers.NewAuthHandler(authService)
	healthHandler := handlers.NewHealthHandler()
	webhookHandler := handlers.NewWebhookHandler(subscriptionService, cfg)
	moderationHandler := handlers.NewModerationHandler(moderationService)
	feelHandler := handlers.NewFeelHandler(feelService)

	// Fiber app
	app := fiber.New(fiber.Config{
		BodyLimit:    4 * 1024 * 1024, // 4MB
		ErrorHandler: customErrorHandler,
	})

	// Global middleware
	app.Use(recover.New())
	app.Use(requestid.New())
	app.Use(fiberlogger.New(fiberlogger.Config{
		Format: "${time} | ${status} | ${latency} | ${ip} | ${method} | ${path}\n",
	}))
	app.Use(middleware.CORS(cfg))

	// Rate limiter on auth endpoints
	authLimiter := limiter.New(limiter.Config{
		Max:               20,
		Expiration:        1 * time.Minute,
		LimiterMiddleware: limiter.SlidingWindow{},
	})
	app.Use("/api/auth", authLimiter)

	// Routes
	routes.Setup(app, cfg, authHandler, healthHandler, webhookHandler, moderationHandler, feelHandler)

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		if err := app.Listen(":" + cfg.Port); err != nil {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	log.Printf("Server running on port %s", cfg.Port)

	<-quit
	log.Println("Shutting down server...")
	if err := app.Shutdown(); err != nil {
		log.Fatalf("Server shutdown error: %v", err)
	}
	log.Println("Server stopped")
}

func customErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}
	return c.Status(code).JSON(fiber.Map{
		"error":   true,
		"message": err.Error(),
	})
}
