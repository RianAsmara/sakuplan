package application_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/sakuplan/api/internal/application"
	"github.com/sakuplan/api/internal/domain"
	"github.com/sakuplan/api/internal/testkit"
)

func reportingFixture(now time.Time) (*application.ReportingService, *application.PlanningService, *testkit.Accounts, *testkit.Categories, *testkit.Transactions, *testkit.Budgets, *testkit.Bills, *testkit.Goals) {
	accounts := testkit.NewAccounts()
	categories := testkit.NewCategories()
	txs := testkit.NewTransactions(accounts)
	budgets := testkit.NewBudgets()
	bills := &testkit.Bills{NextErr: domain.ErrNotFound}
	goals := testkit.NewGoals()
	clock := testkit.Clock{Time: now}
	planning := application.NewPlanningService(accounts, budgets, bills, goals, clock)
	svc := application.NewReportingService(accounts, budgets, bills, goals, categories, txs, planning, clock)
	return svc, planning, accounts, categories, txs, budgets, bills, goals
}

func expenseCategory(categories *testkit.Categories, id, name string) {
	_, _ = categories.Create(context.Background(), domain.Category{ID: id, Kind: domain.CategoryExpense, Name: name})
}

func expenseTxn(txs *testkit.Transactions, id, userID, categoryID string, amount domain.Money, at time.Time) {
	txs.ByID[id] = domain.Transaction{ID: id, UserID: userID, Type: domain.TransactionExpense, CategoryID: categoryID, Amount: amount, OccurredAt: at}
}

func TestDashboardBudgetUsedAndTopFiveCategories(t *testing.T) {
	now := time.Date(2026, 7, 15, 12, 0, 0, 0, time.UTC)
	svc, _, accounts, categories, txs, budgets, _, _ := reportingFixture(now)
	ctx := context.Background()

	_, _ = accounts.Create(ctx, domain.FinancialAccount{ID: "a1", UserID: "u1", Spendable: true, InitialBalance: 10_000_000})

	for i, name := range []string{"c1", "c2", "c3", "c4", "c5", "c6", "c7"} {
		expenseCategory(categories, name, name)
		_ = i
	}
	budgets.ByID["b1"] = domain.BudgetPeriod{
		ID: "b1", UserID: "u1",
		StartDate: time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 7, 31, 0, 0, 0, 0, time.UTC),
		Status:    domain.BudgetActive,
		Allocations: []domain.BudgetAllocation{
			{CategoryID: "c1", Amount: 1_000_000},
			{CategoryID: "c2", Amount: 1_000_000},
			{CategoryID: "c3", Amount: 1_000_000},
		},
	}
	spend := map[string]domain.Money{"c1": 700_000, "c2": 600_000, "c3": 500_000, "c4": 900_000, "c5": 800_000, "c6": 400_000, "c7": 300_000}
	i := 0
	for cat, amt := range spend {
		expenseTxn(txs, "t"+cat, "u1", cat, amt, time.Date(2026, 7, 10, 0, 0, 0, 0, time.UTC))
		i++
	}

	got, err := svc.Dashboard(ctx, domain.User{ID: "u1", Payday: 25}, now)
	if err != nil {
		t.Fatal(err)
	}
	if got.BudgetTotal != 3_000_000 {
		t.Fatalf("expected budget total 3000000, got %d", got.BudgetTotal)
	}
	if got.BudgetUsed != 1_800_000 {
		t.Fatalf("expected budget used 1800000 (c1+c2+c3), got %d", got.BudgetUsed)
	}
	if got.BudgetRemaining != 1_200_000 {
		t.Fatalf("expected budget remaining 1200000, got %d", got.BudgetRemaining)
	}
	if len(got.TopCategories) != 5 {
		t.Fatalf("expected top 5 categories, got %d", len(got.TopCategories))
	}
	wantOrder := []string{"c4", "c5", "c1", "c2", "c3"}
	for i, id := range wantOrder {
		if got.TopCategories[i].CategoryID != id {
			t.Fatalf("position %d: expected %s, got %s", i, id, got.TopCategories[i].CategoryID)
		}
	}
}

func TestDashboardFallsBackToCalendarMonthWithoutActiveBudget(t *testing.T) {
	now := time.Date(2026, 7, 15, 12, 0, 0, 0, time.UTC)
	svc, _, accounts, categories, txs, _, _, _ := reportingFixture(now)
	ctx := context.Background()
	_, _ = accounts.Create(ctx, domain.FinancialAccount{ID: "a1", UserID: "u1", Spendable: true, InitialBalance: 1_000_000})
	expenseCategory(categories, "c1", "c1")
	expenseTxn(txs, "t1", "u1", "c1", 250_000, time.Date(2026, 7, 5, 0, 0, 0, 0, time.UTC))
	expenseTxn(txs, "t2", "u1", "c1", 999_999, time.Date(2026, 6, 5, 0, 0, 0, 0, time.UTC)) // outside window

	got, err := svc.Dashboard(ctx, domain.User{ID: "u1", Payday: 25}, now)
	if err != nil {
		t.Fatal(err)
	}
	if got.BudgetTotal != 0 || got.BudgetUsed != 0 || got.BudgetRemaining != 0 {
		t.Fatalf("expected zero budget fields without an active budget, got %+v", got)
	}
	if len(got.TopCategories) != 1 || got.TopCategories[0].Amount != 250_000 {
		t.Fatalf("expected calendar-month fallback to include only the July spend, got %+v", got.TopCategories)
	}
}

func TestDashboardGoalProgressPercentages(t *testing.T) {
	now := time.Date(2026, 7, 15, 12, 0, 0, 0, time.UTC)
	svc, _, accounts, _, _, _, _, goals := reportingFixture(now)
	ctx := context.Background()
	_, _ = accounts.Create(ctx, domain.FinancialAccount{ID: "a1", UserID: "u1", Spendable: true, InitialBalance: 1_000_000})

	_, _ = goals.Create(ctx, domain.SavingGoal{ID: "g50", UserID: "u1", TargetAmount: 1_000_000, Status: domain.GoalActive})
	_, _ = goals.Create(ctx, domain.SavingGoal{ID: "g100", UserID: "u1", TargetAmount: 1_000_000, Status: domain.GoalActive})
	_, _ = goals.Create(ctx, domain.SavingGoal{ID: "g120", UserID: "u1", TargetAmount: 1_000_000, Status: domain.GoalActive})
	goals.Contributions = append(goals.Contributions,
		domain.GoalContribution{GoalID: "g50", UserID: "u1", Amount: 500_000},
		domain.GoalContribution{GoalID: "g100", UserID: "u1", Amount: 1_000_000},
		domain.GoalContribution{GoalID: "g120", UserID: "u1", Amount: 1_200_000},
	)

	got, err := svc.Dashboard(ctx, domain.User{ID: "u1", Payday: 25}, now)
	if err != nil {
		t.Fatal(err)
	}
	byID := map[string]domain.GoalProgress{}
	for _, g := range got.Goals {
		byID[g.GoalID] = g
	}
	if byID["g50"].ProgressPercent != 50 {
		t.Fatalf("expected 50%%, got %d", byID["g50"].ProgressPercent)
	}
	if byID["g100"].ProgressPercent != 100 {
		t.Fatalf("expected 100%%, got %d", byID["g100"].ProgressPercent)
	}
	if byID["g120"].ProgressPercent != 120 {
		t.Fatalf("expected 120%% (overachieved), got %d", byID["g120"].ProgressPercent)
	}
}

func TestDashboardNoUpcomingBillIsNil(t *testing.T) {
	now := time.Date(2026, 7, 15, 12, 0, 0, 0, time.UTC)
	svc, _, accounts, _, _, _, _, _ := reportingFixture(now)
	ctx := context.Background()
	_, _ = accounts.Create(ctx, domain.FinancialAccount{ID: "a1", UserID: "u1", Spendable: true, InitialBalance: 1_000_000})

	got, err := svc.Dashboard(ctx, domain.User{ID: "u1", Payday: 25}, now)
	if err != nil {
		t.Fatal(err)
	}
	if got.UpcomingBill != nil {
		t.Fatalf("expected nil upcoming bill, got %+v", got.UpcomingBill)
	}
}

func TestDashboardMatchesPlanningServiceSafeToSpend(t *testing.T) {
	now := time.Date(2026, 7, 15, 12, 0, 0, 0, time.UTC)
	svc, planning, accounts, _, _, _, bills, goals := reportingFixture(now)
	ctx := context.Background()
	_, _ = accounts.Create(ctx, domain.FinancialAccount{ID: "a1", UserID: "u1", Spendable: true, InitialBalance: 5_000_000})
	bills.NextErr = domain.ErrNotFound
	bills.Upcoming = 1_000_000
	goals.Remaining = 500_000
	user := domain.User{ID: "u1", Payday: 25, MinimumBuffer: 250_000}

	want, err := planning.SafeToSpend(ctx, user, now)
	if err != nil {
		t.Fatal(err)
	}
	got, err := svc.Dashboard(ctx, user, now)
	if err != nil {
		t.Fatal(err)
	}
	if got.LiquidBalance != want.LiquidBalance {
		t.Fatalf("liquid balance mismatch: %d != %d", got.LiquidBalance, want.LiquidBalance)
	}
	if got.SafeToSpendToday != want.Daily {
		t.Fatalf("safe-to-spend today mismatch: %d != %d", got.SafeToSpendToday, want.Daily)
	}
	if got.SafeToSpendUntilPayday != want.UntilPayday {
		t.Fatalf("safe-to-spend until payday mismatch: %d != %d", got.SafeToSpendUntilPayday, want.UntilPayday)
	}
	if got.DaysUntilPayday != want.DaysRemaining {
		t.Fatalf("days until payday mismatch: %d != %d", got.DaysUntilPayday, want.DaysRemaining)
	}
}

func TestCashFlowDefaultsToCurrentMonth(t *testing.T) {
	now := time.Date(2026, 7, 15, 12, 0, 0, 0, time.UTC)
	svc, _, accounts, _, _, _, _, _ := reportingFixture(now)
	ctx := context.Background()
	_, _ = accounts.Create(ctx, domain.FinancialAccount{ID: "a1", UserID: "u1", Spendable: true})

	got, err := svc.CashFlow(ctx, domain.User{ID: "u1"}, application.CashFlowInput{})
	if err != nil {
		t.Fatal(err)
	}
	wantStart := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)
	wantEnd := time.Date(2026, 7, 31, 0, 0, 0, 0, time.UTC)
	if !got.Start.Equal(wantStart) || !got.End.Equal(wantEnd) {
		t.Fatalf("expected current-month default %v..%v, got %v..%v", wantStart, wantEnd, got.Start, got.End)
	}
	if got.GroupBy != "day" {
		t.Fatalf("expected default group_by=day, got %q", got.GroupBy)
	}
}

func TestCashFlowInvalidGroupByRejected(t *testing.T) {
	now := time.Date(2026, 7, 15, 12, 0, 0, 0, time.UTC)
	svc, _, accounts, _, _, _, _, _ := reportingFixture(now)
	ctx := context.Background()
	_, _ = accounts.Create(ctx, domain.FinancialAccount{ID: "a1", UserID: "u1", Spendable: true})

	_, err := svc.CashFlow(ctx, domain.User{ID: "u1"}, application.CashFlowInput{GroupBy: "month"})
	if !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestCashFlowEndBeforeStartRejected(t *testing.T) {
	now := time.Date(2026, 7, 15, 12, 0, 0, 0, time.UTC)
	svc, _, accounts, _, _, _, _, _ := reportingFixture(now)
	ctx := context.Background()
	_, _ = accounts.Create(ctx, domain.FinancialAccount{ID: "a1", UserID: "u1", Spendable: true})

	_, err := svc.CashFlow(ctx, domain.User{ID: "u1"}, application.CashFlowInput{
		Start: time.Date(2026, 7, 10, 0, 0, 0, 0, time.UTC),
		End:   time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC),
	})
	if !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}

func TestCashFlowTotalsAndTrendZeroFillsGaps(t *testing.T) {
	now := time.Date(2026, 7, 15, 12, 0, 0, 0, time.UTC)
	svc, _, accounts, categories, txs, _, _, _ := reportingFixture(now)
	ctx := context.Background()
	_, _ = accounts.Create(ctx, domain.FinancialAccount{ID: "a1", UserID: "u1", Spendable: true})
	expenseCategory(categories, "c1", "c1")
	_, _ = categories.Create(ctx, domain.Category{ID: "salary", Kind: domain.CategoryIncome, Name: "salary"})

	start := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 7, 7, 0, 0, 0, 0, time.UTC)
	txs.ByID["income1"] = domain.Transaction{ID: "income1", UserID: "u1", Type: domain.TransactionIncome, CategoryID: "salary", Amount: 2_000_000, OccurredAt: start}
	expenseTxn(txs, "expense1", "u1", "c1", 300_000, start)
	expenseTxn(txs, "expense2", "u1", "c1", 200_000, start.AddDate(0, 0, 4))

	got, err := svc.CashFlow(ctx, domain.User{ID: "u1"}, application.CashFlowInput{Start: start, End: end, GroupBy: "day"})
	if err != nil {
		t.Fatal(err)
	}
	if got.Income != 2_000_000 {
		t.Fatalf("expected income 2000000, got %d", got.Income)
	}
	if got.Expenses != 500_000 {
		t.Fatalf("expected expenses 500000, got %d", got.Expenses)
	}
	if got.NetCashFlow != 1_500_000 {
		t.Fatalf("expected net 1500000, got %d", got.NetCashFlow)
	}
	if len(got.Trend) != 7 {
		t.Fatalf("expected 7 daily buckets for a 7-day inclusive range, got %d", len(got.Trend))
	}
	var nonZero int
	for _, p := range got.Trend {
		if p.Income != 0 || p.Expenses != 0 {
			nonZero++
		}
	}
	if nonZero != 2 {
		t.Fatalf("expected exactly 2 non-zero buckets, got %d", nonZero)
	}
}

func TestCashFlowBudgetVsActualEmptyWithoutActiveBudget(t *testing.T) {
	now := time.Date(2026, 7, 15, 12, 0, 0, 0, time.UTC)
	svc, _, accounts, _, _, _, _, _ := reportingFixture(now)
	ctx := context.Background()
	_, _ = accounts.Create(ctx, domain.FinancialAccount{ID: "a1", UserID: "u1", Spendable: true})

	got, err := svc.CashFlow(ctx, domain.User{ID: "u1"}, application.CashFlowInput{})
	if err != nil {
		t.Fatal(err)
	}
	if len(got.BudgetVsActual) != 0 {
		t.Fatalf("expected empty budget-vs-actual without an active budget, got %+v", got.BudgetVsActual)
	}
}

func TestCashFlowVarianceSign(t *testing.T) {
	now := time.Date(2026, 7, 15, 12, 0, 0, 0, time.UTC)
	svc, _, accounts, categories, txs, budgets, _, _ := reportingFixture(now)
	ctx := context.Background()
	_, _ = accounts.Create(ctx, domain.FinancialAccount{ID: "a1", UserID: "u1", Spendable: true})
	expenseCategory(categories, "over", "over")
	expenseCategory(categories, "under", "under")
	budgets.ByID["b1"] = domain.BudgetPeriod{
		ID: "b1", UserID: "u1",
		StartDate: time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 7, 31, 0, 0, 0, 0, time.UTC),
		Status:    domain.BudgetActive,
		Allocations: []domain.BudgetAllocation{
			{CategoryID: "over", Amount: 100_000},
			{CategoryID: "under", Amount: 100_000},
		},
	}
	expenseTxn(txs, "t1", "u1", "over", 150_000, time.Date(2026, 7, 10, 0, 0, 0, 0, time.UTC))
	expenseTxn(txs, "t2", "u1", "under", 40_000, time.Date(2026, 7, 10, 0, 0, 0, 0, time.UTC))

	got, err := svc.CashFlow(ctx, domain.User{ID: "u1"}, application.CashFlowInput{})
	if err != nil {
		t.Fatal(err)
	}
	byID := map[string]domain.BudgetVsActualLine{}
	for _, l := range got.BudgetVsActual {
		byID[l.CategoryID] = l
	}
	if byID["over"].Variance != 50_000 {
		t.Fatalf("expected over-budget variance +50000, got %d", byID["over"].Variance)
	}
	if byID["under"].Variance != -60_000 {
		t.Fatalf("expected under-budget variance -60000, got %d", byID["under"].Variance)
	}
}

func TestExportIncludesAllSectionsAndConsent(t *testing.T) {
	now := time.Date(2026, 7, 15, 12, 0, 0, 0, time.UTC)
	svc, _, accounts, categories, txs, budgets, bills, goals := reportingFixture(now)
	ctx := context.Background()
	_, _ = accounts.Create(ctx, domain.FinancialAccount{ID: "a1", UserID: "u1", Spendable: true})
	expenseCategory(categories, "c1", "c1")
	expenseTxn(txs, "t1", "u1", "c1", 100_000, now)
	expenseTxn(txs, "t2", "u1", "c1", 200_000, now)
	budgets.ByID["draft"] = domain.BudgetPeriod{ID: "draft", UserID: "u1", Status: domain.BudgetDraft}
	budgets.ByID["closed"] = domain.BudgetPeriod{ID: "closed", UserID: "u1", Status: domain.BudgetClosed}
	bills.Items = append(bills.Items, domain.RecurringBill{ID: "bill1", UserID: "u1", Active: false})
	_, _ = goals.Create(ctx, domain.SavingGoal{ID: "g1", UserID: "u1", Status: domain.GoalArchived})

	user := domain.User{ID: "u1", Email: "user@example.com", AIConsent: true}
	got, err := svc.Export(ctx, user)
	if err != nil {
		t.Fatal(err)
	}
	if !got.Profile.AIConsent {
		t.Fatal("expected exported profile to carry consent metadata")
	}
	if len(got.Accounts) != 1 {
		t.Fatalf("expected 1 account, got %d", len(got.Accounts))
	}
	if len(got.Categories) != 1 {
		t.Fatalf("expected 1 category, got %d", len(got.Categories))
	}
	if len(got.Transactions) != 2 {
		t.Fatalf("expected 2 transactions, got %d", len(got.Transactions))
	}
	if len(got.Budgets) != 2 {
		t.Fatalf("expected 2 budgets (draft+closed), got %d", len(got.Budgets))
	}
	if len(got.Bills) != 1 {
		t.Fatalf("expected 1 bill (including inactive), got %d", len(got.Bills))
	}
	if len(got.Goals) != 1 {
		t.Fatalf("expected 1 goal (including archived), got %d", len(got.Goals))
	}
	if got.GeneratedAt.IsZero() {
		t.Fatal("expected GeneratedAt to be set")
	}
}
