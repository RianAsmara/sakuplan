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

func TestGoalContributionIsIdempotent(t *testing.T) {
	accounts := testkit.NewAccounts()
	_, _ = accounts.Create(context.Background(), domain.FinancialAccount{ID: "a1", UserID: "u1", InitialBalance: 1_000_000, Spendable: true})
	goals := testkit.NewGoals()
	_, _ = goals.Create(context.Background(), domain.SavingGoal{ID: "g1", UserID: "u1", TargetAmount: 5_000_000, Status: domain.GoalActive})
	txs := testkit.NewTransactions(accounts)
	svc := application.NewGoalService(goals, accounts, txs, testkit.UOW{}, testkit.Clock{Time: time.Date(2026, 7, 24, 0, 0, 0, 0, time.UTC)}, &testkit.IDs{})

	input := application.ContributeInput{GoalID: "g1", AccountID: "a1", Amount: 100_000, IdempotencyKey: "goal-key"}
	first, err := svc.Contribute(context.Background(), "u1", input)
	if err != nil {
		t.Fatal(err)
	}
	second, err := svc.Contribute(context.Background(), "u1", input)
	if err != nil {
		t.Fatal(err)
	}
	if first.ID != second.ID {
		t.Fatal("retry must return original contribution")
	}
	balance, _ := accounts.Balance(context.Background(), "u1", "a1")
	if balance != 900_000 {
		t.Fatalf("retry changed balance: %d", balance)
	}

	input.Amount = 200_000
	if _, err := svc.Contribute(context.Background(), "u1", input); !errors.Is(err, domain.ErrIdempotencyConflict) {
		t.Fatalf("expected idempotency conflict, got %v", err)
	}
}

func TestGoalRejectsNegativePlanningFields(t *testing.T) {
	svc := application.NewGoalService(testkit.NewGoals(), testkit.NewAccounts(), testkit.NewTransactions(nil), testkit.UOW{}, testkit.Clock{Time: time.Now()}, &testkit.IDs{})
	_, err := svc.Create(context.Background(), "u1", domain.SavingGoal{
		Name:              "Emergency fund",
		TargetAmount:      1_000_000,
		MonthlyCommitment: -1,
		Priority:          1,
	})
	if !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}
