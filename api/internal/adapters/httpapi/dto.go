package httpapi

import (
	"time"

	"github.com/sakuplan/api/internal/application"
	"github.com/sakuplan/api/internal/domain"
)

type userResponse struct {
	ID            string            `json:"id"`
	Email         string            `json:"email"`
	DisplayName   string            `json:"display_name"`
	Status        domain.UserStatus `json:"status"`
	Role          domain.UserRole   `json:"role"`
	Currency      string            `json:"currency"`
	Timezone      string            `json:"timezone"`
	Payday        int               `json:"payday"`
	MinimumBuffer domain.Money      `json:"minimum_buffer"`
	AIConsent     bool              `json:"ai_consent"`
}

func mapUser(u domain.User) userResponse {
	return userResponse{ID: u.ID, Email: u.Email, DisplayName: u.DisplayName, Status: u.Status, Role: u.Role, Currency: u.Currency, Timezone: u.Timezone, Payday: u.Payday, MinimumBuffer: u.MinimumBuffer, AIConsent: u.AIConsent}
}

type tokenResponse struct {
	AccessToken   string       `json:"access_token"`
	AccessExpiry  time.Time    `json:"access_expires_at"`
	RefreshToken  string       `json:"refresh_token"`
	RefreshExpiry time.Time    `json:"refresh_expires_at"`
	User          userResponse `json:"user"`
}

func mapTokenPair(p application.TokenPair) tokenResponse {
	return tokenResponse{AccessToken: p.AccessToken, AccessExpiry: p.AccessExpiry, RefreshToken: p.RefreshToken, RefreshExpiry: p.RefreshExpiry, User: mapUser(p.User)}
}

type accountResponse struct {
	ID             string             `json:"id"`
	Name           string             `json:"name"`
	Type           domain.AccountType `json:"type"`
	Currency       string             `json:"currency"`
	InitialBalance domain.Money       `json:"initial_balance"`
	Spendable      bool               `json:"spendable"`
	ArchivedAt     *time.Time         `json:"archived_at,omitempty"`
	CreatedAt      time.Time          `json:"created_at"`
}

func mapAccount(a domain.FinancialAccount) accountResponse {
	return accountResponse{ID: a.ID, Name: a.Name, Type: a.Type, Currency: a.Currency, InitialBalance: a.InitialBalance, Spendable: a.Spendable, ArchivedAt: a.ArchivedAt, CreatedAt: a.CreatedAt}
}

type categoryResponse struct {
	ID        string              `json:"id"`
	Name      string              `json:"name"`
	Kind      domain.CategoryKind `json:"kind"`
	Icon      string              `json:"icon"`
	IsDefault bool                `json:"is_default"`
}

func mapCategory(v domain.Category) categoryResponse {
	return categoryResponse{ID: v.ID, Name: v.Name, Kind: v.Kind, Icon: v.Icon, IsDefault: v.IsDefault}
}

type transactionEntryResponse struct {
	AccountID string                `json:"account_id"`
	Direction domain.EntryDirection `json:"direction"`
	Amount    domain.Money          `json:"amount"`
}

type transactionResponse struct {
	ID           string                     `json:"id"`
	Type         domain.TransactionType     `json:"type"`
	CategoryID   string                     `json:"category_id,omitempty"`
	Amount       domain.Money               `json:"amount"`
	OccurredAt   time.Time                  `json:"occurred_at"`
	Note         string                     `json:"note,omitempty"`
	Reason       string                     `json:"reason,omitempty"`
	ReversesID   string                     `json:"reverses_id,omitempty"`
	ReversedByID string                     `json:"reversed_by_id,omitempty"`
	Entries      []transactionEntryResponse `json:"entries"`
	CreatedAt    time.Time                  `json:"created_at"`
}

func mapTransaction(v domain.Transaction) transactionResponse {
	entries := make([]transactionEntryResponse, 0, len(v.Entries))
	for _, e := range v.Entries {
		entries = append(entries, transactionEntryResponse{AccountID: e.AccountID, Direction: e.Direction, Amount: e.Amount})
	}
	return transactionResponse{ID: v.ID, Type: v.Type, CategoryID: v.CategoryID, Amount: v.Amount, OccurredAt: v.OccurredAt, Note: v.Note, Reason: v.Reason, ReversesID: v.ReversesID, ReversedByID: v.ReversedByID, Entries: entries, CreatedAt: v.CreatedAt}
}

type budgetAllocationResponse struct {
	ID         string       `json:"id"`
	CategoryID string       `json:"category_id"`
	Amount     domain.Money `json:"amount"`
}

type budgetResponse struct {
	ID                string                     `json:"id"`
	StartDate         time.Time                  `json:"start_date"`
	EndDate           time.Time                  `json:"end_date"`
	ExpectedIncome    domain.Money               `json:"expected_income"`
	SavingsCommitment domain.Money               `json:"savings_commitment"`
	MinimumBuffer     domain.Money               `json:"minimum_buffer"`
	Status            domain.BudgetStatus        `json:"status"`
	Source            domain.BudgetSource        `json:"source"`
	Allocations       []budgetAllocationResponse `json:"allocations"`
}

func mapBudget(v domain.BudgetPeriod) budgetResponse {
	allocations := make([]budgetAllocationResponse, 0, len(v.Allocations))
	for _, allocation := range v.Allocations {
		allocations = append(allocations, budgetAllocationResponse{ID: allocation.ID, CategoryID: allocation.CategoryID, Amount: allocation.Amount})
	}
	return budgetResponse{ID: v.ID, StartDate: v.StartDate, EndDate: v.EndDate, ExpectedIncome: v.ExpectedIncome, SavingsCommitment: v.SavingsCommitment, MinimumBuffer: v.MinimumBuffer, Status: v.Status, Source: v.Source, Allocations: allocations}
}

type billResponse struct {
	ID              string               `json:"id"`
	Name            string               `json:"name"`
	Amount          domain.Money         `json:"amount"`
	DueDay          int                  `json:"due_day"`
	Frequency       domain.BillFrequency `json:"frequency"`
	CategoryID      string               `json:"category_id"`
	AccountID       string               `json:"account_id"`
	ReminderDays    int                  `json:"reminder_days"`
	Active          bool                 `json:"active"`
	CreatedAt       time.Time            `json:"created_at"`
	UpdatedAt       time.Time            `json:"updated_at"`
	LastPaidDueDate *time.Time           `json:"last_paid_due_date,omitempty"`
}

func mapBill(v domain.RecurringBill) billResponse {
	return billResponse{ID: v.ID, Name: v.Name, Amount: v.Amount, DueDay: v.DueDay, Frequency: v.Frequency, CategoryID: v.CategoryID, AccountID: v.AccountID, ReminderDays: v.ReminderDays, Active: v.Active, CreatedAt: v.CreatedAt, UpdatedAt: v.UpdatedAt, LastPaidDueDate: v.LastPaidDueDate}
}

type billOccurrenceResponse struct {
	ID            string       `json:"id"`
	BillID        string       `json:"bill_id"`
	DueDate       time.Time    `json:"due_date"`
	Amount        domain.Money `json:"amount"`
	TransactionID string       `json:"transaction_id"`
	CreatedAt     time.Time    `json:"created_at"`
}

func mapBillOccurrence(v domain.BillOccurrence) billOccurrenceResponse {
	return billOccurrenceResponse{ID: v.ID, BillID: v.BillID, DueDate: v.DueDate, Amount: v.Amount, TransactionID: v.TransactionID, CreatedAt: v.CreatedAt}
}

type goalResponse struct {
	ID                string            `json:"id"`
	Name              string            `json:"name"`
	TargetAmount      domain.Money      `json:"target_amount"`
	TargetDate        *time.Time        `json:"target_date,omitempty"`
	MonthlyCommitment domain.Money      `json:"monthly_commitment"`
	Priority          int               `json:"priority"`
	Status            domain.GoalStatus `json:"status"`
	CreatedAt         time.Time         `json:"created_at"`
	UpdatedAt         time.Time         `json:"updated_at"`
}

func mapGoal(v domain.SavingGoal) goalResponse {
	var target *time.Time
	if !v.TargetDate.IsZero() {
		t := v.TargetDate
		target = &t
	}
	return goalResponse{ID: v.ID, Name: v.Name, TargetAmount: v.TargetAmount, TargetDate: target, MonthlyCommitment: v.MonthlyCommitment, Priority: v.Priority, Status: v.Status, CreatedAt: v.CreatedAt, UpdatedAt: v.UpdatedAt}
}

type contributionResponse struct {
	ID            string       `json:"id"`
	GoalID        string       `json:"goal_id"`
	AccountID     string       `json:"account_id"`
	Amount        domain.Money `json:"amount"`
	OccurredAt    time.Time    `json:"occurred_at"`
	TransactionID string       `json:"transaction_id"`
	CreatedAt     time.Time    `json:"created_at"`
}

func mapContribution(v domain.GoalContribution) contributionResponse {
	return contributionResponse{ID: v.ID, GoalID: v.GoalID, AccountID: v.AccountID, Amount: v.Amount, OccurredAt: v.OccurredAt, TransactionID: v.TransactionID, CreatedAt: v.CreatedAt}
}

type safeToSpendResponse struct {
	LiquidBalance              domain.Money `json:"liquid_balance"`
	UpcomingBills              domain.Money `json:"upcoming_bills"`
	RemainingSavingsCommitment domain.Money `json:"remaining_savings_commitment"`
	MinimumBuffer              domain.Money `json:"minimum_buffer"`
	UntilPayday                domain.Money `json:"until_payday"`
	Daily                      domain.Money `json:"daily"`
	DaysRemaining              int          `json:"days_remaining"`
	RiskLevel                  string       `json:"risk_level"`
}

func mapSafeToSpend(v domain.SafeToSpend) safeToSpendResponse {
	return safeToSpendResponse{LiquidBalance: v.LiquidBalance, UpcomingBills: v.UpcomingBills, RemainingSavingsCommitment: v.RemainingSavingsCommitment, MinimumBuffer: v.MinimumBuffer, UntilPayday: v.UntilPayday, Daily: v.Daily, DaysRemaining: v.DaysRemaining, RiskLevel: v.RiskLevel}
}

type recommendationResponse struct {
	Mode              domain.RecommendationMode `json:"mode"`
	SavingsCommitment domain.Money              `json:"savings_commitment"`
	MinimumBuffer     domain.Money              `json:"minimum_buffer"`
	Allocations       map[string]domain.Money   `json:"allocations"`
	Unallocated       domain.Money              `json:"unallocated"`
	Warnings          []string                  `json:"warnings"`
	ReasonCodes       []string                  `json:"reason_codes"`
}

func mapRecommendation(v domain.Recommendation) recommendationResponse {
	return recommendationResponse{Mode: v.Mode, SavingsCommitment: v.SavingsCommitment, MinimumBuffer: v.MinimumBuffer, Allocations: v.Allocations, Unallocated: v.Unallocated, Warnings: v.Warnings, ReasonCodes: v.ReasonCodes}
}

type upcomingBillResponse struct {
	BillID  string       `json:"bill_id"`
	Name    string       `json:"name"`
	Amount  domain.Money `json:"amount"`
	DueDate time.Time    `json:"due_date"`
}

type goalProgressResponse struct {
	GoalID          string       `json:"goal_id"`
	Name            string       `json:"name"`
	TargetAmount    domain.Money `json:"target_amount"`
	Contributed     domain.Money `json:"contributed"`
	ProgressPercent int64        `json:"progress_percent"`
}

type categorySpendResponse struct {
	CategoryID string       `json:"category_id"`
	Name       string       `json:"name"`
	Amount     domain.Money `json:"amount"`
}

type dashboardResponse struct {
	LiquidBalance          domain.Money            `json:"liquid_balance"`
	SafeToSpendToday       domain.Money            `json:"safe_to_spend_today"`
	SafeToSpendUntilPayday domain.Money            `json:"safe_to_spend_until_payday"`
	DaysUntilPayday        int                     `json:"days_until_payday"`
	BudgetTotal            domain.Money            `json:"budget_total"`
	BudgetUsed             domain.Money            `json:"budget_used"`
	BudgetRemaining        domain.Money            `json:"budget_remaining"`
	UpcomingBill           *upcomingBillResponse   `json:"upcoming_bill,omitempty"`
	Goals                  []goalProgressResponse  `json:"goals"`
	TopCategories          []categorySpendResponse `json:"top_categories"`
}

func mapDashboard(v domain.Dashboard) dashboardResponse {
	var upcoming *upcomingBillResponse
	if v.UpcomingBill != nil {
		upcoming = &upcomingBillResponse{BillID: v.UpcomingBill.BillID, Name: v.UpcomingBill.Name, Amount: v.UpcomingBill.Amount, DueDate: v.UpcomingBill.DueDate}
	}
	goals := make([]goalProgressResponse, 0, len(v.Goals))
	for _, g := range v.Goals {
		goals = append(goals, goalProgressResponse{GoalID: g.GoalID, Name: g.Name, TargetAmount: g.TargetAmount, Contributed: g.Contributed, ProgressPercent: g.ProgressPercent})
	}
	topCategories := make([]categorySpendResponse, 0, len(v.TopCategories))
	for _, c := range v.TopCategories {
		topCategories = append(topCategories, categorySpendResponse{CategoryID: c.CategoryID, Name: c.Name, Amount: c.Amount})
	}
	return dashboardResponse{
		LiquidBalance: v.LiquidBalance, SafeToSpendToday: v.SafeToSpendToday, SafeToSpendUntilPayday: v.SafeToSpendUntilPayday,
		DaysUntilPayday: v.DaysUntilPayday, BudgetTotal: v.BudgetTotal, BudgetUsed: v.BudgetUsed, BudgetRemaining: v.BudgetRemaining,
		UpcomingBill: upcoming, Goals: goals, TopCategories: topCategories,
	}
}

type budgetVsActualResponse struct {
	CategoryID string       `json:"category_id"`
	Name       string       `json:"name"`
	Budgeted   domain.Money `json:"budgeted"`
	Actual     domain.Money `json:"actual"`
	Variance   domain.Money `json:"variance"`
}

type cashFlowTrendPointResponse struct {
	BucketStart time.Time    `json:"bucket_start"`
	Income      domain.Money `json:"income"`
	Expenses    domain.Money `json:"expenses"`
	Net         domain.Money `json:"net"`
}

type cashFlowReportResponse struct {
	Start             time.Time                    `json:"start"`
	End               time.Time                    `json:"end"`
	GroupBy           string                       `json:"group_by"`
	Income            domain.Money                 `json:"income"`
	Expenses          domain.Money                 `json:"expenses"`
	NetCashFlow       domain.Money                 `json:"net_cash_flow"`
	CategoryBreakdown []categorySpendResponse      `json:"category_breakdown"`
	BudgetVsActual    []budgetVsActualResponse     `json:"budget_vs_actual"`
	Trend             []cashFlowTrendPointResponse `json:"trend"`
}

func mapCashFlowReport(v domain.CashFlowReport) cashFlowReportResponse {
	breakdown := make([]categorySpendResponse, 0, len(v.CategoryBreakdown))
	for _, c := range v.CategoryBreakdown {
		breakdown = append(breakdown, categorySpendResponse{CategoryID: c.CategoryID, Name: c.Name, Amount: c.Amount})
	}
	budgetVsActual := make([]budgetVsActualResponse, 0, len(v.BudgetVsActual))
	for _, l := range v.BudgetVsActual {
		budgetVsActual = append(budgetVsActual, budgetVsActualResponse{CategoryID: l.CategoryID, Name: l.Name, Budgeted: l.Budgeted, Actual: l.Actual, Variance: l.Variance})
	}
	trend := make([]cashFlowTrendPointResponse, 0, len(v.Trend))
	for _, p := range v.Trend {
		trend = append(trend, cashFlowTrendPointResponse{BucketStart: p.BucketStart, Income: p.Income, Expenses: p.Expenses, Net: p.Net})
	}
	return cashFlowReportResponse{
		Start: v.Start, End: v.End, GroupBy: v.GroupBy, Income: v.Income, Expenses: v.Expenses, NetCashFlow: v.NetCashFlow,
		CategoryBreakdown: breakdown, BudgetVsActual: budgetVsActual, Trend: trend,
	}
}

type exportResponse struct {
	GeneratedAt  time.Time             `json:"generated_at"`
	Profile      userResponse          `json:"profile"`
	Accounts     []accountResponse     `json:"accounts"`
	Categories   []categoryResponse    `json:"categories"`
	Transactions []transactionResponse `json:"transactions"`
	Budgets      []budgetResponse      `json:"budgets"`
	Bills        []billResponse        `json:"bills"`
	Goals        []goalResponse        `json:"goals"`
}

func mapExport(v domain.Export) exportResponse {
	accounts := make([]accountResponse, 0, len(v.Accounts))
	for _, a := range v.Accounts {
		accounts = append(accounts, mapAccount(a))
	}
	categories := make([]categoryResponse, 0, len(v.Categories))
	for _, c := range v.Categories {
		categories = append(categories, mapCategory(c))
	}
	transactions := make([]transactionResponse, 0, len(v.Transactions))
	for _, t := range v.Transactions {
		transactions = append(transactions, mapTransaction(t))
	}
	budgets := make([]budgetResponse, 0, len(v.Budgets))
	for _, b := range v.Budgets {
		budgets = append(budgets, mapBudget(b))
	}
	bills := make([]billResponse, 0, len(v.Bills))
	for _, b := range v.Bills {
		bills = append(bills, mapBill(b))
	}
	goals := make([]goalResponse, 0, len(v.Goals))
	for _, g := range v.Goals {
		goals = append(goals, mapGoal(g))
	}
	return exportResponse{
		GeneratedAt: v.GeneratedAt, Profile: mapUser(v.Profile), Accounts: accounts, Categories: categories,
		Transactions: transactions, Budgets: budgets, Bills: bills, Goals: goals,
	}
}
