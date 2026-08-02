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

func TestUpdateProfileValidatesTimezoneAndFinancialPreferences(t *testing.T) {
	users := testkit.NewUsers()
	_, _ = users.Create(context.Background(), domain.User{ID: "u1", Email: "u@example.com", DisplayName: "Old", Status: domain.UserStatusActive, Currency: "IDR", Timezone: "Asia/Jakarta", Payday: 25})
	audits := &testkit.Audits{}
	svc := application.NewUserService(users, audits, testkit.Clock{Time: time.Date(2026, 7, 24, 0, 0, 0, 0, time.UTC)}, &testkit.IDs{})

	updated, err := svc.Update(context.Background(), "u1", application.UpdateProfileInput{
		DisplayName:   "Rian",
		Currency:      "idr",
		Timezone:      "Asia/Jakarta",
		Payday:        28,
		MinimumBuffer: 500_000,
		AIConsent:     true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if updated.Currency != "IDR" || updated.Payday != 28 || updated.MinimumBuffer != 500_000 || !updated.AIConsent {
		t.Fatalf("unexpected profile: %+v", updated)
	}
	if len(audits.Events) != 1 {
		t.Fatalf("expected audit event, got %d", len(audits.Events))
	}
}

func TestUpdateProfileRejectsInvalidTimezone(t *testing.T) {
	users := testkit.NewUsers()
	_, _ = users.Create(context.Background(), domain.User{ID: "u1", Status: domain.UserStatusActive})
	svc := application.NewUserService(users, nil, testkit.Clock{Time: time.Now()}, &testkit.IDs{})
	_, err := svc.Update(context.Background(), "u1", application.UpdateProfileInput{DisplayName: "Rian", Currency: "IDR", Timezone: "Mars/Olympus", Payday: 25})
	if !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}
