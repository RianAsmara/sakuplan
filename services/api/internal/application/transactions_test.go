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

func transactionFixture() (*application.TransactionService, *testkit.Accounts, *testkit.Transactions) {
	accounts := testkit.NewAccounts()
	cats := testkit.NewCategories()
	ids := &testkit.IDs{}
	clock := testkit.Clock{Time: time.Date(2026, 7, 24, 0, 0, 0, 0, time.UTC)}
	_, _ = accounts.Create(context.Background(), domain.FinancialAccount{ID: "a1", UserID: "u1", Currency: "IDR", InitialBalance: 1000000, Spendable: true})
	_, _ = accounts.Create(context.Background(), domain.FinancialAccount{ID: "a2", UserID: "u1", Currency: "IDR", InitialBalance: 0, Spendable: true})
	_, _ = cats.Create(context.Background(), domain.Category{ID: "expense-food", Kind: domain.CategoryExpense, IsDefault: true})
	_, _ = cats.Create(context.Background(), domain.Category{ID: "income-salary", Kind: domain.CategoryIncome, IsDefault: true})
	txs := testkit.NewTransactions(accounts)
	return application.NewTransactionService(txs, accounts, cats, testkit.UOW{}, clock, ids), accounts, txs
}

func TestCreateExpenseDebitsAccount(t *testing.T) {
	svc, accounts, _ := transactionFixture()
	_, err := svc.Create(context.Background(), "u1", application.CreateTransactionInput{Type: domain.TransactionExpense, AccountID: "a1", CategoryID: "expense-food", Amount: 100000, IdempotencyKey: "expense-1"})
	if err != nil {
		t.Fatal(err)
	}
	balance, _ := accounts.Balance(context.Background(), "u1", "a1")
	if balance != 900000 {
		t.Fatalf("expected 900000, got %d", balance)
	}
}

func TestTransferIsBalanced(t *testing.T) {
	svc, accounts, _ := transactionFixture()
	tx, err := svc.Create(context.Background(), "u1", application.CreateTransactionInput{Type: domain.TransactionTransfer, AccountID: "a1", DestinationID: "a2", Amount: 250000, IdempotencyKey: "transfer-1"})
	if err != nil {
		t.Fatal(err)
	}
	if len(tx.Entries) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(tx.Entries))
	}
	b1, _ := accounts.Balance(context.Background(), "u1", "a1")
	b2, _ := accounts.Balance(context.Background(), "u1", "a2")
	if b1 != 750000 || b2 != 250000 {
		t.Fatalf("unexpected balances %d %d", b1, b2)
	}
}

func TestIdempotencyReturnsOriginalAndRejectsPayloadChange(t *testing.T) {
	svc, accounts, _ := transactionFixture()
	in := application.CreateTransactionInput{Type: domain.TransactionExpense, AccountID: "a1", CategoryID: "expense-food", Amount: 100000, IdempotencyKey: "same-key"}
	first, err := svc.Create(context.Background(), "u1", in)
	if err != nil {
		t.Fatal(err)
	}
	second, err := svc.Create(context.Background(), "u1", in)
	if err != nil {
		t.Fatal(err)
	}
	if first.ID != second.ID {
		t.Fatal("expected original transaction")
	}
	in.Amount = 200000
	_, err = svc.Create(context.Background(), "u1", in)
	if !errors.Is(err, domain.ErrIdempotencyConflict) {
		t.Fatalf("expected idempotency conflict, got %v", err)
	}
	balance, _ := accounts.Balance(context.Background(), "u1", "a1")
	if balance != 900000 {
		t.Fatalf("duplicate changed balance: %d", balance)
	}
}

func TestReverseTransactionRestoresBalanceAndIsIdempotent(t *testing.T) {
	svc, accounts, txs := transactionFixture()
	original, err := svc.Create(context.Background(), "u1", application.CreateTransactionInput{
		Type:           domain.TransactionExpense,
		AccountID:      "a1",
		CategoryID:     "expense-food",
		Amount:         100000,
		IdempotencyKey: "expense-to-reverse",
	})
	if err != nil {
		t.Fatal(err)
	}
	reversal, err := svc.Reverse(context.Background(), "u1", original.ID, application.ReverseTransactionInput{
		Reason:         "duplicate expense",
		IdempotencyKey: "reverse-1",
	})
	if err != nil {
		t.Fatal(err)
	}
	if reversal.Type != domain.TransactionReversal || reversal.ReversesID != original.ID {
		t.Fatalf("unexpected reversal: %+v", reversal)
	}
	balance, _ := accounts.Balance(context.Background(), "u1", "a1")
	if balance != 1000000 {
		t.Fatalf("expected restored balance, got %d", balance)
	}
	stored, err := txs.Get(context.Background(), "u1", original.ID)
	if err != nil {
		t.Fatal(err)
	}
	if stored.ReversedByID != reversal.ID {
		t.Fatalf("original not linked to reversal: %+v", stored)
	}

	retry, err := svc.Reverse(context.Background(), "u1", original.ID, application.ReverseTransactionInput{
		Reason:         "duplicate expense",
		IdempotencyKey: "reverse-1",
	})
	if err != nil {
		t.Fatal(err)
	}
	if retry.ID != reversal.ID {
		t.Fatal("expected idempotent reversal retry")
	}
}

func TestReverseTransactionRejectsSecondReversal(t *testing.T) {
	svc, _, _ := transactionFixture()
	original, err := svc.Create(context.Background(), "u1", application.CreateTransactionInput{
		Type:           domain.TransactionExpense,
		AccountID:      "a1",
		CategoryID:     "expense-food",
		Amount:         100000,
		IdempotencyKey: "expense-2",
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Reverse(context.Background(), "u1", original.ID, application.ReverseTransactionInput{Reason: "mistake", IdempotencyKey: "reverse-a"}); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Reverse(context.Background(), "u1", original.ID, application.ReverseTransactionInput{Reason: "again", IdempotencyKey: "reverse-b"}); !errors.Is(err, domain.ErrConflict) {
		t.Fatalf("expected conflict, got %v", err)
	}
}

func TestTransactionRejectsShortIdempotencyKey(t *testing.T) {
	accounts := testkit.NewAccounts()
	_, _ = accounts.Create(context.Background(), domain.FinancialAccount{ID: "a1", UserID: "u1", Currency: "IDR", Spendable: true})
	categories := testkit.NewCategories()
	_, _ = categories.Create(context.Background(), domain.Category{ID: "expense-food", UserID: "u1", Kind: domain.CategoryExpense})
	svc := application.NewTransactionService(testkit.NewTransactions(accounts), accounts, categories, testkit.UOW{}, testkit.Clock{Time: time.Now()}, &testkit.IDs{})

	_, err := svc.Create(context.Background(), "u1", application.CreateTransactionInput{
		Type:           domain.TransactionExpense,
		AccountID:      "a1",
		CategoryID:     "expense-food",
		Amount:         10_000,
		IdempotencyKey: "short",
	})
	if !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("expected invalid input, got %v", err)
	}
}
