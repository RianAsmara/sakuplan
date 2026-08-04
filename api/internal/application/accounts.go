package application

import (
	"context"
	"strings"

	"github.com/sakuplan/api/internal/domain"
	"github.com/sakuplan/api/internal/ports"
)

type AccountService struct {
	repo  domain.AccountRepository
	clock ports.Clock
	ids   ports.IDGenerator
}

func NewAccountService(repo domain.AccountRepository, clock ports.Clock, ids ports.IDGenerator) *AccountService {
	return &AccountService{repo: repo, clock: clock, ids: ids}
}

type CreateAccountInput struct {
	Name           string
	Type           domain.AccountType
	Currency       string
	InitialBalance domain.Money
	Spendable      bool
}

func (s *AccountService) Create(ctx context.Context, userID string, in CreateAccountInput) (domain.FinancialAccount, error) {
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" || len(in.Name) > 100 || in.InitialBalance < 0 || !validAccountType(in.Type) {
		return domain.FinancialAccount{}, domain.ErrInvalidInput
	}
	in.Currency = strings.ToUpper(strings.TrimSpace(in.Currency))
	if in.Currency == "" {
		in.Currency = "IDR"
	}
	if len(in.Currency) != 3 {
		return domain.FinancialAccount{}, domain.ErrInvalidInput
	}
	now := s.clock.Now()
	return s.repo.Create(ctx, domain.FinancialAccount{ID: s.ids.New(), UserID: userID, Name: in.Name, Type: in.Type, Currency: in.Currency, InitialBalance: in.InitialBalance, Spendable: in.Spendable, CreatedAt: now, UpdatedAt: now})
}
func (s *AccountService) List(ctx context.Context, userID string, archived bool) ([]domain.FinancialAccount, error) {
	return s.repo.List(ctx, userID, archived)
}
func (s *AccountService) Get(ctx context.Context, userID, id string) (domain.FinancialAccount, error) {
	return s.repo.Get(ctx, userID, id)
}
func (s *AccountService) Balance(ctx context.Context, userID, id string) (domain.Money, error) {
	return s.repo.Balance(ctx, userID, id)
}
func (s *AccountService) Archive(ctx context.Context, userID, id string) error {
	return s.repo.Archive(ctx, userID, id, s.clock.Now())
}

func validAccountType(value domain.AccountType) bool {
	switch value {
	case domain.AccountCash, domain.AccountBank, domain.AccountEWallet, domain.AccountSavings, domain.AccountOther:
		return true
	default:
		return false
	}
}
