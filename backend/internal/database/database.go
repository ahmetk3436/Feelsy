package database

import (
	"fmt"
	"log"

	"github.com/ahmetcoskunkizilkaya/feelsy/backend/internal/config"
	"github.com/ahmetcoskunkizilkaya/feelsy/backend/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect(cfg *config.Config) error {
	var err error
	DB, err = gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get sql.DB: %w", err)
	}

	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(5)

	log.Println("Database connected successfully")
	return nil
}

func Migrate() error {
	err := DB.AutoMigrate(
		&models.User{},
		&models.RefreshToken{},
		&models.Subscription{},
		&models.Report{},
		&models.Block{},
		&models.FeelCheck{},
		&models.FeelStreak{},
		&models.FeelFriend{},
		&models.GoodVibe{},
	)
	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Println("Database migrations completed")
	return nil
}

func Ping() error {
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Ping()
}
