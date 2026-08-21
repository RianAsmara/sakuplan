package domain

import (
	"context"
	"time"
)

type UserRepository interface {
	Create(context.Context, User) (User, error)
	GetByID(context.Context, string) (User, error)
	GetByEmail(context.Context, string) (User, error)
	UpdateProfile(context.Context, User) (User, error)
}

type SessionRepository interface {
	Create(context.Context, RefreshSession) (RefreshSession, error)
	GetByTokenHash(context.Context, string) (RefreshSession, error)
	Rotate(context.Context, string, RefreshSession, time.Time) (RefreshSession, error)
	Revoke(context.Context, string, time.Time) error
	RevokeFamily(context.Context, string, time.Time) error
	RevokeAllForUser(context.Context, string, time.Time) error
}

type AccountRepository interface {
	Create(context.Context, FinancialAccount) (FinancialAccount, error)
	Get(context.Context, string, string) (FinancialAccount, error)
	List(context.Context, string, bool) ([]FinancialAccount, error)
	Update(context.Context, FinancialAccount) (FinancialAccount, error)
	Archive(context.Context, string, string, time.Time) error
	Balance(context.Context, string, string) (Money, error)
	LiquidBalance(context.Context, string) (Money, error)
}

type CategoryRepository interface {
	Create(context.Context, Category) (Category, error)
	Get(context.Context, string, string) (Category, error)
	List(context.Context, string, CategoryKind, bool) ([]Category, error)
	Update(context.Context, Category) (Category, error)
	Archive(context.Context, string, string, time.Time) error
}

type TransactionRepository interface {
	Create(context.Context, Transaction) (Transaction, error)
	Reverse(context.Context, string, Transaction) (Transaction, error)
	Get(context.Context, string, string) (Transaction, error)
	GetByIdempotency(context.Context, string, string, string) (Transaction, error)
	List(context.Context, string, Page) ([]Transaction, string, error)
	SpentByCategory(context.Context, string, time.Time, time.Time) (map[string]Money, error)
	CashFlowTotals(context.Context, string, time.Time, time.Time) (Money, Money, error)
	CashFlowTrend(context.Context, string, time.Time, time.Time, string) ([]TrendPoint, error)
}

type BudgetRepository interface {
	Create(context.Context, BudgetPeriod) (BudgetPeriod, error)
	Get(context.Context, string, string) (BudgetPeriod, error)
	GetActive(context.Context, string, time.Time) (BudgetPeriod, error)
	Activate(context.Context, string, string, time.Time) (BudgetPeriod, error)
	ReplaceAllocations(context.Context, string, string, []BudgetAllocation, time.Time) (BudgetPeriod, error)
	List(context.Context, string) ([]BudgetPeriod, error)
}

type BillRepository interface {
	Create(context.Context, RecurringBill) (RecurringBill, error)
	Get(context.Context, string, string) (RecurringBill, error)
	List(context.Context, string, bool) ([]RecurringBill, error)
	Update(context.Context, RecurringBill) (RecurringBill, error)
	UpcomingTotal(context.Context, string, time.Time, time.Time) (Money, error)
	NextDue(context.Context, string, time.Time, time.Time) (RecurringBill, time.Time, error)
	AddOccurrence(context.Context, BillOccurrence) (BillOccurrence, error)
	GetOccurrenceByTransactionID(context.Context, string, string) (BillOccurrence, error)
}

type GoalRepository interface {
	Create(context.Context, SavingGoal) (SavingGoal, error)
	Get(context.Context, string, string) (SavingGoal, error)
	List(context.Context, string, bool) ([]SavingGoal, error)
	Update(context.Context, SavingGoal) (SavingGoal, error)
	AddContribution(context.Context, GoalContribution) (GoalContribution, error)
	GetContributionByTransactionID(context.Context, string, string) (GoalContribution, error)
	ContributedTotal(context.Context, string, string) (Money, error)
	RemainingMonthlyCommitment(context.Context, string, time.Time) (Money, error)
}

type AuditRepository interface {
	Append(context.Context, AuditEvent) error
}

type AuditEvent struct {
	ID         string
	ActorType  string
	ActorID    string
	Action     string
	TargetType string
	TargetID   string
	RequestID  string
	Reason     string
	Metadata   map[string]string
	OccurredAt time.Time
}
