package application

import (
	"context"
	"errors"
	"sort"
	"time"

	"github.com/sakuplan/api/internal/domain"
	"github.com/sakuplan/api/internal/ports"
)

type PlanningService struct {
	accounts domain.AccountRepository
	budgets  domain.BudgetRepository
	bills    domain.BillRepository
	goals    domain.GoalRepository
	clock    ports.Clock
}

func NewPlanningService(accounts domain.AccountRepository, budgets domain.BudgetRepository, bills domain.BillRepository, goals domain.GoalRepository, clock ports.Clock) *PlanningService {
	return &PlanningService{accounts: accounts, budgets: budgets, bills: bills, goals: goals, clock: clock}
}

func (s *PlanningService) SafeToSpend(ctx context.Context, user domain.User, at time.Time) (domain.SafeToSpend, error) {
	if at.IsZero() {
		at = s.clock.Now()
	}
	if user.Timezone != "" {
		location, err := time.LoadLocation(user.Timezone)
		if err != nil {
			return domain.SafeToSpend{}, domain.ErrInvalidInput
		}
		at = at.In(location)
	}
	payday := nextPayday(at, user.Payday)
	liquid, err := s.accounts.LiquidBalance(ctx, user.ID)
	if err != nil {
		return domain.SafeToSpend{}, err
	}
	upcoming, err := s.bills.UpcomingTotal(ctx, user.ID, at, payday)
	if err != nil {
		return domain.SafeToSpend{}, err
	}
	remainingSavings, err := s.goals.RemainingMonthlyCommitment(ctx, user.ID, at)
	if err != nil {
		return domain.SafeToSpend{}, err
	}
	buffer := user.MinimumBuffer
	if active, err := s.budgets.GetActive(ctx, user.ID, at); err == nil {
		if active.MinimumBuffer > buffer {
			buffer = active.MinimumBuffer
		}
		if active.SavingsCommitment > remainingSavings {
			remainingSavings = active.SavingsCommitment
		}
	} else if !errors.Is(err, domain.ErrNotFound) {
		return domain.SafeToSpend{}, err
	}
	until := liquid - upcoming - remainingSavings - buffer
	days := int(payday.Sub(startOfDay(at)).Hours()/24) + 1
	if days < 1 {
		days = 1
	}
	daily := until / domain.Money(days)
	risk := "healthy"
	if until < 0 {
		risk = "high"
	} else if daily == 0 {
		risk = "attention"
	}
	return domain.SafeToSpend{LiquidBalance: liquid, UpcomingBills: upcoming, RemainingSavingsCommitment: remainingSavings, MinimumBuffer: buffer, UntilPayday: until, Daily: daily, DaysRemaining: days, RiskLevel: risk}, nil
}

func nextPayday(at time.Time, day int) time.Time {
	if day < 1 || day > 31 {
		day = 25
	}
	loc := at.Location()
	candidate := dateWithClampedDay(at.Year(), at.Month(), day, loc)
	if !candidate.After(startOfDay(at)) {
		next := at.AddDate(0, 1, 0)
		candidate = dateWithClampedDay(next.Year(), next.Month(), day, loc)
	}
	return candidate
}
func dateWithClampedDay(year int, month time.Month, day int, loc *time.Location) time.Time {
	last := time.Date(year, month+1, 0, 0, 0, 0, 0, loc).Day()
	if day > last {
		day = last
	}
	return time.Date(year, month, day, 0, 0, 0, 0, loc)
}
func startOfDay(t time.Time) time.Time {
	y, m, d := t.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, t.Location())
}

type RecommendationService struct{}

func NewRecommendationService() *RecommendationService { return &RecommendationService{} }
func (s *RecommendationService) Generate(in domain.RecommendationInput) (domain.Recommendation, error) {
	if in.ExpectedIncome <= 0 || in.FixedBills < 0 || in.DebtPayments < 0 || in.RequestedSavings < 0 || in.MinimumBuffer < 0 || in.Dependants < 0 {
		return domain.Recommendation{}, domain.ErrInvalidInput
	}
	mandatory, ok := addNonNegativeMoney(in.FixedBills, in.DebtPayments, in.MinimumBuffer)
	if !ok {
		return domain.Recommendation{}, domain.ErrInvalidInput
	}
	available := in.ExpectedIncome - mandatory
	if available < 0 {
		return domain.Recommendation{Mode: in.Mode, MinimumBuffer: in.MinimumBuffer, Unallocated: available, Warnings: []string{"MANDATORY_OBLIGATIONS_EXCEED_INCOME"}, ReasonCodes: []string{"PROTECT_MANDATORY_OBLIGATIONS"}}, nil
	}
	savingsRate := int64(20)
	switch in.Mode {
	case domain.RecommendationConservative:
		savingsRate = 30
	case domain.RecommendationFlexible:
		savingsRate = 10
	case domain.RecommendationBalanced, "":
		in.Mode = domain.RecommendationBalanced
	default:
		return domain.Recommendation{}, domain.ErrInvalidInput
	}
	savings := proportionalMoney(available, savingsRate, 100)
	if in.RequestedSavings > savings {
		savings = in.RequestedSavings
	}
	if savings > available {
		savings = available
	}
	spendable := available - savings
	allocs := map[string]domain.Money{}
	lockedTotal := domain.Money(0)
	for key, value := range in.LockedAllocations {
		if key == "" || value < 0 {
			return domain.Recommendation{}, domain.ErrInvalidInput
		}
		next, valid := addNonNegativeMoney(lockedTotal, value)
		if !valid {
			return domain.Recommendation{}, domain.ErrInvalidInput
		}
		allocs[key] = value
		lockedTotal = next
	}
	if lockedTotal > spendable {
		return domain.Recommendation{}, domain.ErrBudgetOverallocated
	}
	remaining := spendable - lockedTotal
	weights := in.CategoryWeights
	if len(weights) == 0 {
		weights = map[string]int{"food": 40, "transport": 20, "household": 20, "health": 10, "lifestyle": 10}
	}
	unlockedKeys := make([]string, 0, len(weights))
	var totalWeight int64
	for key, weight := range weights {
		if key == "" || weight < 0 || weight > 10_000 {
			return domain.Recommendation{}, domain.ErrInvalidInput
		}
		if weight == 0 {
			continue
		}
		if _, locked := allocs[key]; locked {
			continue
		}
		if totalWeight > 1_000_000-int64(weight) {
			return domain.Recommendation{}, domain.ErrInvalidInput
		}
		unlockedKeys = append(unlockedKeys, key)
		totalWeight += int64(weight)
	}
	sort.Strings(unlockedKeys)
	allocated := domain.Money(0)
	for i, k := range unlockedKeys {
		amount := domain.Money(0)
		if totalWeight > 0 {
			amount = proportionalMoney(remaining, int64(weights[k]), totalWeight)
		}
		if i == len(unlockedKeys)-1 {
			amount = remaining - allocated
		}
		allocs[k] = amount
		allocated += amount
	}
	return domain.Recommendation{Mode: in.Mode, SavingsCommitment: savings, MinimumBuffer: in.MinimumBuffer, Allocations: allocs, Unallocated: spendable - lockedTotal - allocated, ReasonCodes: []string{"MODE_BASED_SAVINGS_RATE", "PROTECT_FIXED_BILLS", "PROTECT_MINIMUM_BUFFER"}}, nil
}
