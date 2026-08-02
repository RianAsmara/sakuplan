package httpapi

import (
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/sakuplan/api/internal/application"
	"github.com/sakuplan/api/internal/domain"
)

type createBudgetRequest struct {
	StartDate         time.Time               `json:"start_date"`
	EndDate           time.Time               `json:"end_date"`
	ExpectedIncome    domain.Money            `json:"expected_income"`
	SavingsCommitment domain.Money            `json:"savings_commitment"`
	MinimumBuffer     domain.Money            `json:"minimum_buffer"`
	Source            domain.BudgetSource     `json:"source"`
	Allocations       map[string]domain.Money `json:"allocations"`
}

func (s *Server) createBudget(c fiber.Ctx) error {
	var req createBudgetRequest
	if err := c.Bind().Body(&req); err != nil {
		return domain.ErrInvalidInput
	}
	v, err := s.svc.Budgets.CreateDraft(c, userID(c), application.CreateBudgetInput{StartDate: req.StartDate, EndDate: req.EndDate, ExpectedIncome: req.ExpectedIncome, SavingsCommitment: req.SavingsCommitment, MinimumBuffer: req.MinimumBuffer, Source: req.Source, Allocations: req.Allocations})
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(mapBudget(v))
}
func (s *Server) activateBudget(c fiber.Ctx) error {
	v, err := s.svc.Budgets.Activate(c, userID(c), c.Params("id"))
	if err != nil {
		return err
	}
	return c.JSON(mapBudget(v))
}
func (s *Server) activeBudget(c fiber.Ctx) error {
	v, err := s.svc.Budgets.Active(c, userID(c), time.Time{})
	if err != nil {
		return err
	}
	return c.JSON(mapBudget(v))
}

type createBillRequest struct {
	Name         string               `json:"name"`
	Amount       domain.Money         `json:"amount"`
	DueDay       int                  `json:"due_day"`
	Frequency    domain.BillFrequency `json:"frequency"`
	CategoryID   string               `json:"category_id"`
	AccountID    string               `json:"account_id"`
	ReminderDays int                  `json:"reminder_days"`
}

func (s *Server) createBill(c fiber.Ctx) error {
	var req createBillRequest
	if err := c.Bind().Body(&req); err != nil {
		return domain.ErrInvalidInput
	}
	v, err := s.svc.Bills.Create(c, userID(c), domain.RecurringBill{Name: req.Name, Amount: req.Amount, DueDay: req.DueDay, Frequency: req.Frequency, CategoryID: req.CategoryID, AccountID: req.AccountID, ReminderDays: req.ReminderDays})
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(mapBill(v))
}
func (s *Server) listBills(c fiber.Ctx) error {
	items, err := s.svc.Bills.List(c, userID(c), !boolQuery(c, "include_inactive"))
	if err != nil {
		return err
	}
	out := make([]billResponse, 0, len(items))
	for _, item := range items {
		out = append(out, mapBill(item))
	}
	return c.JSON(fiber.Map{"data": out})
}

type createGoalRequest struct {
	Name              string       `json:"name"`
	TargetAmount      domain.Money `json:"target_amount"`
	TargetDate        time.Time    `json:"target_date"`
	MonthlyCommitment domain.Money `json:"monthly_commitment"`
	Priority          int          `json:"priority"`
}

func (s *Server) createGoal(c fiber.Ctx) error {
	var req createGoalRequest
	if err := c.Bind().Body(&req); err != nil {
		return domain.ErrInvalidInput
	}
	v, err := s.svc.Goals.Create(c, userID(c), domain.SavingGoal{Name: req.Name, TargetAmount: req.TargetAmount, TargetDate: req.TargetDate, MonthlyCommitment: req.MonthlyCommitment, Priority: req.Priority})
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(mapGoal(v))
}
func (s *Server) listGoals(c fiber.Ctx) error {
	items, err := s.svc.Goals.List(c, userID(c), !boolQuery(c, "include_inactive"))
	if err != nil {
		return err
	}
	out := make([]goalResponse, 0, len(items))
	for _, item := range items {
		out = append(out, mapGoal(item))
	}
	return c.JSON(fiber.Map{"data": out})
}

type contributeGoalRequest struct {
	AccountID  string       `json:"account_id"`
	Amount     domain.Money `json:"amount"`
	OccurredAt time.Time    `json:"occurred_at"`
}

func (s *Server) contributeGoal(c fiber.Ctx) error {
	var req contributeGoalRequest
	if err := c.Bind().Body(&req); err != nil {
		return domain.ErrInvalidInput
	}
	v, err := s.svc.Goals.Contribute(c, userID(c), application.ContributeInput{GoalID: c.Params("id"), AccountID: req.AccountID, Amount: req.Amount, OccurredAt: req.OccurredAt, IdempotencyKey: c.Get("Idempotency-Key")})
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(mapContribution(v))
}

func (s *Server) safeToSpend(c fiber.Ctx) error {
	u, err := s.svc.Profiles.Get(c, userID(c))
	if err != nil {
		return err
	}
	v, err := s.svc.Planning.SafeToSpend(c, u, time.Time{})
	if err != nil {
		return err
	}
	return c.JSON(mapSafeToSpend(v))
}

type recommendationRequest struct {
	ExpectedIncome    domain.Money              `json:"expected_income"`
	FixedBills        domain.Money              `json:"fixed_bills"`
	DebtPayments      domain.Money              `json:"debt_payments"`
	RequestedSavings  domain.Money              `json:"requested_savings"`
	MinimumBuffer     domain.Money              `json:"minimum_buffer"`
	Dependants        int                       `json:"dependants"`
	Mode              domain.RecommendationMode `json:"mode"`
	CategoryWeights   map[string]int            `json:"category_weights"`
	LockedAllocations map[string]domain.Money   `json:"locked_allocations"`
}

func (s *Server) recommendBudget(c fiber.Ctx) error {
	var req recommendationRequest
	if err := c.Bind().Body(&req); err != nil {
		return domain.ErrInvalidInput
	}
	v, err := s.svc.Recommendations.Generate(domain.RecommendationInput{ExpectedIncome: req.ExpectedIncome, FixedBills: req.FixedBills, DebtPayments: req.DebtPayments, RequestedSavings: req.RequestedSavings, MinimumBuffer: req.MinimumBuffer, Dependants: req.Dependants, Mode: req.Mode, CategoryWeights: req.CategoryWeights, LockedAllocations: req.LockedAllocations})
	if err != nil {
		return err
	}
	return c.JSON(mapRecommendation(v))
}
