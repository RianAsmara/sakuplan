package application_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/sakuplan/api/internal/application"
	"github.com/sakuplan/api/internal/domain"
	"github.com/sakuplan/api/internal/testkit"
)

func authFixture() (*application.AuthService, *testkit.Users, *testkit.Sessions, *testkit.Refresh, testkit.Clock) {
	clock := testkit.Clock{Time: time.Date(2026, 7, 24, 10, 0, 0, 0, time.UTC)}
	users := testkit.NewUsers()
	sessions := testkit.NewSessions()
	refresh := &testkit.Refresh{}
	svc := application.NewAuthService(users, sessions, &testkit.Audits{}, testkit.Hasher{}, testkit.Access{}, refresh, testkit.UOW{}, clock, &testkit.IDs{}, 30*24*time.Hour)
	return svc, users, sessions, refresh, clock
}

func TestRegisterCreatesUserAndTokens(t *testing.T) {
	svc, users, _, _, _ := authFixture()
	pair, err := svc.Register(context.Background(), application.RegisterInput{
		Email: "Rian@example.com", Password: "strong-password", DisplayName: "Rian",
		AcceptedTermsVersion: "2026-08-02", AcceptedPrivacyVersion: "2026-08-02",
	})
	if err != nil {
		t.Fatal(err)
	}
	if pair.AccessToken == "" || pair.RefreshToken == "" {
		t.Fatal("expected token pair")
	}
	if len(users.ByID) != 1 {
		t.Fatalf("expected one user, got %d", len(users.ByID))
	}
	stored := users.ByID[pair.User.ID]
	if stored.AcceptedTermsVersion != "2026-08-02" || stored.AcceptedPrivacyVersion != "2026-08-02" {
		t.Fatalf("expected consent versions to be persisted, got %+v", stored)
	}
}

func TestRegisterRejectsMissingConsent(t *testing.T) {
	svc, _, _, _, _ := authFixture()
	_, err := svc.Register(context.Background(), application.RegisterInput{
		Email: "missing-consent@example.com", Password: "strong-password", DisplayName: "No Consent",
	})
	var validation domain.ValidationError
	if !errors.As(err, &validation) {
		t.Fatalf("expected validation error, got %v", err)
	}
}

func TestLoginHidesUnknownEmail(t *testing.T) {
	svc, _, _, _, _ := authFixture()
	_, err := svc.Login(context.Background(), application.LoginInput{Email: "missing@example.com", Password: "whatever"})
	if !errors.Is(err, domain.ErrInvalidCredentials) {
		t.Fatalf("expected invalid credentials, got %v", err)
	}
}

func TestRefreshRotatesSessionAndRejectsReuse(t *testing.T) {
	svc, _, sessions, refresh, _ := authFixture()
	pair, err := svc.Register(context.Background(), application.RegisterInput{
		Email: "a@example.com", Password: "strong-password", DisplayName: "A",
		AcceptedTermsVersion: "2026-08-02", AcceptedPrivacyVersion: "2026-08-02",
	})
	if err != nil {
		t.Fatal(err)
	}
	rotated, err := svc.Refresh(context.Background(), pair.RefreshToken, "ua", "ip")
	if err != nil {
		t.Fatal(err)
	}
	if rotated.RefreshToken == pair.RefreshToken {
		t.Fatal("refresh token was not rotated")
	}
	_, err = svc.Refresh(context.Background(), pair.RefreshToken, "ua", "ip")
	if !errors.Is(err, domain.ErrUnauthorized) {
		t.Fatalf("expected unauthorized reuse, got %v", err)
	}
	old, err := sessions.GetByTokenHash(context.Background(), refresh.Hash(pair.RefreshToken))
	if err != nil {
		t.Fatal(err)
	}
	if old.RevokedAt == nil || old.ReplacedByID == "" {
		t.Fatal("old session not marked rotated")
	}
}
