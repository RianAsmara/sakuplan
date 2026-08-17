package bootstrap

import (
	"context"
	"log/slog"

	"github.com/sakuplan/api/internal/application"
	"github.com/sakuplan/api/internal/domain"
	"github.com/sakuplan/api/internal/ports"
	"github.com/sakuplan/api/internal/seed"
	"go.uber.org/fx"
	"go.uber.org/fx/fxevent"
)

// NewSeed builds an fx app that shares the same config/database/service
// wiring as the HTTP server (New) but, instead of listening for
// requests, runs the dev-data seed once and exits. See internal/seed
// for what gets created.
func NewSeed() *fx.App {
	return fx.New(
		coreProviders(),
		fx.WithLogger(func(logger *slog.Logger) fxevent.Logger { return fxevent.NopLogger }),
		fx.Invoke(runSeed),
	)
}

// runSeed runs the seed once at startup, then requests shutdown so the
// CLI exits instead of blocking forever waiting for a signal like the
// HTTP server does. A returned error fails fx's own Start() call, which
// already makes App.Run() exit non-zero — no explicit Shutdowner needed
// on that path.
func runSeed(lc fx.Lifecycle, logger *slog.Logger, users domain.UserRepository, auth *application.AuthService, accounts *application.AccountService, transactions *application.TransactionService, budgets *application.BudgetService, bills *application.BillService, goals *application.GoalService, clock ports.Clock, shutdowner fx.Shutdowner) {
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			if err := seed.Run(ctx, logger, seed.Services{
				Users: users, Auth: auth, Accounts: accounts, Transactions: transactions,
				Budgets: budgets, Bills: bills, Goals: goals,
			}, clock); err != nil {
				return err
			}
			return shutdowner.Shutdown()
		},
	})
}
