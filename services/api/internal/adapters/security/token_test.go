package security

import (
	"testing"
	"time"

	"github.com/sakuplan/api/internal/domain"
)

func TestJWTManagerIssueAndParse(t *testing.T) {
	now := time.Date(2026, 7, 24, 4, 0, 0, 0, time.UTC)
	manager, err := NewJWTManager(JWTConfig{Secret: "01234567890123456789012345678901", Issuer: "sakuplan", Audience: "mobile", TTL: 15 * time.Minute})
	if err != nil {
		t.Fatal(err)
	}
	raw, _, err := manager.Issue("user-1", domain.RoleUser, now)
	if err != nil {
		t.Fatal(err)
	}
	claims, err := manager.Parse(raw, now.Add(time.Minute))
	if err != nil {
		t.Fatal(err)
	}
	if claims.UserID != "user-1" || claims.Role != domain.RoleUser {
		t.Fatalf("unexpected claims: %#v", claims)
	}
	if _, err := manager.Parse(raw, now.Add(16*time.Minute)); err == nil {
		t.Fatal("expected expired token")
	}
}

func TestRefreshManagerNeverStoresPlainToken(t *testing.T) {
	m := NewRefreshManager()
	plain, hash, err := m.Generate()
	if err != nil {
		t.Fatal(err)
	}
	if plain == hash || len(hash) != 64 || m.Hash(plain) != hash {
		t.Fatalf("unexpected token/hash pair")
	}
}
