// Package seed populates a development database with a demo user and a
// realistic spread of accounts, transactions, an active budget, a
// recurring bill, and a saving goal — enough to manually exercise every
// mobile screen without registering and filling everything in by hand.
//
// It is dev/test tooling only, invoked via cmd/seed; it is never wired
// into the HTTP server and has no effect on production business logic.
package seed

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/sakuplan/api/internal/application"
	"github.com/sakuplan/api/internal/domain"
	"github.com/sakuplan/api/internal/ports"
)

// Demo user credentials — printed at the end of the run so they're easy
// to copy into the mobile app's login screen.
const (
	DemoEmail    = "demo@sakuplan.app"
	DemoPassword = "DemoPassword123!"
)

// Fixed default-category IDs from db/migrations/00001_core.sql.
const (
	categoryGaji          = "00000000-0000-4000-8000-000000000001"
	categoryBonus         = "00000000-0000-4000-8000-000000000002"
	categoryMakanan       = "00000000-0000-4000-8000-000000000101"
	categoryTransportasi  = "00000000-0000-4000-8000-000000000102"
	categoryTagihan       = "00000000-0000-4000-8000-000000000103"
	categoryTempatTinggal = "00000000-0000-4000-8000-000000000104"
	categoryKesehatan     = "00000000-0000-4000-8000-000000000105"
	categoryPendidikan    = "00000000-0000-4000-8000-000000000106"
	categoryHiburan       = "00000000-0000-4000-8000-000000000107"
)

type Services struct {
	Users        domain.UserRepository
	Auth         *application.AuthService
	Accounts     *application.AccountService
	Transactions *application.TransactionService
	Budgets      *application.BudgetService
	Bills        *application.BillService
	Goals        *application.GoalService
}

// Run seeds one demo user with realistic data. It is safe to invoke
// against an already-seeded database: if the demo user already exists,
// it logs that fact and returns without creating anything, since a
// partial re-run would otherwise hit unique-name and idempotency-key
// conflicts on the demo user's existing records.
func Run(ctx context.Context, logger *slog.Logger, svc Services, clock ports.Clock) error {
	if _, err := svc.Users.GetByEmail(ctx, domain.NormalizeEmail(DemoEmail)); err == nil {
		logger.Info("seed_skipped_already_exists", "email", DemoEmail)
		return nil
	} else if !errors.Is(err, domain.ErrNotFound) {
		return fmt.Errorf("check existing demo user: %w", err)
	}

	pair, err := svc.Auth.Register(ctx, application.RegisterInput{
		Email:                  DemoEmail,
		Password:               DemoPassword,
		DisplayName:            "Demo User",
		AcceptedTermsVersion:   "v1",
		AcceptedPrivacyVersion: "v1",
	})
	if err != nil {
		return fmt.Errorf("register demo user: %w", err)
	}
	userID := pair.User.ID
	logger.Info("seed_user_created", "email", DemoEmail, "user_id", userID)

	wallet, err := svc.Accounts.Create(ctx, userID, application.CreateAccountInput{
		Name: "Dompet", Type: domain.AccountCash, Currency: "IDR", InitialBalance: 500_000, Spendable: true,
	})
	if err != nil {
		return fmt.Errorf("create account Dompet: %w", err)
	}
	bank, err := svc.Accounts.Create(ctx, userID, application.CreateAccountInput{
		Name: "BCA", Type: domain.AccountBank, Currency: "IDR", InitialBalance: 5_000_000, Spendable: true,
	})
	if err != nil {
		return fmt.Errorf("create account BCA: %w", err)
	}
	ewallet, err := svc.Accounts.Create(ctx, userID, application.CreateAccountInput{
		Name: "GoPay", Type: domain.AccountEWallet, Currency: "IDR", InitialBalance: 250_000, Spendable: true,
	})
	if err != nil {
		return fmt.Errorf("create account GoPay: %w", err)
	}
	logger.Info("seed_accounts_created", "count", 3)

	now := clock.Now()
	daysAgo := func(n int) time.Time { return now.AddDate(0, 0, -n) }

	type txSeed struct {
		accountID, destID, categoryID, note string
		txType                              domain.TransactionType
		amount                              domain.Money
		occurredAt                          time.Time
	}
	transactions := []txSeed{
		{accountID: bank.ID, categoryID: categoryGaji, note: "Gaji bulanan", txType: domain.TransactionIncome, amount: 8_000_000, occurredAt: daysAgo(25)},
		{accountID: bank.ID, categoryID: categoryBonus, note: "Bonus proyek", txType: domain.TransactionIncome, amount: 500_000, occurredAt: daysAgo(20)},
		{accountID: wallet.ID, categoryID: categoryMakanan, note: "Makan siang", txType: domain.TransactionExpense, amount: 45_000, occurredAt: daysAgo(18)},
		{accountID: ewallet.ID, categoryID: categoryMakanan, note: "Belanja mingguan", txType: domain.TransactionExpense, amount: 120_000, occurredAt: daysAgo(15)},
		{accountID: ewallet.ID, categoryID: categoryTransportasi, note: "Ojek online", txType: domain.TransactionExpense, amount: 30_000, occurredAt: daysAgo(14)},
		{accountID: bank.ID, categoryID: categoryTagihan, note: "Listrik dan air", txType: domain.TransactionExpense, amount: 350_000, occurredAt: daysAgo(10)},
		{accountID: bank.ID, categoryID: categoryTempatTinggal, note: "Sewa kos", txType: domain.TransactionExpense, amount: 1_500_000, occurredAt: daysAgo(9)},
		{accountID: ewallet.ID, categoryID: categoryHiburan, note: "Nonton bioskop", txType: domain.TransactionExpense, amount: 150_000, occurredAt: daysAgo(5)},
		{accountID: bank.ID, destID: wallet.ID, note: "Tarik tunai", txType: domain.TransactionTransfer, amount: 1_000_000, occurredAt: daysAgo(3)},
	}
	for i, t := range transactions {
		_, err := svc.Transactions.Create(ctx, userID, application.CreateTransactionInput{
			AccountID:      t.accountID,
			DestinationID:  t.destID,
			CategoryID:     t.categoryID,
			Amount:         t.amount,
			OccurredAt:     t.occurredAt,
			Note:           t.note,
			Type:           t.txType,
			IdempotencyKey: fmt.Sprintf("seed-tx-%02d", i),
		})
		if err != nil {
			return fmt.Errorf("create transaction %q: %w", t.note, err)
		}
	}
	logger.Info("seed_transactions_created", "count", len(transactions))

	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	monthEnd := monthStart.AddDate(0, 1, -1)
	draft, err := svc.Budgets.CreateDraft(ctx, userID, application.CreateBudgetInput{
		StartDate: monthStart, EndDate: monthEnd,
		ExpectedIncome: 8_500_000, SavingsCommitment: 500_000, MinimumBuffer: 1_000_000,
		Source: domain.BudgetManual,
		Allocations: map[string]domain.Money{
			categoryMakanan:       1_500_000,
			categoryTransportasi:  500_000,
			categoryTagihan:       400_000,
			categoryTempatTinggal: 1_500_000,
			categoryKesehatan:     300_000,
			categoryPendidikan:    200_000,
			categoryHiburan:       300_000,
		},
	})
	if err != nil {
		return fmt.Errorf("create budget draft: %w", err)
	}
	if _, err := svc.Budgets.Activate(ctx, userID, draft.ID); err != nil {
		return fmt.Errorf("activate budget: %w", err)
	}
	logger.Info("seed_budget_activated", "period", fmt.Sprintf("%s..%s", monthStart.Format("2006-01-02"), monthEnd.Format("2006-01-02")))

	if _, err := svc.Bills.Create(ctx, userID, domain.RecurringBill{
		Name: "Listrik", Amount: 250_000, DueDay: 5, Frequency: domain.BillMonthly,
		CategoryID: categoryTagihan, AccountID: bank.ID, ReminderDays: 3,
	}); err != nil {
		return fmt.Errorf("create bill: %w", err)
	}
	logger.Info("seed_bill_created", "name", "Listrik")

	goal, err := svc.Goals.Create(ctx, userID, domain.SavingGoal{
		Name: "Dana Darurat", TargetAmount: 10_000_000, MonthlyCommitment: 500_000, Priority: 1,
	})
	if err != nil {
		return fmt.Errorf("create goal: %w", err)
	}
	if _, err := svc.Goals.Contribute(ctx, userID, application.ContributeInput{
		GoalID: goal.ID, AccountID: bank.ID, Amount: 500_000, OccurredAt: daysAgo(2), IdempotencyKey: "seed-goal-contribution-01",
	}); err != nil {
		return fmt.Errorf("contribute to goal: %w", err)
	}
	logger.Info("seed_goal_created", "name", "Dana Darurat")

	logger.Info("seed_complete", "email", DemoEmail, "password", DemoPassword)
	return nil
}
