package domain

import "time"

type UserStatus string

type UserRole string

const (
	UserStatusActive          UserStatus = "active"
	UserStatusSuspended       UserStatus = "suspended"
	UserStatusDeletionPending UserStatus = "deletion_pending"
	UserStatusDeleted         UserStatus = "deleted"

	RoleUser       UserRole = "user"
	RoleSuperAdmin UserRole = "super_admin"
	RoleOperations UserRole = "operations_admin"
	RoleSupport    UserRole = "support_agent"
	RoleAuditor    UserRole = "auditor"
)

type User struct {
	ID            string
	Email         string
	DisplayName   string
	PasswordHash  string
	Status        UserStatus
	Role          UserRole
	Currency      string
	Timezone      string
	Payday        int
	MinimumBuffer Money
	AIConsent     bool

	AcceptedTermsVersion   string
	AcceptedPrivacyVersion string

	CreatedAt time.Time
	UpdatedAt time.Time
}

type RefreshSession struct {
	ID           string
	UserID       string
	FamilyID     string
	TokenHash    string
	ReplacedByID string
	ExpiresAt    time.Time
	RevokedAt    *time.Time
	CreatedAt    time.Time
	UserAgent    string
	IPAddress    string
}

type AccountType string

const (
	AccountCash    AccountType = "cash"
	AccountBank    AccountType = "bank"
	AccountEWallet AccountType = "ewallet"
	AccountSavings AccountType = "savings"
	AccountOther   AccountType = "other"
)

type FinancialAccount struct {
	ID             string
	UserID         string
	Name           string
	Type           AccountType
	Currency       string
	InitialBalance Money
	Spendable      bool
	ArchivedAt     *time.Time
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type CategoryKind string

const (
	CategoryIncome  CategoryKind = "income"
	CategoryExpense CategoryKind = "expense"
)

type Category struct {
	ID         string
	UserID     string
	Name       string
	Kind       CategoryKind
	Icon       string
	IsDefault  bool
	ArchivedAt *time.Time
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type TransactionType string

type EntryDirection string

const (
	TransactionIncome     TransactionType = "income"
	TransactionExpense    TransactionType = "expense"
	TransactionTransfer   TransactionType = "transfer"
	TransactionAdjustment TransactionType = "adjustment"
	TransactionReversal   TransactionType = "reversal"

	EntryCredit EntryDirection = "credit"
	EntryDebit  EntryDirection = "debit"
)

type Transaction struct {
	ID                   string
	UserID               string
	Type                 TransactionType
	CategoryID           string
	Amount               Money
	OccurredAt           time.Time
	Note                 string
	Reason               string
	ReversesID           string
	ReversedByID         string
	IdempotencyKey       string
	IdempotencyOperation string
	RequestHash          string
	CreatedAt            time.Time
	Entries              []TransactionEntry
}

type TransactionEntry struct {
	ID            string
	TransactionID string
	AccountID     string
	Direction     EntryDirection
	Amount        Money
}

type BudgetStatus string

type BudgetSource string

const (
	BudgetDraft  BudgetStatus = "draft"
	BudgetActive BudgetStatus = "active"
	BudgetClosed BudgetStatus = "closed"

	BudgetManual     BudgetSource = "manual"
	BudgetRuleBased  BudgetSource = "rule_based"
	BudgetAIAssisted BudgetSource = "ai_assisted"
)

type BudgetPeriod struct {
	ID                string
	UserID            string
	StartDate         time.Time
	EndDate           time.Time
	ExpectedIncome    Money
	SavingsCommitment Money
	MinimumBuffer     Money
	Status            BudgetStatus
	Source            BudgetSource
	CreatedAt         time.Time
	UpdatedAt         time.Time
	Allocations       []BudgetAllocation
}

type BudgetAllocation struct {
	ID             string
	BudgetPeriodID string
	CategoryID     string
	Amount         Money
}

type BillFrequency string

const (
	BillWeekly  BillFrequency = "weekly"
	BillMonthly BillFrequency = "monthly"
	BillYearly  BillFrequency = "yearly"
)

type RecurringBill struct {
	ID           string
	UserID       string
	Name         string
	Amount       Money
	DueDay       int
	Frequency    BillFrequency
	CategoryID   string
	AccountID    string
	ReminderDays int
	Active       bool
	CreatedAt    time.Time
	UpdatedAt    time.Time
	// LastPaidDueDate is the due_date of the most recent bill_occurrence
	// paid for this bill, or nil if none has ever been paid.
	LastPaidDueDate *time.Time
}

// BillOccurrence is the record of a single recurring-bill period being
// paid. Its existence for a given (bill_id, due_date) pair IS the "paid"
// state — there is no separate status column to track.
type BillOccurrence struct {
	ID            string
	BillID        string
	UserID        string
	DueDate       time.Time
	Amount        Money
	TransactionID string
	CreatedAt     time.Time
}

type GoalStatus string

const (
	GoalActive    GoalStatus = "active"
	GoalCompleted GoalStatus = "completed"
	GoalArchived  GoalStatus = "archived"
)

type SavingGoal struct {
	ID                string
	UserID            string
	Name              string
	TargetAmount      Money
	TargetDate        time.Time
	MonthlyCommitment Money
	Priority          int
	Status            GoalStatus
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type GoalContribution struct {
	ID            string
	GoalID        string
	UserID        string
	AccountID     string
	Amount        Money
	OccurredAt    time.Time
	TransactionID string
	CreatedAt     time.Time
}

type RecommendationMode string

const (
	RecommendationConservative RecommendationMode = "conservative"
	RecommendationBalanced     RecommendationMode = "balanced"
	RecommendationFlexible     RecommendationMode = "flexible"
)

type RecommendationInput struct {
	ExpectedIncome    Money
	FixedBills        Money
	DebtPayments      Money
	RequestedSavings  Money
	MinimumBuffer     Money
	Dependants        int
	Mode              RecommendationMode
	CategoryWeights   map[string]int
	LockedAllocations map[string]Money
}

type Recommendation struct {
	Mode              RecommendationMode
	SavingsCommitment Money
	MinimumBuffer     Money
	Allocations       map[string]Money
	Unallocated       Money
	Warnings          []string
	ReasonCodes       []string
}

type SafeToSpend struct {
	LiquidBalance              Money
	UpcomingBills              Money
	RemainingSavingsCommitment Money
	MinimumBuffer              Money
	UntilPayday                Money
	Daily                      Money
	DaysRemaining              int
	RiskLevel                  string
}
