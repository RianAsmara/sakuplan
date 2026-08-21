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

func TestMarkBillPaidIsIdempotent(t *testing.T) {
	accounts := testkit.NewAccounts()
	_, _ = accounts.Create(context.Background(), domain.FinancialAccount{ID: "a1", UserID: "u1", InitialBalance: 1_000_000, Spendable: true})
	bills := &testkit.Bills{Items: []domain.RecurringBill{
		{ID: "b1", UserID: "u1", Name: "Iuran RT", Amount: 150_000, DueDay: 5, Frequency: domain.BillMonthly, CategoryID: "c1", AccountID: "a1", Active: true},
	}}
	txs := testkit.NewTransactions(accounts)
	svc := application.NewBillService(bills, accounts, testkit.NewCategories(), txs, testkit.UOW{}, testkit.Clock{Time: time.Date(2026, 8, 5, 0, 0, 0, 0, time.UTC)}, &testkit.IDs{})

	dueDate := time.Date(2026, 8, 5, 0, 0, 0, 0, time.UTC)
	input := application.MarkBillPaidInput{BillID: "b1", DueDate: dueDate, IdempotencyKey: "bill-pay-key"}
	first, err := svc.MarkPaid(context.Background(), "u1", input)
	if err != nil {
		t.Fatal(err)
	}
	second, err := svc.MarkPaid(context.Background(), "u1", input)
	if err != nil {
		t.Fatal(err)
	}
	if first.ID != second.ID {
		t.Fatal("retry must return original occurrence")
	}
	balance, _ := accounts.Balance(context.Background(), "u1", "a1")
	if balance != 850_000 {
		t.Fatalf("retry changed balance: %d", balance)
	}

	input.DueDate = time.Date(2026, 9, 5, 0, 0, 0, 0, time.UTC)
	if _, err := svc.MarkPaid(context.Background(), "u1", input); !errors.Is(err, domain.ErrIdempotencyConflict) {
		t.Fatalf("expected idempotency conflict, got %v", err)
	}
}

func TestMarkBillPaidRejectsDuplicatePeriodUnderNewKey(t *testing.T) {
	accounts := testkit.NewAccounts()
	_, _ = accounts.Create(context.Background(), domain.FinancialAccount{ID: "a1", UserID: "u1", InitialBalance: 1_000_000, Spendable: true})
	bills := &testkit.Bills{Items: []domain.RecurringBill{
		{ID: "b1", UserID: "u1", Name: "Iuran RT", Amount: 150_000, DueDay: 5, Frequency: domain.BillMonthly, CategoryID: "c1", AccountID: "a1", Active: true},
	}}
	txs := testkit.NewTransactions(accounts)
	svc := application.NewBillService(bills, accounts, testkit.NewCategories(), txs, testkit.UOW{}, testkit.Clock{Time: time.Date(2026, 8, 5, 0, 0, 0, 0, time.UTC)}, &testkit.IDs{})

	dueDate := time.Date(2026, 8, 5, 0, 0, 0, 0, time.UTC)
	if _, err := svc.MarkPaid(context.Background(), "u1", application.MarkBillPaidInput{BillID: "b1", DueDate: dueDate, IdempotencyKey: "pay-key-1"}); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.MarkPaid(context.Background(), "u1", application.MarkBillPaidInput{BillID: "b1", DueDate: dueDate, IdempotencyKey: "pay-key-2"}); !errors.Is(err, domain.ErrConflict) {
		t.Fatalf("expected conflict paying the same period twice under a different key, got %v", err)
	}
}
