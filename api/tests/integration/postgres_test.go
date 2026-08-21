//go:build integration

package integration_test

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/sakuplan/api/internal/adapters/postgres"
	"github.com/sakuplan/api/internal/adapters/system"
	"github.com/sakuplan/api/internal/application"
	"github.com/sakuplan/api/internal/domain"
	"github.com/testcontainers/testcontainers-go"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
)

type fixedClock struct{ now time.Time }

func (c fixedClock) Now() time.Time { return c.now }

func startPostgres(t *testing.T) (*postgres.Store, func()) {
	t.Helper()
	ctx := context.Background()
	migrationsDir := filepath.Join("..", "..", "db", "migrations")
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		t.Fatal(err)
	}
	names := make([]string, 0, len(entries))
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			names = append(names, e.Name())
		}
	}
	sort.Strings(names)
	var upSQL strings.Builder
	for _, name := range names {
		migration, err := os.ReadFile(filepath.Join(migrationsDir, name))
		if err != nil {
			t.Fatal(err)
		}
		section := strings.Split(string(migration), "-- +goose Down")[0]
		section = strings.Replace(section, "-- +goose Up", "", 1)
		upSQL.WriteString(section)
		upSQL.WriteString("\n")
	}
	initScript := filepath.Join(t.TempDir(), "001_core.sql")
	if err := os.WriteFile(initScript, []byte(upSQL.String()), 0o600); err != nil {
		t.Fatal(err)
	}

	ctr, err := tcpostgres.Run(ctx,
		"postgres:17.10-alpine3.24",
		tcpostgres.WithDatabase("sakuplan_test"),
		tcpostgres.WithUsername("sakuplan"),
		tcpostgres.WithPassword("sakuplan"),
		tcpostgres.WithInitScripts(initScript),
		tcpostgres.BasicWaitStrategies(),
	)
	if err != nil {
		t.Fatalf("start postgres container: %v", err)
	}
	connectionString, err := ctr.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		_ = testcontainers.TerminateContainer(ctr)
		t.Fatal(err)
	}
	pool, err := postgres.NewPool(ctx, connectionString, 5)
	if err != nil {
		_ = testcontainers.TerminateContainer(ctr)
		t.Fatal(err)
	}
	cleanup := func() {
		pool.Close()
		if err := testcontainers.TerminateContainer(ctr); err != nil {
			t.Logf("terminate postgres container: %v", err)
		}
	}
	return postgres.NewStore(pool), cleanup
}

func createUser(t *testing.T, repo domain.UserRepository, ids system.IDGenerator, now time.Time) domain.User {
	t.Helper()
	user, err := repo.Create(context.Background(), domain.User{
		ID:                     ids.New(),
		Email:                  "integration@example.com",
		DisplayName:            "Integration User",
		PasswordHash:           "not-used-in-this-test",
		Status:                 domain.UserStatusActive,
		Role:                   domain.RoleUser,
		Currency:               "IDR",
		Timezone:               "Asia/Jakarta",
		Payday:                 25,
		AcceptedTermsVersion:   "2026-08-02",
		AcceptedPrivacyVersion: "2026-08-02",
		CreatedAt:              now,
		UpdatedAt:              now,
	})
	if err != nil {
		t.Fatal(err)
	}
	return user
}

func TestPostgresLedgerAndBudgetConstraints(t *testing.T) {
	store, cleanup := startPostgres(t)
	defer cleanup()

	ctx := context.Background()
	now := time.Date(2026, 7, 24, 10, 0, 0, 0, time.UTC)
	clock := fixedClock{now: now}
	ids := system.NewIDGenerator()
	users := postgres.NewUserRepo(store)
	accounts := postgres.NewAccountRepo(store)
	categories := postgres.NewCategoryRepo(store)
	transactions := postgres.NewTransactionRepo(store)
	budgets := postgres.NewBudgetRepo(store)

	user := createUser(t, users, ids, now)
	accountService := application.NewAccountService(accounts, clock, ids)
	transactionService := application.NewTransactionService(transactions, accounts, categories, store, clock, ids)
	budgetService := application.NewBudgetService(budgets, categories, clock, ids)

	cash, err := accountService.Create(ctx, user.ID, application.CreateAccountInput{
		Name:           "Cash",
		Type:           domain.AccountCash,
		Currency:       "IDR",
		InitialBalance: 1_000_000,
		Spendable:      true,
	})
	if err != nil {
		t.Fatal(err)
	}
	bank, err := accountService.Create(ctx, user.ID, application.CreateAccountInput{
		Name:           "Bank",
		Type:           domain.AccountBank,
		Currency:       "IDR",
		InitialBalance: 2_000_000,
		Spendable:      true,
	})
	if err != nil {
		t.Fatal(err)
	}

	input := application.CreateTransactionInput{
		AccountID:      bank.ID,
		DestinationID:  cash.ID,
		Amount:         250_000,
		OccurredAt:     now,
		Type:           domain.TransactionTransfer,
		IdempotencyKey: "transfer-20260724-001",
	}
	first, err := transactionService.Create(ctx, user.ID, input)
	if err != nil {
		t.Fatal(err)
	}
	second, err := transactionService.Create(ctx, user.ID, input)
	if err != nil {
		t.Fatal(err)
	}
	if first.ID != second.ID {
		t.Fatalf("idempotent retry created a second transaction: %s != %s", first.ID, second.ID)
	}
	input.Amount = 300_000
	if _, err := transactionService.Create(ctx, user.ID, input); !errors.Is(err, domain.ErrIdempotencyConflict) {
		t.Fatalf("expected idempotency conflict, got %v", err)
	}

	bankBalance, err := accounts.Balance(ctx, user.ID, bank.ID)
	if err != nil {
		t.Fatal(err)
	}
	cashBalance, err := accounts.Balance(ctx, user.ID, cash.ID)
	if err != nil {
		t.Fatal(err)
	}
	if bankBalance != 1_750_000 || cashBalance != 1_250_000 {
		t.Fatalf("unexpected balances: bank=%d cash=%d", bankBalance, cashBalance)
	}

	firstBudget, err := budgetService.CreateDraft(ctx, user.ID, application.CreateBudgetInput{
		StartDate:      time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC),
		EndDate:        time.Date(2026, 7, 31, 0, 0, 0, 0, time.UTC),
		ExpectedIncome: 10_000_000,
		Source:         domain.BudgetManual,
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := budgetService.Activate(ctx, user.ID, firstBudget.ID); err != nil {
		t.Fatal(err)
	}
	secondBudget, err := budgetService.CreateDraft(ctx, user.ID, application.CreateBudgetInput{
		StartDate:      time.Date(2026, 7, 15, 0, 0, 0, 0, time.UTC),
		EndDate:        time.Date(2026, 8, 14, 0, 0, 0, 0, time.UTC),
		ExpectedIncome: 10_000_000,
		Source:         domain.BudgetManual,
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := budgetService.Activate(ctx, user.ID, secondBudget.ID); !errors.Is(err, domain.ErrConflict) {
		t.Fatalf("expected overlapping active budget conflict, got %v", err)
	}
}

func TestPostgresReportingQueries(t *testing.T) {
	store, cleanup := startPostgres(t)
	defer cleanup()

	ctx := context.Background()
	now := time.Date(2026, 7, 24, 10, 0, 0, 0, time.UTC)
	clock := fixedClock{now: now}
	ids := system.NewIDGenerator()
	users := postgres.NewUserRepo(store)
	accounts := postgres.NewAccountRepo(store)
	categories := postgres.NewCategoryRepo(store)
	transactions := postgres.NewTransactionRepo(store)
	budgets := postgres.NewBudgetRepo(store)
	bills := postgres.NewBillRepo(store)

	user := createUser(t, users, ids, now)
	accountService := application.NewAccountService(accounts, clock, ids)
	transactionService := application.NewTransactionService(transactions, accounts, categories, store, clock, ids)
	budgetService := application.NewBudgetService(budgets, categories, clock, ids)

	cash, err := accountService.Create(ctx, user.ID, application.CreateAccountInput{
		Name: "Cash", Type: domain.AccountCash, Currency: "IDR", InitialBalance: 5_000_000, Spendable: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	salary, err := categories.Create(ctx, domain.Category{ID: ids.New(), UserID: user.ID, Name: "Salary", Kind: domain.CategoryIncome})
	if err != nil {
		t.Fatal(err)
	}
	food, err := categories.Create(ctx, domain.Category{ID: ids.New(), UserID: user.ID, Name: "Food", Kind: domain.CategoryExpense})
	if err != nil {
		t.Fatal(err)
	}

	// ListBudgets: non-overlapping drafts ordered by start_date desc.
	julyBudget, err := budgetService.CreateDraft(ctx, user.ID, application.CreateBudgetInput{
		StartDate: time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC), EndDate: time.Date(2026, 7, 31, 0, 0, 0, 0, time.UTC),
		ExpectedIncome: 1_000_000, Source: domain.BudgetManual,
	})
	if err != nil {
		t.Fatal(err)
	}
	augBudget, err := budgetService.CreateDraft(ctx, user.ID, application.CreateBudgetInput{
		StartDate: time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC), EndDate: time.Date(2026, 8, 31, 0, 0, 0, 0, time.UTC),
		ExpectedIncome: 1_000_000, Source: domain.BudgetManual,
	})
	if err != nil {
		t.Fatal(err)
	}
	all, err := budgets.List(ctx, user.ID)
	if err != nil {
		t.Fatal(err)
	}
	if len(all) != 2 || all[0].ID != augBudget.ID || all[1].ID != julyBudget.ID {
		t.Fatalf("expected [aug, july] ordering by start_date desc, got %+v", all)
	}

	// NextDueBill: earliest active bill wins; inactive bills are excluded even if earlier.
	_, err = bills.Create(ctx, domain.RecurringBill{ID: ids.New(), UserID: user.ID, Name: "Late", Amount: 100_000, DueDay: 28, Frequency: domain.BillMonthly, CategoryID: food.ID, AccountID: cash.ID, Active: true, CreatedAt: now, UpdatedAt: now})
	if err != nil {
		t.Fatal(err)
	}
	early, err := bills.Create(ctx, domain.RecurringBill{ID: ids.New(), UserID: user.ID, Name: "Early", Amount: 50_000, DueDay: 26, Frequency: domain.BillMonthly, CategoryID: food.ID, AccountID: cash.ID, Active: true, CreatedAt: now, UpdatedAt: now})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := bills.Create(ctx, domain.RecurringBill{ID: ids.New(), UserID: user.ID, Name: "Earliest-but-inactive", Amount: 10_000, DueDay: 25, Frequency: domain.BillMonthly, CategoryID: food.ID, AccountID: cash.ID, Active: false, CreatedAt: now, UpdatedAt: now}); err != nil {
		t.Fatal(err)
	}
	bill, due, err := bills.NextDue(ctx, user.ID, now, now.AddDate(0, 1, 0))
	if err != nil {
		t.Fatal(err)
	}
	if bill.ID != early.ID {
		t.Fatalf("expected earliest active bill %s, got %s (due %v)", early.ID, bill.ID, due)
	}
	if _, _, err := bills.NextDue(ctx, user.ID, now.AddDate(-1, 0, 0), now.AddDate(-1, 0, 1)); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("expected ErrNotFound for a window with no due bills, got %v", err)
	}

	// CashFlowTotals / CashFlowTrend, including reversed-transaction exclusion and
	// week-bucket alignment: 2026-07-06 is a Monday, matching Postgres's
	// date_trunc('week', ...) and the Go-side Monday-aligned bucket helper.
	weekStart := time.Date(2026, 7, 6, 0, 0, 0, 0, time.UTC)
	if _, err := transactionService.Create(ctx, user.ID, application.CreateTransactionInput{
		AccountID: cash.ID, CategoryID: salary.ID, Amount: 3_000_000, OccurredAt: weekStart, Type: domain.TransactionIncome, IdempotencyKey: "cf-income-1",
	}); err != nil {
		t.Fatal(err)
	}
	if _, err := transactionService.Create(ctx, user.ID, application.CreateTransactionInput{
		AccountID: cash.ID, CategoryID: food.ID, Amount: 200_000, OccurredAt: weekStart.AddDate(0, 0, 1), Type: domain.TransactionExpense, IdempotencyKey: "cf-expense-1",
	}); err != nil {
		t.Fatal(err)
	}
	toReverse, err := transactionService.Create(ctx, user.ID, application.CreateTransactionInput{
		AccountID: cash.ID, CategoryID: food.ID, Amount: 999_999, OccurredAt: weekStart.AddDate(0, 0, 2), Type: domain.TransactionExpense, IdempotencyKey: "cf-expense-reversed",
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := transactionService.Reverse(ctx, user.ID, toReverse.ID, application.ReverseTransactionInput{Reason: "test reversal", IdempotencyKey: "cf-reverse-1"}); err != nil {
		t.Fatal(err)
	}

	rangeStart := weekStart
	rangeEnd := weekStart.AddDate(0, 0, 14)
	income, expenses, err := transactions.CashFlowTotals(ctx, user.ID, rangeStart, rangeEnd)
	if err != nil {
		t.Fatal(err)
	}
	if income != 3_000_000 {
		t.Fatalf("expected income 3000000, got %d", income)
	}
	if expenses != 200_000 {
		t.Fatalf("expected expenses 200000 with the reversed transaction excluded, got %d", expenses)
	}

	trend, err := transactions.CashFlowTrend(ctx, user.ID, rangeStart, rangeEnd, "week")
	if err != nil {
		t.Fatal(err)
	}
	if len(trend) != 1 {
		t.Fatalf("expected a single week bucket, got %d: %+v", len(trend), trend)
	}
	if !trend[0].BucketStart.Equal(weekStart) {
		t.Fatalf("expected Postgres date_trunc('week',...) to align to the Monday bucket %v, got %v", weekStart, trend[0].BucketStart)
	}
	if trend[0].Income != 3_000_000 || trend[0].Expenses != 200_000 {
		t.Fatalf("unexpected week bucket totals: %+v", trend[0])
	}
}

func TestPostgresMarkBillPaid(t *testing.T) {
	store, cleanup := startPostgres(t)
	defer cleanup()

	ctx := context.Background()
	now := time.Date(2026, 8, 5, 9, 0, 0, 0, time.UTC)
	clock := fixedClock{now: now}
	ids := system.NewIDGenerator()
	users := postgres.NewUserRepo(store)
	accounts := postgres.NewAccountRepo(store)
	categories := postgres.NewCategoryRepo(store)
	transactions := postgres.NewTransactionRepo(store)
	bills := postgres.NewBillRepo(store)

	user := createUser(t, users, ids, now)
	accountService := application.NewAccountService(accounts, clock, ids)
	billService := application.NewBillService(bills, accounts, categories, transactions, store, clock, ids)

	cash, err := accountService.Create(ctx, user.ID, application.CreateAccountInput{
		Name: "Cash", Type: domain.AccountCash, Currency: "IDR", InitialBalance: 1_000_000, Spendable: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	utilities, err := categories.Create(ctx, domain.Category{ID: ids.New(), UserID: user.ID, Name: "Utilities", Kind: domain.CategoryExpense})
	if err != nil {
		t.Fatal(err)
	}
	bill, err := billService.Create(ctx, user.ID, domain.RecurringBill{
		Name: "Iuran RT", Amount: 150_000, DueDay: 5, Frequency: domain.BillMonthly, CategoryID: utilities.ID, AccountID: cash.ID,
	})
	if err != nil {
		t.Fatal(err)
	}

	// Bill is unpaid before any occurrence exists.
	fetched, err := bills.Get(ctx, user.ID, bill.ID)
	if err != nil {
		t.Fatal(err)
	}
	if fetched.LastPaidDueDate != nil {
		t.Fatalf("expected no paid occurrence yet, got %v", fetched.LastPaidDueDate)
	}

	dueDate := time.Date(2026, 8, 5, 0, 0, 0, 0, time.UTC)
	first, err := billService.MarkPaid(ctx, user.ID, application.MarkBillPaidInput{BillID: bill.ID, DueDate: dueDate, IdempotencyKey: "pay-aug-2026"})
	if err != nil {
		t.Fatal(err)
	}
	if first.TransactionID == "" {
		t.Fatal("expected occurrence to link a transaction")
	}

	// Retrying under the same idempotency key returns the original occurrence
	// and does not debit the account a second time.
	second, err := billService.MarkPaid(ctx, user.ID, application.MarkBillPaidInput{BillID: bill.ID, DueDate: dueDate, IdempotencyKey: "pay-aug-2026"})
	if err != nil {
		t.Fatal(err)
	}
	if second.ID != first.ID {
		t.Fatalf("expected retry to return the same occurrence, got %s vs %s", second.ID, first.ID)
	}
	balance, err := accounts.Balance(ctx, user.ID, cash.ID)
	if err != nil {
		t.Fatal(err)
	}
	if balance != 850_000 {
		t.Fatalf("expected balance debited exactly once to 850000, got %d", balance)
	}

	// Paying the same period again under a *different* idempotency key hits
	// the UNIQUE(bill_id, due_date) constraint, mapped to ErrConflict.
	if _, err := billService.MarkPaid(ctx, user.ID, application.MarkBillPaidInput{BillID: bill.ID, DueDate: dueDate, IdempotencyKey: "pay-aug-2026-again"}); !errors.Is(err, domain.ErrConflict) {
		t.Fatalf("expected ErrConflict paying the same period twice, got %v", err)
	}

	// Get/List now report the period as paid.
	afterPaid, err := bills.Get(ctx, user.ID, bill.ID)
	if err != nil {
		t.Fatal(err)
	}
	if afterPaid.LastPaidDueDate == nil || !afterPaid.LastPaidDueDate.Equal(dueDate) {
		t.Fatalf("expected LastPaidDueDate %v, got %v", dueDate, afterPaid.LastPaidDueDate)
	}
	list, err := bills.List(ctx, user.ID, true)
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 || list[0].LastPaidDueDate == nil || !list[0].LastPaidDueDate.Equal(dueDate) {
		t.Fatalf("expected ListBills to report the paid period, got %+v", list)
	}
}
