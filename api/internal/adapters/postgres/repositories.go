package postgres

import (
	"context"
	"time"

	"github.com/sakuplan/api/internal/domain"
)

type UserRepo struct{ s *Store }

func NewUserRepo(s *Store) *UserRepo { return &UserRepo{s: s} }
func (r *UserRepo) Create(c context.Context, v domain.User) (domain.User, error) {
	return r.s.CreateUser(c, v)
}
func (r *UserRepo) GetByID(c context.Context, id string) (domain.User, error) {
	return r.s.GetUserByID(c, id)
}
func (r *UserRepo) GetByEmail(c context.Context, e string) (domain.User, error) {
	return r.s.GetUserByEmail(c, e)
}
func (r *UserRepo) UpdateProfile(c context.Context, v domain.User) (domain.User, error) {
	return r.s.UpdateUserProfile(c, v)
}

type SessionRepo struct{ s *Store }

func NewSessionRepo(s *Store) *SessionRepo { return &SessionRepo{s: s} }
func (r *SessionRepo) Create(c context.Context, v domain.RefreshSession) (domain.RefreshSession, error) {
	return r.s.CreateSession(c, v)
}
func (r *SessionRepo) GetByTokenHash(c context.Context, h string) (domain.RefreshSession, error) {
	return r.s.GetSessionByTokenHash(c, h)
}
func (r *SessionRepo) Rotate(c context.Context, id string, v domain.RefreshSession, t time.Time) (domain.RefreshSession, error) {
	return r.s.RotateSession(c, id, v, t)
}
func (r *SessionRepo) Revoke(c context.Context, id string, t time.Time) error {
	return r.s.RevokeSession(c, id, t)
}
func (r *SessionRepo) RevokeFamily(c context.Context, id string, t time.Time) error {
	return r.s.RevokeSessionFamily(c, id, t)
}
func (r *SessionRepo) RevokeAllForUser(c context.Context, id string, t time.Time) error {
	return r.s.RevokeAllSessions(c, id, t)
}

type AccountRepo struct{ s *Store }

func NewAccountRepo(s *Store) *AccountRepo { return &AccountRepo{s: s} }
func (r *AccountRepo) Create(c context.Context, v domain.FinancialAccount) (domain.FinancialAccount, error) {
	return r.s.CreateAccount(c, v)
}
func (r *AccountRepo) Get(c context.Context, u, id string) (domain.FinancialAccount, error) {
	return r.s.GetAccount(c, u, id)
}
func (r *AccountRepo) List(c context.Context, u string, a bool) ([]domain.FinancialAccount, error) {
	return r.s.ListAccounts(c, u, a)
}
func (r *AccountRepo) Update(c context.Context, v domain.FinancialAccount) (domain.FinancialAccount, error) {
	return r.s.UpdateAccount(c, v)
}
func (r *AccountRepo) Archive(c context.Context, u, id string, t time.Time) error {
	return r.s.ArchiveAccount(c, u, id, t)
}
func (r *AccountRepo) Balance(c context.Context, u, id string) (domain.Money, error) {
	return r.s.AccountBalance(c, u, id)
}
func (r *AccountRepo) LiquidBalance(c context.Context, u string) (domain.Money, error) {
	return r.s.LiquidBalance(c, u)
}

type CategoryRepo struct{ s *Store }

func NewCategoryRepo(s *Store) *CategoryRepo { return &CategoryRepo{s: s} }
func (r *CategoryRepo) Create(c context.Context, v domain.Category) (domain.Category, error) {
	return r.s.CreateCategory(c, v)
}
func (r *CategoryRepo) Get(c context.Context, u, id string) (domain.Category, error) {
	return r.s.GetCategory(c, u, id)
}
func (r *CategoryRepo) List(c context.Context, u string, k domain.CategoryKind, a bool) ([]domain.Category, error) {
	return r.s.ListCategories(c, u, k, a)
}
func (r *CategoryRepo) Update(c context.Context, v domain.Category) (domain.Category, error) {
	return r.s.UpdateCategory(c, v)
}
func (r *CategoryRepo) Archive(c context.Context, u, id string, t time.Time) error {
	return r.s.ArchiveCategory(c, u, id, t)
}

type TransactionRepo struct{ s *Store }

func NewTransactionRepo(s *Store) *TransactionRepo { return &TransactionRepo{s: s} }
func (r *TransactionRepo) Create(c context.Context, v domain.Transaction) (domain.Transaction, error) {
	return r.s.CreateTransaction(c, v)
}
func (r *TransactionRepo) Reverse(c context.Context, originalID string, v domain.Transaction) (domain.Transaction, error) {
	return r.s.ReverseTransaction(c, originalID, v)
}
func (r *TransactionRepo) Get(c context.Context, u, id string) (domain.Transaction, error) {
	return r.s.GetTransaction(c, u, id)
}
func (r *TransactionRepo) GetByIdempotency(c context.Context, u, o, k string) (domain.Transaction, error) {
	return r.s.GetTransactionByIdempotency(c, u, o, k)
}
func (r *TransactionRepo) List(c context.Context, u string, p domain.Page) ([]domain.Transaction, string, error) {
	return r.s.ListTransactions(c, u, p)
}
func (r *TransactionRepo) SpentByCategory(c context.Context, u string, f, t time.Time) (map[string]domain.Money, error) {
	return r.s.SpentByCategory(c, u, f, t)
}
func (r *TransactionRepo) CashFlowTotals(c context.Context, u string, f, t time.Time) (domain.Money, domain.Money, error) {
	return r.s.CashFlowTotals(c, u, f, t)
}
func (r *TransactionRepo) CashFlowTrend(c context.Context, u string, f, t time.Time, groupBy string) ([]domain.TrendPoint, error) {
	return r.s.CashFlowTrend(c, u, f, t, groupBy)
}

type BudgetRepo struct{ s *Store }

func NewBudgetRepo(s *Store) *BudgetRepo { return &BudgetRepo{s: s} }
func (r *BudgetRepo) Create(c context.Context, v domain.BudgetPeriod) (domain.BudgetPeriod, error) {
	return r.s.CreateBudget(c, v)
}
func (r *BudgetRepo) Get(c context.Context, u, id string) (domain.BudgetPeriod, error) {
	return r.s.GetBudget(c, u, id)
}
func (r *BudgetRepo) GetActive(c context.Context, u string, t time.Time) (domain.BudgetPeriod, error) {
	return r.s.GetActiveBudget(c, u, t)
}
func (r *BudgetRepo) Activate(c context.Context, u, id string, t time.Time) (domain.BudgetPeriod, error) {
	return r.s.ActivateBudget(c, u, id, t)
}
func (r *BudgetRepo) ReplaceAllocations(c context.Context, u, id string, a []domain.BudgetAllocation, t time.Time) (domain.BudgetPeriod, error) {
	return r.s.ReplaceBudgetAllocations(c, u, id, a, t)
}
func (r *BudgetRepo) List(c context.Context, u string) ([]domain.BudgetPeriod, error) {
	return r.s.ListBudgets(c, u)
}

type BillRepo struct{ s *Store }

func NewBillRepo(s *Store) *BillRepo { return &BillRepo{s: s} }
func (r *BillRepo) Create(c context.Context, v domain.RecurringBill) (domain.RecurringBill, error) {
	return r.s.CreateBill(c, v)
}
func (r *BillRepo) Get(c context.Context, u, id string) (domain.RecurringBill, error) {
	return r.s.GetBill(c, u, id)
}
func (r *BillRepo) List(c context.Context, u string, a bool) ([]domain.RecurringBill, error) {
	return r.s.ListBills(c, u, a)
}
func (r *BillRepo) Update(c context.Context, v domain.RecurringBill) (domain.RecurringBill, error) {
	return r.s.UpdateBill(c, v)
}
func (r *BillRepo) UpcomingTotal(c context.Context, u string, f, t time.Time) (domain.Money, error) {
	return r.s.UpcomingBillsTotal(c, u, f, t)
}
func (r *BillRepo) NextDue(c context.Context, u string, f, t time.Time) (domain.RecurringBill, time.Time, error) {
	return r.s.NextDueBill(c, u, f, t)
}
func (r *BillRepo) AddOccurrence(c context.Context, v domain.BillOccurrence) (domain.BillOccurrence, error) {
	return r.s.AddBillOccurrence(c, v)
}
func (r *BillRepo) GetOccurrenceByTransactionID(c context.Context, u, id string) (domain.BillOccurrence, error) {
	return r.s.GetBillOccurrenceByTransactionID(c, u, id)
}

type GoalRepo struct{ s *Store }

func NewGoalRepo(s *Store) *GoalRepo { return &GoalRepo{s: s} }
func (r *GoalRepo) Create(c context.Context, v domain.SavingGoal) (domain.SavingGoal, error) {
	return r.s.CreateGoal(c, v)
}
func (r *GoalRepo) Get(c context.Context, u, id string) (domain.SavingGoal, error) {
	return r.s.GetGoal(c, u, id)
}
func (r *GoalRepo) List(c context.Context, u string, a bool) ([]domain.SavingGoal, error) {
	return r.s.ListGoals(c, u, a)
}
func (r *GoalRepo) Update(c context.Context, v domain.SavingGoal) (domain.SavingGoal, error) {
	return r.s.UpdateGoal(c, v)
}
func (r *GoalRepo) AddContribution(c context.Context, v domain.GoalContribution) (domain.GoalContribution, error) {
	return r.s.AddGoalContribution(c, v)
}
func (r *GoalRepo) GetContributionByTransactionID(c context.Context, u, id string) (domain.GoalContribution, error) {
	return r.s.GetGoalContributionByTransactionID(c, u, id)
}
func (r *GoalRepo) ContributedTotal(c context.Context, u, id string) (domain.Money, error) {
	return r.s.GoalContributedTotal(c, u, id)
}
func (r *GoalRepo) RemainingMonthlyCommitment(c context.Context, u string, t time.Time) (domain.Money, error) {
	return r.s.RemainingGoalCommitment(c, u, t)
}

type AuditRepo struct{ s *Store }

func NewAuditRepo(s *Store) *AuditRepo { return &AuditRepo{s: s} }
func (r *AuditRepo) Append(c context.Context, v domain.AuditEvent) error {
	return r.s.AppendAudit(c, v)
}
