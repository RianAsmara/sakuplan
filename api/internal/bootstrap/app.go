package bootstrap

import (
	"context"
	"log/slog"
	"os"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/sakuplan/api/internal/adapters/httpapi"
	"github.com/sakuplan/api/internal/adapters/postgres"
	"github.com/sakuplan/api/internal/adapters/security"
	"github.com/sakuplan/api/internal/adapters/system"
	"github.com/sakuplan/api/internal/application"
	"github.com/sakuplan/api/internal/config"
	"github.com/sakuplan/api/internal/domain"
	"github.com/sakuplan/api/internal/ports"
	"go.uber.org/fx"
)

// coreProviders wires everything shared by every entry point (the HTTP
// server and the seed CLI): config, database, repositories, and
// application services. Entry-point-specific wiring (the HTTP server
// itself, or a seed invocation) is added on top by New() / NewSeed().
func coreProviders() fx.Option {
	return fx.Provide(
		config.Load,
		newLogger,
		newPool,
		postgres.NewStore,
		fx.Annotate(postgres.NewHealthChecker, fx.As(new(ports.HealthChecker))),
		fx.Annotate(system.NewClock, fx.As(new(ports.Clock))),
		fx.Annotate(system.NewIDGenerator, fx.As(new(ports.IDGenerator))),
		newPasswordHasher,
		newJWTManager,
		fx.Annotate(security.NewRefreshManager, fx.As(new(ports.RefreshTokenManager))),
		newUnitOfWork,
		fx.Annotate(postgres.NewUserRepo, fx.As(new(domain.UserRepository))),
		fx.Annotate(postgres.NewSessionRepo, fx.As(new(domain.SessionRepository))),
		fx.Annotate(postgres.NewAccountRepo, fx.As(new(domain.AccountRepository))),
		fx.Annotate(postgres.NewCategoryRepo, fx.As(new(domain.CategoryRepository))),
		fx.Annotate(postgres.NewTransactionRepo, fx.As(new(domain.TransactionRepository))),
		fx.Annotate(postgres.NewBudgetRepo, fx.As(new(domain.BudgetRepository))),
		fx.Annotate(postgres.NewBillRepo, fx.As(new(domain.BillRepository))),
		fx.Annotate(postgres.NewGoalRepo, fx.As(new(domain.GoalRepository))),
		fx.Annotate(postgres.NewAuditRepo, fx.As(new(domain.AuditRepository))),
		newAuthService,
		application.NewUserService,
		application.NewAccountService,
		application.NewCategoryService,
		application.NewTransactionService,
		application.NewBudgetService,
		application.NewBillService,
		application.NewGoalService,
		application.NewPlanningService,
		application.NewRecommendationService,
		application.NewReportingService,
	)
}

func New() *fx.App {
	return fx.New(
		coreProviders(),
		fx.Provide(newHTTPServices, httpapi.NewServer),
		fx.Invoke(runHTTPServer),
	)
}

func newLogger(cfg config.Config) *slog.Logger {
	level := slog.LevelInfo
	if cfg.Environment == "development" {
		return slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: level}))
	}
	return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level}))
}

func newPool(lc fx.Lifecycle, cfg config.Config) (*pgxpool.Pool, error) {
	pool, err := postgres.NewPool(context.Background(), cfg.DatabaseURL, cfg.DBMaxConns)
	if err != nil {
		return nil, err
	}
	lc.Append(fx.Hook{OnStop: func(context.Context) error { pool.Close(); return nil }})
	return pool, nil
}

func newPasswordHasher() ports.PasswordHasher {
	return security.NewArgon2Hasher(security.DefaultArgon2Config())
}

func newUnitOfWork(store *postgres.Store) ports.UnitOfWork { return store }

func newJWTManager(cfg config.Config) (ports.AccessTokenManager, error) {
	return security.NewJWTManager(security.JWTConfig{Secret: cfg.JWTSecret, Issuer: cfg.JWTIssuer, Audience: cfg.JWTAudience, TTL: cfg.AccessTTL})
}

func newAuthService(users domain.UserRepository, sessions domain.SessionRepository, audits domain.AuditRepository, hasher ports.PasswordHasher, access ports.AccessTokenManager, refresh ports.RefreshTokenManager, uow ports.UnitOfWork, clock ports.Clock, ids ports.IDGenerator, cfg config.Config) *application.AuthService {
	return application.NewAuthService(users, sessions, audits, hasher, access, refresh, uow, clock, ids, cfg.RefreshTTL)
}

func newHTTPServices(auth *application.AuthService, profiles *application.UserService, accounts *application.AccountService, categories *application.CategoryService, transactions *application.TransactionService, budgets *application.BudgetService, bills *application.BillService, goals *application.GoalService, planning *application.PlanningService, recommendations *application.RecommendationService, reporting *application.ReportingService) httpapi.Services {
	return httpapi.Services{Auth: auth, Profiles: profiles, Accounts: accounts, Categories: categories, Transactions: transactions, Budgets: budgets, Bills: bills, Goals: goals, Planning: planning, Recommendations: recommendations, Reporting: reporting}
}

func runHTTPServer(lc fx.Lifecycle, server *httpapi.Server, cfg config.Config, logger *slog.Logger) {
	lc.Append(fx.Hook{
		OnStart: func(context.Context) error {
			go func() {
				if err := server.App().Listen(cfg.HTTPAddress, fiber.ListenConfig{DisableStartupMessage: true}); err != nil {
					logger.Error("http_server_stopped", "error", err)
				}
			}()
			logger.Info("http_server_started", "address", cfg.HTTPAddress)
			return nil
		},
		OnStop: func(context.Context) error {
			return server.App().ShutdownWithTimeout(cfg.ShutdownTimeout)
		},
	})
}
