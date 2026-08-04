package testkit

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/sakuplan/api/internal/domain"
	"github.com/sakuplan/api/internal/ports"
)

type Clock struct{ Time time.Time }

func (c Clock) Now() time.Time { return c.Time }

type IDs struct {
	mu sync.Mutex
	N  int
}

func (g *IDs) New() string {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.N++
	return fmt.Sprintf("id-%03d", g.N)
}

type UOW struct{}

func (UOW) WithinTransaction(ctx context.Context, fn func(context.Context) error) error {
	return fn(ctx)
}

type Hasher struct{}

func (Hasher) Hash(p string) (string, error) { return "hash:" + p, nil }
func (Hasher) Verify(h, p string) error {
	if h != "hash:"+p {
		return errors.New("mismatch")
	}
	return nil
}

type Access struct{}

func (Access) Issue(id string, role domain.UserRole, now time.Time) (string, time.Time, error) {
	return "access:" + id, now.Add(15 * time.Minute), nil
}
func (Access) Parse(token string, now time.Time) (ports.AccessClaims, error) {
	return ports.AccessClaims{}, nil
}

type Refresh struct{ N int }

func (r *Refresh) Generate() (string, string, error) {
	r.N++
	p := fmt.Sprintf("refresh-%d", r.N)
	return p, r.Hash(p), nil
}
func (r *Refresh) Hash(p string) string {
	h := sha256.Sum256([]byte(p))
	return hex.EncodeToString(h[:])
}

type Users struct {
	mu   sync.Mutex
	ByID map[string]domain.User
}

func NewUsers() *Users { return &Users{ByID: map[string]domain.User{}} }
func (r *Users) Create(_ context.Context, u domain.User) (domain.User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, v := range r.ByID {
		if v.Email == u.Email {
			return domain.User{}, domain.ErrConflict
		}
	}
	r.ByID[u.ID] = u
	return u, nil
}
func (r *Users) GetByID(_ context.Context, id string) (domain.User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	u, ok := r.ByID[id]
	if !ok {
		return domain.User{}, domain.ErrNotFound
	}
	return u, nil
}
func (r *Users) GetByEmail(_ context.Context, email string) (domain.User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, u := range r.ByID {
		if u.Email == email {
			return u, nil
		}
	}
	return domain.User{}, domain.ErrNotFound
}
func (r *Users) UpdateProfile(_ context.Context, u domain.User) (domain.User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.ByID[u.ID] = u
	return u, nil
}

type Sessions struct {
	mu   sync.Mutex
	ByID map[string]domain.RefreshSession
}

func NewSessions() *Sessions { return &Sessions{ByID: map[string]domain.RefreshSession{}} }
func (r *Sessions) Create(_ context.Context, s domain.RefreshSession) (domain.RefreshSession, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.ByID[s.ID] = s
	return s, nil
}
func (r *Sessions) GetByTokenHash(_ context.Context, h string) (domain.RefreshSession, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, s := range r.ByID {
		if s.TokenHash == h {
			return s, nil
		}
	}
	return domain.RefreshSession{}, domain.ErrNotFound
}
func (r *Sessions) Rotate(_ context.Context, id string, n domain.RefreshSession, at time.Time) (domain.RefreshSession, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	s, ok := r.ByID[id]
	if !ok {
		return domain.RefreshSession{}, domain.ErrNotFound
	}
	s.RevokedAt = &at
	s.ReplacedByID = n.ID
	r.ByID[id] = s
	r.ByID[n.ID] = n
	return n, nil
}
func (r *Sessions) Revoke(_ context.Context, id string, at time.Time) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	s, ok := r.ByID[id]
	if !ok {
		return nil
	}
	s.RevokedAt = &at
	r.ByID[id] = s
	return nil
}
func (r *Sessions) RevokeFamily(_ context.Context, f string, at time.Time) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for id, s := range r.ByID {
		if s.FamilyID == f {
			s.RevokedAt = &at
			r.ByID[id] = s
		}
	}
	return nil
}
func (r *Sessions) RevokeAllForUser(_ context.Context, u string, at time.Time) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for id, s := range r.ByID {
		if s.UserID == u {
			s.RevokedAt = &at
			r.ByID[id] = s
		}
	}
	return nil
}

type Accounts struct {
	mu       sync.Mutex
	ByID     map[string]domain.FinancialAccount
	Balances map[string]domain.Money
}

func NewAccounts() *Accounts {
	return &Accounts{ByID: map[string]domain.FinancialAccount{}, Balances: map[string]domain.Money{}}
}
func (r *Accounts) Create(_ context.Context, a domain.FinancialAccount) (domain.FinancialAccount, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.ByID[a.ID] = a
	r.Balances[a.ID] = a.InitialBalance
	return a, nil
}
func (r *Accounts) Get(_ context.Context, u, id string) (domain.FinancialAccount, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	a, ok := r.ByID[id]
	if !ok || a.UserID != u {
		return domain.FinancialAccount{}, domain.ErrNotFound
	}
	return a, nil
}
func (r *Accounts) List(_ context.Context, u string, arch bool) ([]domain.FinancialAccount, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := []domain.FinancialAccount{}
	for _, a := range r.ByID {
		if a.UserID == u && (arch || a.ArchivedAt == nil) {
			out = append(out, a)
		}
	}
	return out, nil
}
func (r *Accounts) Update(_ context.Context, a domain.FinancialAccount) (domain.FinancialAccount, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.ByID[a.ID] = a
	return a, nil
}
func (r *Accounts) Archive(_ context.Context, u, id string, at time.Time) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	a, ok := r.ByID[id]
	if !ok || a.UserID != u {
		return domain.ErrNotFound
	}
	a.ArchivedAt = &at
	r.ByID[id] = a
	return nil
}
func (r *Accounts) Balance(_ context.Context, u, id string) (domain.Money, error) {
	a, err := r.Get(context.Background(), u, id)
	if err != nil {
		return 0, err
	}
	return r.Balances[a.ID], nil
}
func (r *Accounts) LiquidBalance(_ context.Context, u string) (domain.Money, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	var t domain.Money
	for id, a := range r.ByID {
		if a.UserID == u && a.Spendable && a.ArchivedAt == nil {
			t += r.Balances[id]
		}
	}
	return t, nil
}

type Categories struct{ ByID map[string]domain.Category }

func NewCategories() *Categories { return &Categories{ByID: map[string]domain.Category{}} }
func (r *Categories) Create(_ context.Context, c domain.Category) (domain.Category, error) {
	r.ByID[c.ID] = c
	return c, nil
}
func (r *Categories) Get(_ context.Context, u, id string) (domain.Category, error) {
	c, ok := r.ByID[id]
	if !ok || (c.UserID != "" && c.UserID != u) {
		return domain.Category{}, domain.ErrNotFound
	}
	return c, nil
}
func (r *Categories) List(_ context.Context, u string, k domain.CategoryKind, a bool) ([]domain.Category, error) {
	out := []domain.Category{}
	for _, c := range r.ByID {
		if (c.UserID == "" || c.UserID == u) && (k == "" || c.Kind == k) && (a || c.ArchivedAt == nil) {
			out = append(out, c)
		}
	}
	return out, nil
}
func (r *Categories) Update(_ context.Context, c domain.Category) (domain.Category, error) {
	r.ByID[c.ID] = c
	return c, nil
}
func (r *Categories) Archive(_ context.Context, u, id string, at time.Time) error {
	c, err := r.Get(context.Background(), u, id)
	if err != nil {
		return err
	}
	c.ArchivedAt = &at
	r.ByID[id] = c
	return nil
}

type Transactions struct {
	ByID     map[string]domain.Transaction
	ByKey    map[string]string
	Accounts *Accounts
}

func NewTransactions(a *Accounts) *Transactions {
	return &Transactions{ByID: map[string]domain.Transaction{}, ByKey: map[string]string{}, Accounts: a}
}
func (r *Transactions) Create(_ context.Context, t domain.Transaction) (domain.Transaction, error) {
	k := t.UserID + ":" + t.IdempotencyOperation + ":" + t.IdempotencyKey
	if id, ok := r.ByKey[k]; ok {
		return r.ByID[id], domain.ErrConflict
	}
	r.ByID[t.ID] = t
	r.ByKey[k] = t.ID
	if r.Accounts != nil {
		for _, e := range t.Entries {
			if e.Direction == domain.EntryCredit {
				r.Accounts.Balances[e.AccountID] += e.Amount
			} else {
				r.Accounts.Balances[e.AccountID] -= e.Amount
			}
		}
	}
	return t, nil
}
func (r *Transactions) Reverse(ctx context.Context, originalID string, reversal domain.Transaction) (domain.Transaction, error) {
	original, ok := r.ByID[originalID]
	if !ok || original.UserID != reversal.UserID {
		return domain.Transaction{}, domain.ErrNotFound
	}
	if original.ReversedByID != "" || original.Type == domain.TransactionReversal {
		return domain.Transaction{}, domain.ErrConflict
	}
	created, err := r.Create(ctx, reversal)
	if err != nil {
		return domain.Transaction{}, err
	}
	original.ReversedByID = created.ID
	r.ByID[originalID] = original
	return created, nil
}
func (r *Transactions) Get(_ context.Context, u, id string) (domain.Transaction, error) {
	t, ok := r.ByID[id]
	if !ok || t.UserID != u {
		return domain.Transaction{}, domain.ErrNotFound
	}
	return t, nil
}
func (r *Transactions) GetByIdempotency(_ context.Context, u, op, key string) (domain.Transaction, error) {
	for _, t := range r.ByID {
		if t.UserID == u && t.IdempotencyOperation == op && t.IdempotencyKey == key {
			return t, nil
		}
	}
	return domain.Transaction{}, domain.ErrNotFound
}
func (r *Transactions) List(_ context.Context, u string, p domain.Page) ([]domain.Transaction, string, error) {
	out := []domain.Transaction{}
	for _, t := range r.ByID {
		if t.UserID == u {
			out = append(out, t)
		}
	}
	return out, "", nil
}
func (r *Transactions) SpentByCategory(_ context.Context, u string, s, e time.Time) (map[string]domain.Money, error) {
	out := map[string]domain.Money{}
	for _, t := range r.ByID {
		if t.UserID == u && t.Type == domain.TransactionExpense && t.ReversedByID == "" && !t.OccurredAt.Before(s) && t.OccurredAt.Before(e) {
			out[t.CategoryID] += t.Amount
		}
	}
	return out, nil
}
func (r *Transactions) CashFlowTotals(_ context.Context, u string, s, e time.Time) (domain.Money, domain.Money, error) {
	var income, expenses domain.Money
	for _, t := range r.ByID {
		if t.UserID != u || t.ReversedByID != "" || t.OccurredAt.Before(s) || !t.OccurredAt.Before(e) {
			continue
		}
		switch t.Type {
		case domain.TransactionIncome:
			income += t.Amount
		case domain.TransactionExpense:
			expenses += t.Amount
		}
	}
	return income, expenses, nil
}
func (r *Transactions) CashFlowTrend(_ context.Context, u string, s, e time.Time, groupBy string) ([]domain.TrendPoint, error) {
	buckets := map[time.Time]domain.TrendPoint{}
	for _, t := range r.ByID {
		if t.UserID != u || t.ReversedByID != "" || t.OccurredAt.Before(s) || !t.OccurredAt.Before(e) {
			continue
		}
		if t.Type != domain.TransactionIncome && t.Type != domain.TransactionExpense {
			continue
		}
		bucket := trendBucket(t.OccurredAt, groupBy)
		p := buckets[bucket]
		p.BucketStart = bucket
		switch t.Type {
		case domain.TransactionIncome:
			p.Income += t.Amount
		case domain.TransactionExpense:
			p.Expenses += t.Amount
		}
		buckets[bucket] = p
	}
	out := make([]domain.TrendPoint, 0, len(buckets))
	for _, p := range buckets {
		out = append(out, p)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].BucketStart.Before(out[j].BucketStart) })
	return out, nil
}
func trendBucket(t time.Time, groupBy string) time.Time {
	y, m, d := t.Date()
	day := time.Date(y, m, d, 0, 0, 0, 0, t.Location())
	if groupBy != "week" {
		return day
	}
	offset := (int(day.Weekday()) + 6) % 7
	return day.AddDate(0, 0, -offset)
}

type Budgets struct {
	ByID map[string]domain.BudgetPeriod
}

func NewBudgets() *Budgets { return &Budgets{ByID: map[string]domain.BudgetPeriod{}} }
func (r *Budgets) Create(_ context.Context, b domain.BudgetPeriod) (domain.BudgetPeriod, error) {
	r.ByID[b.ID] = b
	return b, nil
}
func (r *Budgets) Get(_ context.Context, u, id string) (domain.BudgetPeriod, error) {
	b, ok := r.ByID[id]
	if !ok || b.UserID != u {
		return domain.BudgetPeriod{}, domain.ErrNotFound
	}
	return b, nil
}
func (r *Budgets) GetActive(_ context.Context, u string, at time.Time) (domain.BudgetPeriod, error) {
	for _, b := range r.ByID {
		if b.UserID == u && b.Status == domain.BudgetActive && !at.Before(b.StartDate) && !at.After(b.EndDate) {
			return b, nil
		}
	}
	return domain.BudgetPeriod{}, domain.ErrNotFound
}
func (r *Budgets) Activate(_ context.Context, u, id string, at time.Time) (domain.BudgetPeriod, error) {
	b, err := r.Get(context.Background(), u, id)
	if err != nil {
		return b, err
	}
	b.Status = domain.BudgetActive
	b.UpdatedAt = at
	r.ByID[id] = b
	return b, nil
}
func (r *Budgets) ReplaceAllocations(_ context.Context, u, id string, a []domain.BudgetAllocation, at time.Time) (domain.BudgetPeriod, error) {
	b, err := r.Get(context.Background(), u, id)
	if err != nil {
		return b, err
	}
	b.Allocations = a
	b.UpdatedAt = at
	r.ByID[id] = b
	return b, nil
}
func (r *Budgets) List(_ context.Context, u string) ([]domain.BudgetPeriod, error) {
	out := []domain.BudgetPeriod{}
	for _, b := range r.ByID {
		if b.UserID == u {
			out = append(out, b)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].StartDate.After(out[j].StartDate) })
	return out, nil
}

type Bills struct {
	Items    []domain.RecurringBill
	Upcoming domain.Money
	Next     domain.RecurringBill
	NextDate time.Time
	NextErr  error
}

func (r *Bills) Create(_ context.Context, b domain.RecurringBill) (domain.RecurringBill, error) {
	r.Items = append(r.Items, b)
	return b, nil
}
func (r *Bills) Get(_ context.Context, u, id string) (domain.RecurringBill, error) {
	for _, b := range r.Items {
		if b.UserID == u && b.ID == id {
			return b, nil
		}
	}
	return domain.RecurringBill{}, domain.ErrNotFound
}
func (r *Bills) List(_ context.Context, u string, a bool) ([]domain.RecurringBill, error) {
	out := []domain.RecurringBill{}
	for _, b := range r.Items {
		if b.UserID == u && (!a || b.Active) {
			out = append(out, b)
		}
	}
	return out, nil
}
func (r *Bills) Update(_ context.Context, b domain.RecurringBill) (domain.RecurringBill, error) {
	return b, nil
}
func (r *Bills) UpcomingTotal(_ context.Context, u string, f, t time.Time) (domain.Money, error) {
	return r.Upcoming, nil
}
func (r *Bills) NextDue(_ context.Context, u string, f, t time.Time) (domain.RecurringBill, time.Time, error) {
	if r.NextErr != nil {
		return domain.RecurringBill{}, time.Time{}, r.NextErr
	}
	return r.Next, r.NextDate, nil
}

type Goals struct {
	Items         map[string]domain.SavingGoal
	Contributions []domain.GoalContribution
	Remaining     domain.Money
}

func NewGoals() *Goals { return &Goals{Items: map[string]domain.SavingGoal{}} }
func (r *Goals) Create(_ context.Context, g domain.SavingGoal) (domain.SavingGoal, error) {
	r.Items[g.ID] = g
	return g, nil
}
func (r *Goals) Get(_ context.Context, u, id string) (domain.SavingGoal, error) {
	g, ok := r.Items[id]
	if !ok || g.UserID != u {
		return domain.SavingGoal{}, domain.ErrNotFound
	}
	return g, nil
}
func (r *Goals) List(_ context.Context, u string, a bool) ([]domain.SavingGoal, error) {
	out := []domain.SavingGoal{}
	for _, g := range r.Items {
		if g.UserID == u && (!a || g.Status == domain.GoalActive) {
			out = append(out, g)
		}
	}
	return out, nil
}
func (r *Goals) Update(_ context.Context, g domain.SavingGoal) (domain.SavingGoal, error) {
	r.Items[g.ID] = g
	return g, nil
}
func (r *Goals) AddContribution(_ context.Context, c domain.GoalContribution) (domain.GoalContribution, error) {
	r.Contributions = append(r.Contributions, c)
	return c, nil
}
func (r *Goals) GetContributionByTransactionID(_ context.Context, userID, transactionID string) (domain.GoalContribution, error) {
	for _, c := range r.Contributions {
		if c.UserID == userID && c.TransactionID == transactionID {
			return c, nil
		}
	}
	return domain.GoalContribution{}, domain.ErrNotFound
}
func (r *Goals) ContributedTotal(_ context.Context, u, g string) (domain.Money, error) {
	var t domain.Money
	for _, c := range r.Contributions {
		if c.UserID == u && c.GoalID == g {
			t += c.Amount
		}
	}
	return t, nil
}
func (r *Goals) RemainingMonthlyCommitment(_ context.Context, u string, at time.Time) (domain.Money, error) {
	return r.Remaining, nil
}

type Audits struct{ Events []domain.AuditEvent }

func (a *Audits) Append(_ context.Context, e domain.AuditEvent) error {
	a.Events = append(a.Events, e)
	return nil
}
