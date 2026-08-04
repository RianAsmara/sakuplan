package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Environment     string
	HTTPAddress     string
	DatabaseURL     string
	DBMaxConns      int32
	JWTSecret       string
	JWTIssuer       string
	JWTAudience     string
	AccessTTL       time.Duration
	RefreshTTL      time.Duration
	ShutdownTimeout time.Duration
}

func Load() (Config, error) {
	cfg := Config{
		Environment: value("APP_ENV", "development"),
		HTTPAddress: value("HTTP_ADDRESS", ":8080"),
		DatabaseURL: strings.TrimSpace(os.Getenv("DATABASE_URL")),
		JWTSecret:   os.Getenv("JWT_SECRET"),
		JWTIssuer:   value("JWT_ISSUER", "sakuplan-api"),
		JWTAudience: value("JWT_AUDIENCE", "sakuplan-client"),
	}
	var err error
	if cfg.DBMaxConns, err = int32Value("DB_MAX_CONNS", 10); err != nil {
		return Config{}, err
	}
	if cfg.AccessTTL, err = duration("ACCESS_TOKEN_TTL", 15*time.Minute); err != nil {
		return Config{}, err
	}
	if cfg.RefreshTTL, err = duration("REFRESH_TOKEN_TTL", 30*24*time.Hour); err != nil {
		return Config{}, err
	}
	if cfg.ShutdownTimeout, err = duration("SHUTDOWN_TIMEOUT", 10*time.Second); err != nil {
		return Config{}, err
	}
	if cfg.DatabaseURL == "" {
		return Config{}, errors.New("DATABASE_URL is required")
	}
	if len(cfg.JWTSecret) < 32 {
		return Config{}, errors.New("JWT_SECRET must contain at least 32 characters")
	}
	return cfg, nil
}

func value(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}
func duration(key string, fallback time.Duration) (time.Duration, error) {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback, nil
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return 0, fmt.Errorf("%s: %w", key, err)
	}
	return d, nil
}
func int32Value(key string, fallback int32) (int32, error) {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback, nil
	}
	n, err := strconv.ParseInt(v, 10, 32)
	if err != nil || n <= 0 {
		return 0, fmt.Errorf("%s must be a positive integer", key)
	}
	return int32(n), nil
}
