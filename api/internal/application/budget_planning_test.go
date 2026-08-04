package application_test

import (
	"context"
	"errors"
	"math"
	"testing"
	"time"

	"github.com/sakuplan/api/internal/application"
	"github.com/sakuplan/api/internal/domain"
	"github.com/sakuplan/api/internal/testkit"
)

func TestBudgetRejectsOverAllocation(t *testing.T) {
	repo := testkit.NewBudgets()
	categories := testkit.NewCategories()
	_, _ = categories.Create(context.Background(), domain.Category{ID: "food", Kind: domain.CategoryExpense, IsDefault: true})
	svc := application.NewBudgetService(repo, categories, testkit.Clock{Time: time.Now()}, &testkit.IDs{})
	_, err := svc.CreateDraft(context.Background(), "u1", application.CreateBudgetInput{StartDate: time.Now(), EndDate: time.Now().AddDate(0, 1, 0), ExpectedIncome: 1000, SavingsCommitment: 300, MinimumBuffer: 200, Allocations: map[string]domain.Money{"food": 600}})
	if !errors.Is(err, domain.ErrBudgetOverallocated) {
		t.Fatalf("expected overallocated, got %v", err)
	}
}

func TestSafeToSpendProtectsBillsSavingsAndBuffer(t *testing.T) {
	accounts := testkit.NewAccounts()
	_, _ = accounts.Create(context.Background(), domain.FinancialAccount{ID: "a", UserID: "u", InitialBalance: 5000000, Spendable: true})
	bills := &testkit.Bills{Upcoming: 1000000}
	goals := testkit.NewGoals()
	goals.Remaining = 500000
	budgets := testkit.NewBudgets()
	svc := application.NewPlanningService(accounts, budgets, bills, goals, testkit.Clock{Time: time.Date(2026, 7, 24, 12, 0, 0, 0, time.FixedZone("WIB", 7*3600))})
	got, err := svc.SafeToSpend(context.Background(), domain.User{ID: "u", Payday: 25, MinimumBuffer: 250000}, time.Time{})
	if err != nil {
		t.Fatal(err)
	}
	if got.UntilPayday != 3250000 {
		t.Fatalf("expected 3250000, got %d", got.UntilPayday)
	}
	if got.DaysRemaining != 2 {
		t.Fatalf("expected 2 days including today, got %d", got.DaysRemaining)
	}
}

func TestRecommendationIsDeterministicAndConservesMoney(t *testing.T) {
	svc := application.NewRecommendationService()
	in := domain.RecommendationInput{ExpectedIncome: 10000000, FixedBills: 3000000, DebtPayments: 1000000, MinimumBuffer: 500000, Mode: domain.RecommendationBalanced}
	a, err := svc.Generate(in)
	if err != nil {
		t.Fatal(err)
	}
	b, err := svc.Generate(in)
	if err != nil {
		t.Fatal(err)
	}
	if a.SavingsCommitment != b.SavingsCommitment {
		t.Fatal("non-deterministic savings")
	}
	total := a.SavingsCommitment + a.MinimumBuffer + in.FixedBills + in.DebtPayments + a.Unallocated
	for _, v := range a.Allocations {
		total += v
	}
	if total != in.ExpectedIncome {
		t.Fatalf("money not conserved: %d != %d", total, in.ExpectedIncome)
	}
}

func TestRecommendationAllocatesRemainderWhenLastSortedCategoryIsLocked(t *testing.T) {
	svc := application.NewRecommendationService()
	got, err := svc.Generate(domain.RecommendationInput{
		ExpectedIncome: 1003,
		Mode:           domain.RecommendationFlexible,
		CategoryWeights: map[string]int{
			"food":      1,
			"transport": 1,
			"z_locked":  1,
		},
		LockedAllocations: map[string]domain.Money{"z_locked": 100},
	})
	if err != nil {
		t.Fatal(err)
	}
	if got.Unallocated != 0 {
		t.Fatalf("expected no rounding remainder, got %d", got.Unallocated)
	}
}

func TestSafeToSpendUsesUserTimezone(t *testing.T) {
	accounts := testkit.NewAccounts()
	_, _ = accounts.Create(context.Background(), domain.FinancialAccount{ID: "a", UserID: "u", InitialBalance: 1_000_000, Spendable: true})
	service := application.NewPlanningService(accounts, testkit.NewBudgets(), &testkit.Bills{}, testkit.NewGoals(), testkit.Clock{
		Time: time.Date(2026, 7, 24, 18, 0, 0, 0, time.UTC), // 25 July 01:00 WIB
	})
	got, err := service.SafeToSpend(context.Background(), domain.User{ID: "u", Payday: 25, Timezone: "Asia/Jakarta"}, time.Time{})
	if err != nil {
		t.Fatal(err)
	}
	// On payday day, the next protected horizon is the following month's payday.
	if got.DaysRemaining < 30 {
		t.Fatalf("expected next month's payday horizon in WIB, got %d days", got.DaysRemaining)
	}
}

func TestBudgetActivationRevalidatesArchivedCategory(t *testing.T) {
	repo := testkit.NewBudgets()
	categories := testkit.NewCategories()
	_, _ = categories.Create(context.Background(), domain.Category{ID: "food", UserID: "u1", Kind: domain.CategoryExpense})
	now := time.Date(2026, 7, 24, 0, 0, 0, 0, time.UTC)
	svc := application.NewBudgetService(repo, categories, testkit.Clock{Time: now}, &testkit.IDs{})

	budget, err := svc.CreateDraft(context.Background(), "u1", application.CreateBudgetInput{
		StartDate:      now,
		EndDate:        now.AddDate(0, 1, 0),
		ExpectedIncome: 1_000_000,
		Allocations:    map[string]domain.Money{"food": 500_000},
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := categories.Archive(context.Background(), "u1", "food", now); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Activate(context.Background(), "u1", budget.ID); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("expected archived category rejection, got %v", err)
	}
}

func TestBudgetRejectsOverflowingAllocationTotal(t *testing.T) {
	repo := testkit.NewBudgets()
	svc := application.NewBudgetService(repo, testkit.NewCategories(), testkit.Clock{Time: time.Now()}, &testkit.IDs{})
	_, err := svc.CreateDraft(context.Background(), "u1", application.CreateBudgetInput{
		StartDate:         time.Now(),
		EndDate:           time.Now().AddDate(0, 1, 0),
		ExpectedIncome:    domain.Money(math.MaxInt64),
		SavingsCommitment: domain.Money(math.MaxInt64),
		MinimumBuffer:     1,
	})
	if !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("expected overflow rejection, got %v", err)
	}
}

func TestRecommendationHandlesMaximumMoneyWithoutOverflow(t *testing.T) {
	svc := application.NewRecommendationService()
	input := domain.RecommendationInput{
		ExpectedIncome: domain.Money(math.MaxInt64),
		Mode:           domain.RecommendationFlexible,
		CategoryWeights: map[string]int{
			"food":      40,
			"transport": 30,
			"household": 30,
		},
	}
	got, err := svc.Generate(input)
	if err != nil {
		t.Fatal(err)
	}
	total := got.SavingsCommitment + got.MinimumBuffer + got.Unallocated
	for _, amount := range got.Allocations {
		total += amount
	}
	if total != input.ExpectedIncome {
		t.Fatalf("money not conserved at max int64: %d != %d", total, input.ExpectedIncome)
	}
}

func TestRecommendationRejectsMandatoryTotalOverflow(t *testing.T) {
	_, err := application.NewRecommendationService().Generate(domain.RecommendationInput{
		ExpectedIncome: domain.Money(math.MaxInt64),
		FixedBills:     domain.Money(math.MaxInt64),
		DebtPayments:   1,
	})
	if !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}
