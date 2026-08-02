package domain

import "time"

type Dashboard struct {
	LiquidBalance          Money
	SafeToSpendToday       Money
	SafeToSpendUntilPayday Money
	DaysUntilPayday        int
	BudgetTotal            Money
	BudgetUsed             Money
	BudgetRemaining        Money
	UpcomingBill           *UpcomingBill
	Goals                  []GoalProgress
	TopCategories          []CategorySpend
}

type UpcomingBill struct {
	BillID  string
	Name    string
	Amount  Money
	DueDate time.Time
}

type GoalProgress struct {
	GoalID          string
	Name            string
	TargetAmount    Money
	Contributed     Money
	ProgressPercent int64
}

type CategorySpend struct {
	CategoryID string
	Name       string
	Amount     Money
}

type CashFlowReport struct {
	Start             time.Time
	End               time.Time
	GroupBy           string
	Income            Money
	Expenses          Money
	NetCashFlow       Money
	CategoryBreakdown []CategorySpend
	BudgetVsActual    []BudgetVsActualLine
	Trend             []CashFlowTrendPoint
}

type BudgetVsActualLine struct {
	CategoryID string
	Name       string
	Budgeted   Money
	Actual     Money
	Variance   Money
}

type CashFlowTrendPoint struct {
	BucketStart time.Time
	Income      Money
	Expenses    Money
	Net         Money
}

// TrendPoint is the sparse repository-layer result for a cash-flow trend
// query; the application layer zero-fills gaps into CashFlowTrendPoint.
type TrendPoint struct {
	BucketStart time.Time
	Income      Money
	Expenses    Money
}

type Export struct {
	GeneratedAt  time.Time
	Profile      User
	Accounts     []FinancialAccount
	Categories   []Category
	Transactions []Transaction
	Budgets      []BudgetPeriod
	Bills        []RecurringBill
	Goals        []SavingGoal
}
