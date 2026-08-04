package config

import (
	"testing"
	"time"
)

func TestLoadDefaultsAndOverrides(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/sakuplan?sslmode=disable")
	t.Setenv("JWT_SECRET", "01234567890123456789012345678901")
	t.Setenv("ACCESS_TOKEN_TTL", "20m")
	t.Setenv("DB_MAX_CONNS", "15")

	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.HTTPAddress != ":8080" || cfg.AccessTTL != 20*time.Minute || cfg.DBMaxConns != 15 {
		t.Fatalf("unexpected config: %+v", cfg)
	}
}

func TestLoadRejectsWeakJWTSecret(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://localhost/sakuplan")
	t.Setenv("JWT_SECRET", "too-short")
	if _, err := Load(); err == nil {
		t.Fatal("expected JWT secret validation error")
	}
}

func TestLoadRejectsInvalidPositiveInteger(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://localhost/sakuplan")
	t.Setenv("JWT_SECRET", "01234567890123456789012345678901")
	t.Setenv("DB_MAX_CONNS", "0")
	if _, err := Load(); err == nil {
		t.Fatal("expected DB_MAX_CONNS validation error")
	}
}
