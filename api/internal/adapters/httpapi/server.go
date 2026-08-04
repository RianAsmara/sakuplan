package httpapi

import (
	"errors"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/sakuplan/api/internal/application"
	"github.com/sakuplan/api/internal/domain"
	"github.com/sakuplan/api/internal/ports"
)

const (
	localRequestID = "request_id"
	localUserID    = "user_id"
	localRole      = "role"
)

type Services struct {
	Auth            *application.AuthService
	Profiles        *application.UserService
	Accounts        *application.AccountService
	Categories      *application.CategoryService
	Transactions    *application.TransactionService
	Budgets         *application.BudgetService
	Bills           *application.BillService
	Goals           *application.GoalService
	Planning        *application.PlanningService
	Recommendations *application.RecommendationService
	Reporting       *application.ReportingService
}

type Server struct {
	app       *fiber.App
	svc       Services
	access    ports.AccessTokenManager
	ids       ports.IDGenerator
	clock     ports.Clock
	readiness ports.HealthChecker
	logger    *slog.Logger
}

func NewServer(svc Services, access ports.AccessTokenManager, ids ports.IDGenerator, clock ports.Clock, readiness ports.HealthChecker, logger *slog.Logger) *Server {
	if logger == nil {
		logger = slog.Default()
	}
	s := &Server{svc: svc, access: access, ids: ids, clock: clock, readiness: readiness, logger: logger}
	s.app = fiber.New(fiber.Config{
		AppName:      "SakuPlan API",
		ErrorHandler: s.errorHandler,
	})
	s.routes()
	return s
}

func (s *Server) App() *fiber.App { return s.app }

func (s *Server) routes() {
	s.app.Use(recover.New())
	s.app.Use(s.requestContext)

	liveness := func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "time": s.clock.Now()})
	}
	s.app.Get("/healthz", liveness)
	s.app.Get("/livez", liveness)
	s.app.Get("/readyz", func(c fiber.Ctx) error {
		if s.readiness != nil {
			if err := s.readiness.Ping(c); err != nil {
				return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"status": "unavailable", "time": s.clock.Now()})
			}
		}
		return c.JSON(fiber.Map{"status": "ok", "time": s.clock.Now()})
	})

	v1 := s.app.Group("/v1")
	v1.Post("/auth/register", s.register)
	v1.Post("/auth/login", s.login)
	v1.Post("/auth/refresh", s.refresh)
	v1.Post("/auth/logout", s.logout)

	secured := v1.Group("", s.requireAuth)
	secured.Post("/auth/logout-all", s.logoutAll)
	secured.Get("/me", s.me)
	secured.Put("/me", s.updateMe)

	secured.Get("/accounts", s.listAccounts)
	secured.Post("/accounts", s.createAccount)
	secured.Get("/accounts/:id", s.getAccount)
	secured.Get("/accounts/:id/balance", s.getAccountBalance)
	secured.Delete("/accounts/:id", s.archiveAccount)

	secured.Get("/categories", s.listCategories)
	secured.Post("/categories", s.createCategory)
	secured.Delete("/categories/:id", s.archiveCategory)

	secured.Get("/transactions", s.listTransactions)
	secured.Post("/transactions", s.createTransaction)
	secured.Get("/transactions/:id", s.getTransaction)
	secured.Post("/transactions/:id/reverse", s.reverseTransaction)

	secured.Post("/budgets", s.createBudget)
	secured.Post("/budgets/:id/activate", s.activateBudget)
	secured.Get("/budgets/active", s.activeBudget)

	secured.Get("/bills", s.listBills)
	secured.Post("/bills", s.createBill)

	secured.Get("/goals", s.listGoals)
	secured.Post("/goals", s.createGoal)
	secured.Post("/goals/:id/contributions", s.contributeGoal)

	secured.Get("/planning/safe-to-spend", s.safeToSpend)
	secured.Post("/planning/recommendations", s.recommendBudget)

	secured.Get("/dashboard", s.dashboard)
	secured.Get("/reports/cash-flow", s.cashFlowReport)
	secured.Post("/exports", s.createExport)
}

func (s *Server) requestContext(c fiber.Ctx) error {
	requestID := strings.TrimSpace(c.Get("X-Request-ID"))
	if requestID == "" {
		requestID = s.ids.New()
	}
	c.Locals(localRequestID, requestID)
	c.Set("X-Request-ID", requestID)
	started := time.Now()
	err := c.Next()
	if err != nil {
		err = s.errorHandler(c, err)
	}
	s.logger.Info("http_request", "request_id", requestID, "method", c.Method(), "path", c.Path(), "status", c.Response().StatusCode(), "duration_ms", time.Since(started).Milliseconds())
	return err
}

func (s *Server) requireAuth(c fiber.Ctx) error {
	header := strings.TrimSpace(c.Get("Authorization"))
	if !strings.HasPrefix(strings.ToLower(header), "bearer ") {
		return domain.ErrUnauthorized
	}
	claims, err := s.access.Parse(strings.TrimSpace(header[7:]), s.clock.Now())
	if err != nil {
		return domain.ErrUnauthorized
	}
	c.Locals(localUserID, claims.UserID)
	c.Locals(localRole, claims.Role)
	return c.Next()
}

func userID(c fiber.Ctx) string {
	v, _ := c.Locals(localUserID).(string)
	return v
}

func boolQuery(c fiber.Ctx, key string) bool {
	v, err := strconv.ParseBool(c.Query(key, "false"))
	return err == nil && v
}

func dateQuery(c fiber.Ctx, key string) (time.Time, error) {
	raw := strings.TrimSpace(c.Query(key))
	if raw == "" {
		return time.Time{}, nil
	}
	t, err := time.Parse("2006-01-02", raw)
	if err != nil {
		return time.Time{}, domain.ErrInvalidInput
	}
	return t, nil
}

func (s *Server) errorHandler(c fiber.Ctx, err error) error {
	status, code, message := fiber.StatusInternalServerError, "INTERNAL_ERROR", "an unexpected error occurred"
	var validation domain.ValidationError
	var fiberErr *fiber.Error
	switch {
	case errors.As(err, &fiberErr):
		status, code, message = fiberErr.Code, "HTTP_ERROR", fiberErr.Message
	case errors.As(err, &validation):
		status, code, message = fiber.StatusUnprocessableEntity, "VALIDATION_ERROR", validation.Error()
	case errors.Is(err, domain.ErrInvalidInput), errors.Is(err, domain.ErrInvalidAmount), errors.Is(err, domain.ErrSameAccountTransfer):
		status, code, message = fiber.StatusBadRequest, "INVALID_REQUEST", err.Error()
	case errors.Is(err, domain.ErrUnauthorized), errors.Is(err, domain.ErrInvalidCredentials):
		status, code, message = fiber.StatusUnauthorized, "UNAUTHORIZED", "authentication is required"
	case errors.Is(err, domain.ErrForbidden), errors.Is(err, domain.ErrInactiveUser):
		status, code, message = fiber.StatusForbidden, "FORBIDDEN", err.Error()
	case errors.Is(err, domain.ErrNotFound):
		status, code, message = fiber.StatusNotFound, "NOT_FOUND", "resource was not found"
	case errors.Is(err, domain.ErrIdempotencyConflict):
		status, code, message = fiber.StatusConflict, "IDEMPOTENCY_CONFLICT", err.Error()
	case errors.Is(err, domain.ErrConflict), errors.Is(err, domain.ErrBudgetOverallocated):
		status, code, message = fiber.StatusConflict, "CONFLICT", err.Error()
	}
	if status >= 500 {
		s.logger.Error("request_failed", "request_id", c.Locals(localRequestID), "error", err)
	}
	return c.Status(status).JSON(fiber.Map{"error": fiber.Map{"code": code, "message": message, "request_id": c.Locals(localRequestID)}})
}
