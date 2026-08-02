package domain_test

import (
	"errors"
	"testing"

	"github.com/sakuplan/api/internal/domain"
)

func TestNewMoneyRejectsNegative(t *testing.T) {
	_, err := domain.NewMoney(-1)
	if !errors.Is(err, domain.ErrInvalidAmount) {
		t.Fatalf("expected invalid amount, got %v", err)
	}
}

func TestNormalizeEmail(t *testing.T) {
	got := domain.NormalizeEmail("  RIAN@Example.COM ")
	if got != "rian@example.com" {
		t.Fatalf("unexpected email %q", got)
	}
}
