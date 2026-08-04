package application

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/sakuplan/api/internal/domain"
	"github.com/sakuplan/api/internal/ports"
)

type BillService struct {
	repo       domain.BillRepository
	accounts   domain.AccountRepository
	categories domain.CategoryRepository
	clock      ports.Clock
	ids        ports.IDGenerator
}

func NewBillService(repo domain.BillRepository, accounts domain.AccountRepository, categories domain.CategoryRepository, clock ports.Clock, ids ports.IDGenerator) *BillService {
	return &BillService{repo: repo, accounts: accounts, categories: categories, clock: clock, ids: ids}
}
func (s *BillService) Create(ctx context.Context, userID string, b domain.RecurringBill) (domain.RecurringBill, error) {
	b.Name = strings.TrimSpace(b.Name)
	if b.Frequency == "" {
		b.Frequency = domain.BillMonthly
	}
	if b.Name == "" || len(b.Name) > 100 || b.Amount <= 0 || b.DueDay < 1 || b.DueDay > 31 || b.Frequency != domain.BillMonthly || b.ReminderDays < 0 || b.ReminderDays > 90 {
		return domain.RecurringBill{}, domain.ErrInvalidInput
	}
	account, err := s.accounts.Get(ctx, userID, b.AccountID)
	if err != nil {
		return domain.RecurringBill{}, err
	}
	if account.ArchivedAt != nil {
		return domain.RecurringBill{}, domain.ErrConflict
	}
	category, err := s.categories.Get(ctx, userID, b.CategoryID)
	if err != nil {
		return domain.RecurringBill{}, err
	}
	if category.Kind != domain.CategoryExpense || category.ArchivedAt != nil {
		return domain.RecurringBill{}, domain.ErrInvalidInput
	}
	now := s.clock.Now()
	b.ID = s.ids.New()
	b.UserID = userID
	b.Active = true
	b.CreatedAt = now
	b.UpdatedAt = now
	return s.repo.Create(ctx, b)
}
func (s *BillService) List(ctx context.Context, userID string, active bool) ([]domain.RecurringBill, error) {
	return s.repo.List(ctx, userID, active)
}

type GoalService struct {
	repo     domain.GoalRepository
	accounts domain.AccountRepository
	txs      domain.TransactionRepository
	uow      ports.UnitOfWork
	clock    ports.Clock
	ids      ports.IDGenerator
}

func NewGoalService(repo domain.GoalRepository, accounts domain.AccountRepository, txs domain.TransactionRepository, uow ports.UnitOfWork, clock ports.Clock, ids ports.IDGenerator) *GoalService {
	return &GoalService{repo: repo, accounts: accounts, txs: txs, uow: uow, clock: clock, ids: ids}
}
func (s *GoalService) Create(ctx context.Context, userID string, g domain.SavingGoal) (domain.SavingGoal, error) {
	g.Name = strings.TrimSpace(g.Name)
	if g.Name == "" || len(g.Name) > 100 || g.TargetAmount <= 0 || g.MonthlyCommitment < 0 || g.Priority < 0 {
		return domain.SavingGoal{}, domain.ErrInvalidInput
	}
	now := s.clock.Now()
	g.ID = s.ids.New()
	g.UserID = userID
	g.Status = domain.GoalActive
	g.CreatedAt = now
	g.UpdatedAt = now
	return s.repo.Create(ctx, g)
}

func (s *GoalService) List(ctx context.Context, userID string, activeOnly bool) ([]domain.SavingGoal, error) {
	return s.repo.List(ctx, userID, activeOnly)
}

type ContributeInput struct {
	GoalID         string       `json:"goal_id"`
	AccountID      string       `json:"account_id"`
	IdempotencyKey string       `json:"-"`
	Amount         domain.Money `json:"amount"`
	OccurredAt     time.Time    `json:"occurred_at"`
}

func (s *GoalService) Contribute(ctx context.Context, userID string, in ContributeInput) (domain.GoalContribution, error) {
	in.IdempotencyKey = strings.TrimSpace(in.IdempotencyKey)
	if in.Amount <= 0 || in.GoalID == "" || in.AccountID == "" || !validIdempotencyKey(in.IdempotencyKey) {
		return domain.GoalContribution{}, domain.ErrInvalidInput
	}
	if in.OccurredAt.IsZero() {
		in.OccurredAt = s.clock.Now()
	}
	const operation = "goal.contribute"
	hash, err := canonicalHash(in)
	if err != nil {
		return domain.GoalContribution{}, err
	}
	if existing, err := s.txs.GetByIdempotency(ctx, userID, operation, in.IdempotencyKey); err == nil {
		if existing.RequestHash != hash {
			return domain.GoalContribution{}, domain.ErrIdempotencyConflict
		}
		return s.repo.GetContributionByTransactionID(ctx, userID, existing.ID)
	} else if !errors.Is(err, domain.ErrNotFound) {
		return domain.GoalContribution{}, err
	}
	var out domain.GoalContribution
	err = s.uow.WithinTransaction(ctx, func(txctx context.Context) error {
		if _, err := s.repo.Get(txctx, userID, in.GoalID); err != nil {
			return err
		}
		account, err := s.accounts.Get(txctx, userID, in.AccountID)
		if err != nil {
			return err
		}
		if account.ArchivedAt != nil {
			return domain.ErrConflict
		}
		txID := s.ids.New()
		tx := domain.Transaction{
			ID:                   txID,
			UserID:               userID,
			Type:                 domain.TransactionAdjustment,
			Amount:               in.Amount,
			OccurredAt:           in.OccurredAt,
			Note:                 "saving goal contribution",
			Reason:               "debit:saving_goal_contribution",
			IdempotencyKey:       in.IdempotencyKey,
			IdempotencyOperation: operation,
			RequestHash:          hash,
			CreatedAt:            s.clock.Now(),
			Entries: []domain.TransactionEntry{{
				ID:            s.ids.New(),
				TransactionID: txID,
				AccountID:     in.AccountID,
				Direction:     domain.EntryDebit,
				Amount:        in.Amount,
			}},
		}
		if _, err := s.txs.Create(txctx, tx); err != nil {
			return err
		}
		var addErr error
		out, addErr = s.repo.AddContribution(txctx, domain.GoalContribution{ID: s.ids.New(), GoalID: in.GoalID, UserID: userID, AccountID: in.AccountID, Amount: in.Amount, OccurredAt: in.OccurredAt, TransactionID: txID, CreatedAt: s.clock.Now()})
		return addErr
	})
	return out, err
}
