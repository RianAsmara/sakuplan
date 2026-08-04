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

func TestAccountRejectsUnknownType(t *testing.T) {
	svc := application.NewAccountService(testkit.NewAccounts(), testkit.Clock{Time: time.Now()}, &testkit.IDs{})
	_, err := svc.Create(context.Background(), "u1", application.CreateAccountInput{Name: "Invalid", Type: domain.AccountType("crypto"), Currency: "IDR"})
	if !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}

func TestBudgetRejectsAnotherUsersCategory(t *testing.T) {
	categories := testkit.NewCategories()
	_, _ = categories.Create(context.Background(), domain.Category{ID: "private-category", UserID: "u2", Kind: domain.CategoryExpense})
	svc := application.NewBudgetService(testkit.NewBudgets(), categories, testkit.Clock{Time: time.Now()}, &testkit.IDs{})
	_, err := svc.CreateDraft(context.Background(), "u1", application.CreateBudgetInput{
		StartDate:      time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC),
		EndDate:        time.Date(2026, 7, 31, 0, 0, 0, 0, time.UTC),
		ExpectedIncome: 1_000_000,
		Allocations:    map[string]domain.Money{"private-category": 100_000},
	})
	if !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("expected ownership-scoped not found, got %v", err)
	}
}

func TestBillRejectsAnotherUsersAccount(t *testing.T) {
	accounts := testkit.NewAccounts()
	_, _ = accounts.Create(context.Background(), domain.FinancialAccount{ID: "other-account", UserID: "u2", Currency: "IDR", Spendable: true})
	categories := testkit.NewCategories()
	_, _ = categories.Create(context.Background(), domain.Category{ID: "utilities", Kind: domain.CategoryExpense, IsDefault: true})
	svc := application.NewBillService(&testkit.Bills{}, accounts, categories, testkit.Clock{Time: time.Now()}, &testkit.IDs{})
	_, err := svc.Create(context.Background(), "u1", domain.RecurringBill{
		Name:       "Internet",
		Amount:     350_000,
		DueDay:     10,
		Frequency:  domain.BillMonthly,
		CategoryID: "utilities",
		AccountID:  "other-account",
	})
	if !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("expected ownership-scoped not found, got %v", err)
	}
}
