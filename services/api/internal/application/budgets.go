package application

import (
	"context"
	"time"

	"github.com/sakuplan/api/internal/domain"
	"github.com/sakuplan/api/internal/ports"
)

type BudgetService struct {
	repo       domain.BudgetRepository
	categories domain.CategoryRepository
	clock      ports.Clock
	ids        ports.IDGenerator
}

func NewBudgetService(repo domain.BudgetRepository, categories domain.CategoryRepository, clock ports.Clock, ids ports.IDGenerator) *BudgetService {
	return &BudgetService{repo: repo, categories: categories, clock: clock, ids: ids}
}

type CreateBudgetInput struct {
	StartDate, EndDate                               time.Time
	ExpectedIncome, SavingsCommitment, MinimumBuffer domain.Money
	Source                                           domain.BudgetSource
	Allocations                                      map[string]domain.Money
}

func (s *BudgetService) CreateDraft(ctx context.Context, userID string, in CreateBudgetInput) (domain.BudgetPeriod, error) {
	if err := domain.ValidateDateRange(in.StartDate, in.EndDate); err != nil {
		return domain.BudgetPeriod{}, err
	}
	if in.ExpectedIncome < 0 || in.SavingsCommitment < 0 || in.MinimumBuffer < 0 {
		return domain.BudgetPeriod{}, domain.ErrInvalidInput
	}
	if in.Source == "" {
		in.Source = domain.BudgetManual
	}
	now := s.clock.Now()
	b := domain.BudgetPeriod{ID: s.ids.New(), UserID: userID, StartDate: in.StartDate, EndDate: in.EndDate, ExpectedIncome: in.ExpectedIncome, SavingsCommitment: in.SavingsCommitment, MinimumBuffer: in.MinimumBuffer, Status: domain.BudgetDraft, Source: in.Source, CreatedAt: now, UpdatedAt: now}
	for categoryID, amount := range in.Allocations {
		if amount < 0 || categoryID == "" {
			return domain.BudgetPeriod{}, domain.ErrInvalidInput
		}
		category, err := s.categories.Get(ctx, userID, categoryID)
		if err != nil {
			return domain.BudgetPeriod{}, err
		}
		if category.Kind != domain.CategoryExpense || category.ArchivedAt != nil {
			return domain.BudgetPeriod{}, domain.ErrInvalidInput
		}
		b.Allocations = append(b.Allocations, domain.BudgetAllocation{ID: s.ids.New(), BudgetPeriodID: b.ID, CategoryID: categoryID, Amount: amount})
	}
	if err := validateBudget(b); err != nil {
		return domain.BudgetPeriod{}, err
	}
	return s.repo.Create(ctx, b)
}

func (s *BudgetService) Activate(ctx context.Context, userID, budgetID string) (domain.BudgetPeriod, error) {
	b, err := s.repo.Get(ctx, userID, budgetID)
	if err != nil {
		return domain.BudgetPeriod{}, err
	}
	for _, allocation := range b.Allocations {
		category, categoryErr := s.categories.Get(ctx, userID, allocation.CategoryID)
		if categoryErr != nil {
			return domain.BudgetPeriod{}, categoryErr
		}
		if category.Kind != domain.CategoryExpense || category.ArchivedAt != nil {
			return domain.BudgetPeriod{}, domain.ErrInvalidInput
		}
	}
	if err := validateBudget(b); err != nil {
		return domain.BudgetPeriod{}, err
	}
	return s.repo.Activate(ctx, userID, budgetID, s.clock.Now())
}

func (s *BudgetService) Active(ctx context.Context, userID string, at time.Time) (domain.BudgetPeriod, error) {
	if at.IsZero() {
		at = s.clock.Now()
	}
	return s.repo.GetActive(ctx, userID, at)
}

func validateBudget(b domain.BudgetPeriod) error {
	values := make([]domain.Money, 0, len(b.Allocations)+2)
	values = append(values, b.SavingsCommitment, b.MinimumBuffer)
	for _, allocation := range b.Allocations {
		values = append(values, allocation.Amount)
	}
	total, ok := addNonNegativeMoney(values...)
	if !ok {
		return domain.ErrInvalidInput
	}
	if total > b.ExpectedIncome {
		return domain.ErrBudgetOverallocated
	}
	return nil
}
