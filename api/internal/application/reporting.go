package application

import (
	"context"
	"errors"
	"sort"
	"time"

	"github.com/sakuplan/api/internal/domain"
	"github.com/sakuplan/api/internal/ports"
)

type ReportingService struct {
	accounts     domain.AccountRepository
	budgets      domain.BudgetRepository
	bills        domain.BillRepository
	goals        domain.GoalRepository
	categories   domain.CategoryRepository
	transactions domain.TransactionRepository
	planning     *PlanningService
	clock        ports.Clock
}

func NewReportingService(accounts domain.AccountRepository, budgets domain.BudgetRepository, bills domain.BillRepository, goals domain.GoalRepository, categories domain.CategoryRepository, transactions domain.TransactionRepository, planning *PlanningService, clock ports.Clock) *ReportingService {
	return &ReportingService{accounts: accounts, budgets: budgets, bills: bills, goals: goals, categories: categories, transactions: transactions, planning: planning, clock: clock}
}

func (s *ReportingService) Dashboard(ctx context.Context, user domain.User, at time.Time) (domain.Dashboard, error) {
	if at.IsZero() {
		at = s.clock.Now()
	}
	if user.Timezone != "" {
		location, err := time.LoadLocation(user.Timezone)
		if err != nil {
			return domain.Dashboard{}, domain.ErrInvalidInput
		}
		at = at.In(location)
	}

	sts, err := s.planning.SafeToSpend(ctx, user, at)
	if err != nil {
		return domain.Dashboard{}, err
	}

	windowStart, windowEnd := monthBounds(at)
	allocated := map[string]bool{}
	var budgetTotal domain.Money
	active, err := s.budgets.GetActive(ctx, user.ID, at)
	switch {
	case err == nil:
		windowStart, windowEnd = active.StartDate, active.EndDate
		amounts := make([]domain.Money, 0, len(active.Allocations))
		for _, alloc := range active.Allocations {
			amounts = append(amounts, alloc.Amount)
			allocated[alloc.CategoryID] = true
		}
		var ok bool
		budgetTotal, ok = addNonNegativeMoney(amounts...)
		if !ok {
			return domain.Dashboard{}, domain.ErrInvalidInput
		}
	case errors.Is(err, domain.ErrNotFound):
		// no active budget: report against the calendar month with nothing allocated
	default:
		return domain.Dashboard{}, err
	}

	spent, err := s.transactions.SpentByCategory(ctx, user.ID, windowStart, windowEnd.AddDate(0, 0, 1))
	if err != nil {
		return domain.Dashboard{}, err
	}
	var budgetUsed domain.Money
	for categoryID := range allocated {
		budgetUsed += spent[categoryID]
	}

	categories, err := s.categories.List(ctx, user.ID, "", true)
	if err != nil {
		return domain.Dashboard{}, err
	}
	names := make(map[string]string, len(categories))
	for _, c := range categories {
		names[c.ID] = c.Name
	}
	topCategories := topSpendCategories(spent, names, 5)

	var upcomingBill *domain.UpcomingBill
	bill, due, err := s.bills.NextDue(ctx, user.ID, at, at.AddDate(1, 0, 0))
	switch {
	case err == nil:
		upcomingBill = &domain.UpcomingBill{BillID: bill.ID, Name: bill.Name, Amount: bill.Amount, DueDate: due}
	case errors.Is(err, domain.ErrNotFound):
		// no bill due within the lookahead window
	default:
		return domain.Dashboard{}, err
	}

	activeGoals, err := s.goals.List(ctx, user.ID, true)
	if err != nil {
		return domain.Dashboard{}, err
	}
	goalProgress := make([]domain.GoalProgress, 0, len(activeGoals))
	for _, g := range activeGoals {
		contributed, err := s.goals.ContributedTotal(ctx, user.ID, g.ID)
		if err != nil {
			return domain.Dashboard{}, err
		}
		goalProgress = append(goalProgress, domain.GoalProgress{
			GoalID:          g.ID,
			Name:            g.Name,
			TargetAmount:    g.TargetAmount,
			Contributed:     contributed,
			ProgressPercent: int64(proportionalMoney(contributed, 100, int64(g.TargetAmount))),
		})
	}
	sort.Slice(goalProgress, func(i, j int) bool { return goalProgress[i].GoalID < goalProgress[j].GoalID })

	return domain.Dashboard{
		LiquidBalance:          sts.LiquidBalance,
		SafeToSpendToday:       sts.Daily,
		SafeToSpendUntilPayday: sts.UntilPayday,
		DaysUntilPayday:        sts.DaysRemaining,
		BudgetTotal:            budgetTotal,
		BudgetUsed:             budgetUsed,
		BudgetRemaining:        budgetTotal - budgetUsed,
		UpcomingBill:           upcomingBill,
		Goals:                  goalProgress,
		TopCategories:          topCategories,
	}, nil
}

type CashFlowInput struct {
	Start   time.Time
	End     time.Time
	GroupBy string
}

func (s *ReportingService) CashFlow(ctx context.Context, user domain.User, in CashFlowInput) (domain.CashFlowReport, error) {
	now := s.clock.Now()
	if user.Timezone != "" {
		location, err := time.LoadLocation(user.Timezone)
		if err != nil {
			return domain.CashFlowReport{}, domain.ErrInvalidInput
		}
		now = now.In(location)
	}

	groupBy := in.GroupBy
	if groupBy == "" {
		groupBy = "day"
	}
	if groupBy != "day" && groupBy != "week" {
		return domain.CashFlowReport{}, domain.ErrInvalidInput
	}

	start, end := in.Start, in.End
	if start.IsZero() || end.IsZero() {
		start, end = monthBounds(now)
	}
	start, end = startOfDay(start), startOfDay(end)
	if err := domain.ValidateDateRange(start, end); err != nil {
		return domain.CashFlowReport{}, err
	}
	queryEnd := end.AddDate(0, 0, 1)

	spent, err := s.transactions.SpentByCategory(ctx, user.ID, start, queryEnd)
	if err != nil {
		return domain.CashFlowReport{}, err
	}
	categories, err := s.categories.List(ctx, user.ID, "", true)
	if err != nil {
		return domain.CashFlowReport{}, err
	}
	names := make(map[string]string, len(categories))
	for _, c := range categories {
		names[c.ID] = c.Name
	}
	categoryBreakdown := topSpendCategories(spent, names, len(spent))

	income, expenses, err := s.transactions.CashFlowTotals(ctx, user.ID, start, queryEnd)
	if err != nil {
		return domain.CashFlowReport{}, err
	}

	budgetVsActual := []domain.BudgetVsActualLine{}
	active, err := s.budgets.GetActive(ctx, user.ID, start)
	switch {
	case err == nil:
		for _, alloc := range active.Allocations {
			actual := spent[alloc.CategoryID]
			budgetVsActual = append(budgetVsActual, domain.BudgetVsActualLine{
				CategoryID: alloc.CategoryID,
				Name:       names[alloc.CategoryID],
				Budgeted:   alloc.Amount,
				Actual:     actual,
				Variance:   actual - alloc.Amount,
			})
		}
	case errors.Is(err, domain.ErrNotFound):
		// no active budget: nothing to compare against
	default:
		return domain.CashFlowReport{}, err
	}

	raw, err := s.transactions.CashFlowTrend(ctx, user.ID, start, queryEnd, groupBy)
	if err != nil {
		return domain.CashFlowReport{}, err
	}

	return domain.CashFlowReport{
		Start:             start,
		End:               end,
		GroupBy:           groupBy,
		Income:            income,
		Expenses:          expenses,
		NetCashFlow:       income - expenses,
		CategoryBreakdown: categoryBreakdown,
		BudgetVsActual:    budgetVsActual,
		Trend:             buildTrend(raw, start, end, groupBy),
	}, nil
}

func (s *ReportingService) Export(ctx context.Context, user domain.User) (domain.Export, error) {
	accounts, err := s.accounts.List(ctx, user.ID, true)
	if err != nil {
		return domain.Export{}, err
	}
	categories, err := s.categories.List(ctx, user.ID, "", true)
	if err != nil {
		return domain.Export{}, err
	}

	transactions := []domain.Transaction{}
	cursor := ""
	for {
		var page []domain.Transaction
		var next string
		page, next, err = s.transactions.List(ctx, user.ID, domain.Page{Cursor: cursor, Limit: 200})
		if err != nil {
			return domain.Export{}, err
		}
		transactions = append(transactions, page...)
		if next == "" {
			break
		}
		cursor = next
	}

	budgets, err := s.budgets.List(ctx, user.ID)
	if err != nil {
		return domain.Export{}, err
	}
	bills, err := s.bills.List(ctx, user.ID, false)
	if err != nil {
		return domain.Export{}, err
	}
	goals, err := s.goals.List(ctx, user.ID, false)
	if err != nil {
		return domain.Export{}, err
	}

	return domain.Export{
		GeneratedAt:  s.clock.Now(),
		Profile:      user,
		Accounts:     accounts,
		Categories:   categories,
		Transactions: transactions,
		Budgets:      budgets,
		Bills:        bills,
		Goals:        goals,
	}, nil
}

func monthBounds(at time.Time) (time.Time, time.Time) {
	start := time.Date(at.Year(), at.Month(), 1, 0, 0, 0, 0, at.Location())
	end := start.AddDate(0, 1, -1)
	return start, end
}

func topSpendCategories(spent map[string]domain.Money, names map[string]string, limit int) []domain.CategorySpend {
	out := make([]domain.CategorySpend, 0, len(spent))
	for categoryID, amount := range spent {
		out = append(out, domain.CategorySpend{CategoryID: categoryID, Name: names[categoryID], Amount: amount})
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Amount != out[j].Amount {
			return out[i].Amount > out[j].Amount
		}
		return out[i].CategoryID < out[j].CategoryID
	})
	if limit >= 0 && len(out) > limit {
		out = out[:limit]
	}
	return out
}

func trendBucketStart(t time.Time, groupBy string) time.Time {
	if groupBy != "week" {
		return t
	}
	offset := (int(t.Weekday()) + 6) % 7
	return t.AddDate(0, 0, -offset)
}

func buildTrend(raw []domain.TrendPoint, start, end time.Time, groupBy string) []domain.CashFlowTrendPoint {
	byBucket := make(map[int64]domain.TrendPoint, len(raw))
	for _, p := range raw {
		byBucket[p.BucketStart.UTC().Unix()] = p
	}
	step := 1
	if groupBy == "week" {
		step = 7
	}
	out := []domain.CashFlowTrendPoint{}
	for cursor := trendBucketStart(start, groupBy); !cursor.After(end); cursor = cursor.AddDate(0, 0, step) {
		p := byBucket[cursor.UTC().Unix()]
		out = append(out, domain.CashFlowTrendPoint{BucketStart: cursor, Income: p.Income, Expenses: p.Expenses, Net: p.Income - p.Expenses})
	}
	return out
}
