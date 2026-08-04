package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/sakuplan/api/internal/domain"
)

type DBTX interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}

type Store struct{ pool *pgxpool.Pool }

func NewStore(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

type txKey struct{}

func (s *Store) db(ctx context.Context) DBTX {
	if tx, ok := ctx.Value(txKey{}).(pgx.Tx); ok {
		return tx
	}
	return s.pool
}
func (s *Store) inTransaction(ctx context.Context) bool {
	_, ok := ctx.Value(txKey{}).(pgx.Tx)
	return ok
}

func (s *Store) WithinTransaction(ctx context.Context, fn func(context.Context) error) error {
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	txctx := context.WithValue(ctx, txKey{}, tx)
	if err = fn(txctx); err != nil {
		_ = tx.Rollback(ctx)
		return err
	}
	return tx.Commit(ctx)
}

func mapError(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.ErrNotFound
	}
	var pe *pgconn.PgError
	if errors.As(err, &pe) {
		switch pe.Code {
		case "23505", "23P01":
			return domain.ErrConflict
		case "23503", "23514", "22P02":
			return domain.ErrInvalidInput
		}
	}
	return err
}

// Users
func (s *Store) CreateUser(ctx context.Context, u domain.User) (domain.User, error) {
	_, err := s.db(ctx).Exec(ctx, `INSERT INTO users(id,email,display_name,password_hash,status,role,currency,timezone,payday,minimum_buffer,ai_consent,accepted_terms_version,accepted_privacy_version,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`, u.ID, u.Email, u.DisplayName, u.PasswordHash, u.Status, u.Role, u.Currency, u.Timezone, u.Payday, u.MinimumBuffer, u.AIConsent, u.AcceptedTermsVersion, u.AcceptedPrivacyVersion, u.CreatedAt, u.UpdatedAt)
	return u, mapError(err)
}
func scanUser(row pgx.Row) (domain.User, error) {
	var u domain.User
	err := row.Scan(&u.ID, &u.Email, &u.DisplayName, &u.PasswordHash, &u.Status, &u.Role, &u.Currency, &u.Timezone, &u.Payday, &u.MinimumBuffer, &u.AIConsent, &u.AcceptedTermsVersion, &u.AcceptedPrivacyVersion, &u.CreatedAt, &u.UpdatedAt)
	return u, mapError(err)
}
func (s *Store) GetUserByID(ctx context.Context, id string) (domain.User, error) {
	return scanUser(s.db(ctx).QueryRow(ctx, `SELECT id,email,display_name,password_hash,status,role,currency,timezone,payday,minimum_buffer,ai_consent,accepted_terms_version,accepted_privacy_version,created_at,updated_at FROM users WHERE id=$1`, id))
}
func (s *Store) GetUserByEmail(ctx context.Context, email string) (domain.User, error) {
	return scanUser(s.db(ctx).QueryRow(ctx, `SELECT id,email,display_name,password_hash,status,role,currency,timezone,payday,minimum_buffer,ai_consent,accepted_terms_version,accepted_privacy_version,created_at,updated_at FROM users WHERE email=$1`, email))
}
func (s *Store) UpdateUserProfile(ctx context.Context, u domain.User) (domain.User, error) {
	_, err := s.db(ctx).Exec(ctx, `UPDATE users SET display_name=$3,currency=$4,timezone=$5,payday=$6,minimum_buffer=$7,ai_consent=$8,updated_at=$9 WHERE id=$1 AND email=$2`, u.ID, u.Email, u.DisplayName, u.Currency, u.Timezone, u.Payday, u.MinimumBuffer, u.AIConsent, u.UpdatedAt)
	return u, mapError(err)
}

// Sessions
func (s *Store) CreateSession(ctx context.Context, r domain.RefreshSession) (domain.RefreshSession, error) {
	_, err := s.db(ctx).Exec(ctx, `INSERT INTO refresh_sessions(id,user_id,family_id,token_hash,replaced_by_id,expires_at,revoked_at,user_agent,ip_address,created_at) VALUES($1,$2,$3,$4,NULL,$5,NULL,$6,NULLIF($7,'')::inet,$8)`, r.ID, r.UserID, r.FamilyID, r.TokenHash, r.ExpiresAt, r.UserAgent, r.IPAddress, r.CreatedAt)
	return r, mapError(err)
}
func scanSession(row pgx.Row) (domain.RefreshSession, error) {
	var r domain.RefreshSession
	err := row.Scan(&r.ID, &r.UserID, &r.FamilyID, &r.TokenHash, &r.ReplacedByID, &r.ExpiresAt, &r.RevokedAt, &r.UserAgent, &r.IPAddress, &r.CreatedAt)
	return r, mapError(err)
}
func (s *Store) GetSessionByTokenHash(ctx context.Context, h string) (domain.RefreshSession, error) {
	return scanSession(s.db(ctx).QueryRow(ctx, `SELECT id,user_id,family_id,token_hash,COALESCE(replaced_by_id::text,''),expires_at,revoked_at,user_agent,COALESCE(ip_address::text,''),created_at FROM refresh_sessions WHERE token_hash=$1`, h))
}
func (s *Store) RotateSession(ctx context.Context, id string, n domain.RefreshSession, at time.Time) (domain.RefreshSession, error) {
	tag, err := s.db(ctx).Exec(ctx, `WITH eligible AS (
		SELECT id FROM refresh_sessions WHERE id=$1 AND revoked_at IS NULL FOR UPDATE
	), inserted AS (
		INSERT INTO refresh_sessions(id,user_id,family_id,token_hash,replaced_by_id,expires_at,revoked_at,user_agent,ip_address,created_at)
		SELECT $3,$4,$5,$6,NULL,$7,NULL,$8,NULLIF($9,'')::inet,$10 FROM eligible
		RETURNING id
	)
	UPDATE refresh_sessions SET revoked_at=$2,replaced_by_id=(SELECT id FROM inserted)
	WHERE id=(SELECT id FROM eligible)`, id, at, n.ID, n.UserID, n.FamilyID, n.TokenHash, n.ExpiresAt, n.UserAgent, n.IPAddress, n.CreatedAt)
	if err != nil {
		return domain.RefreshSession{}, mapError(err)
	}
	if tag.RowsAffected() == 0 {
		return domain.RefreshSession{}, domain.ErrConflict
	}
	return n, nil
}
func (s *Store) RevokeSession(ctx context.Context, id string, at time.Time) error {
	_, err := s.db(ctx).Exec(ctx, `UPDATE refresh_sessions SET revoked_at=COALESCE(revoked_at,$2) WHERE id=$1`, id, at)
	return mapError(err)
}
func (s *Store) RevokeSessionFamily(ctx context.Context, f string, at time.Time) error {
	_, err := s.db(ctx).Exec(ctx, `UPDATE refresh_sessions SET revoked_at=COALESCE(revoked_at,$2) WHERE family_id=$1`, f, at)
	return mapError(err)
}
func (s *Store) RevokeAllSessions(ctx context.Context, u string, at time.Time) error {
	_, err := s.db(ctx).Exec(ctx, `UPDATE refresh_sessions SET revoked_at=COALESCE(revoked_at,$2) WHERE user_id=$1`, u, at)
	return mapError(err)
}

// Accounts
func (s *Store) CreateAccount(ctx context.Context, a domain.FinancialAccount) (domain.FinancialAccount, error) {
	_, err := s.db(ctx).Exec(ctx, `INSERT INTO financial_accounts(id,user_id,name,type,currency,initial_balance,spendable,archived_at,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,NULL,$8,$9)`, a.ID, a.UserID, a.Name, a.Type, a.Currency, a.InitialBalance, a.Spendable, a.CreatedAt, a.UpdatedAt)
	return a, mapError(err)
}
func scanAccount(row pgx.Row) (domain.FinancialAccount, error) {
	var a domain.FinancialAccount
	err := row.Scan(&a.ID, &a.UserID, &a.Name, &a.Type, &a.Currency, &a.InitialBalance, &a.Spendable, &a.ArchivedAt, &a.CreatedAt, &a.UpdatedAt)
	return a, mapError(err)
}
func (s *Store) GetAccount(ctx context.Context, u, id string) (domain.FinancialAccount, error) {
	return scanAccount(s.db(ctx).QueryRow(ctx, `SELECT id,user_id,name,type,currency,initial_balance,spendable,archived_at,created_at,updated_at FROM financial_accounts WHERE id=$1 AND user_id=$2`, id, u))
}
func (s *Store) ListAccounts(ctx context.Context, u string, arch bool) ([]domain.FinancialAccount, error) {
	rows, err := s.db(ctx).Query(ctx, `SELECT id,user_id,name,type,currency,initial_balance,spendable,archived_at,created_at,updated_at FROM financial_accounts WHERE user_id=$1 AND ($2 OR archived_at IS NULL) ORDER BY created_at`, u, arch)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.FinancialAccount{}
	for rows.Next() {
		a, e := scanAccount(rows)
		if e != nil {
			return nil, e
		}
		out = append(out, a)
	}
	return out, rows.Err()
}
func (s *Store) UpdateAccount(ctx context.Context, a domain.FinancialAccount) (domain.FinancialAccount, error) {
	_, err := s.db(ctx).Exec(ctx, `UPDATE financial_accounts SET name=$3,type=$4,spendable=$5,updated_at=$6 WHERE id=$1 AND user_id=$2`, a.ID, a.UserID, a.Name, a.Type, a.Spendable, a.UpdatedAt)
	return a, mapError(err)
}
func (s *Store) ArchiveAccount(ctx context.Context, u, id string, at time.Time) error {
	tag, err := s.db(ctx).Exec(ctx, `UPDATE financial_accounts SET archived_at=$3,updated_at=$3 WHERE id=$1 AND user_id=$2 AND archived_at IS NULL`, id, u, at)
	if err == nil && tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return mapError(err)
}
func (s *Store) AccountBalance(ctx context.Context, u, id string) (domain.Money, error) {
	var v domain.Money
	err := s.db(ctx).QueryRow(ctx, `SELECT a.initial_balance + COALESCE(SUM(CASE e.direction WHEN 'credit' THEN e.amount ELSE -e.amount END),0) FROM financial_accounts a LEFT JOIN transaction_entries e ON e.account_id=a.id LEFT JOIN financial_transactions t ON t.id=e.transaction_id WHERE a.id=$1 AND a.user_id=$2 GROUP BY a.id`, id, u).Scan(&v)
	return v, mapError(err)
}
func (s *Store) LiquidBalance(ctx context.Context, u string) (domain.Money, error) {
	var v domain.Money
	err := s.db(ctx).QueryRow(ctx, `SELECT COALESCE(SUM(x.balance),0) FROM (SELECT a.id,a.initial_balance+COALESCE(SUM(CASE e.direction WHEN 'credit' THEN e.amount ELSE -e.amount END),0) balance FROM financial_accounts a LEFT JOIN transaction_entries e ON e.account_id=a.id WHERE a.user_id=$1 AND a.spendable AND a.archived_at IS NULL GROUP BY a.id) x`, u).Scan(&v)
	return v, mapError(err)
}

// Categories
func (s *Store) CreateCategory(ctx context.Context, c domain.Category) (domain.Category, error) {
	_, err := s.db(ctx).Exec(ctx, `INSERT INTO categories(id,user_id,name,kind,icon,is_default,archived_at,created_at,updated_at) VALUES($1,NULLIF($2,'')::uuid,$3,$4,$5,$6,NULL,$7,$8)`, c.ID, c.UserID, c.Name, c.Kind, c.Icon, c.IsDefault, c.CreatedAt, c.UpdatedAt)
	return c, mapError(err)
}
func scanCategory(row pgx.Row) (domain.Category, error) {
	var c domain.Category
	err := row.Scan(&c.ID, &c.UserID, &c.Name, &c.Kind, &c.Icon, &c.IsDefault, &c.ArchivedAt, &c.CreatedAt, &c.UpdatedAt)
	return c, mapError(err)
}
func (s *Store) GetCategory(ctx context.Context, u, id string) (domain.Category, error) {
	return scanCategory(s.db(ctx).QueryRow(ctx, `SELECT id,COALESCE(user_id::text,''),name,kind,icon,is_default,archived_at,created_at,updated_at FROM categories WHERE id=$1 AND (user_id=$2 OR user_id IS NULL)`, id, u))
}
func (s *Store) ListCategories(ctx context.Context, u string, k domain.CategoryKind, arch bool) ([]domain.Category, error) {
	rows, err := s.db(ctx).Query(ctx, `SELECT id,COALESCE(user_id::text,''),name,kind,icon,is_default,archived_at,created_at,updated_at FROM categories WHERE (user_id=$1 OR user_id IS NULL) AND ($2='' OR kind=$2::category_kind) AND ($3 OR archived_at IS NULL) ORDER BY is_default DESC,name`, u, k, arch)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()
	out := []domain.Category{}
	for rows.Next() {
		c, e := scanCategory(rows)
		if e != nil {
			return nil, e
		}
		out = append(out, c)
	}
	return out, rows.Err()
}
func (s *Store) UpdateCategory(ctx context.Context, c domain.Category) (domain.Category, error) {
	_, err := s.db(ctx).Exec(ctx, `UPDATE categories SET name=$3,icon=$4,updated_at=$5 WHERE id=$1 AND user_id=$2 AND is_default=false`, c.ID, c.UserID, c.Name, c.Icon, c.UpdatedAt)
	return c, mapError(err)
}
func (s *Store) ArchiveCategory(ctx context.Context, u, id string, at time.Time) error {
	tag, err := s.db(ctx).Exec(ctx, `UPDATE categories SET archived_at=$3,updated_at=$3 WHERE id=$1 AND user_id=$2 AND is_default=false`, id, u, at)
	if err == nil && tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return mapError(err)
}

// Transactions
func (s *Store) CreateTransaction(ctx context.Context, t domain.Transaction) (domain.Transaction, error) {
	create := func(txctx context.Context) error {
		_, err := s.db(txctx).Exec(txctx, `INSERT INTO financial_transactions(id,user_id,type,category_id,amount,occurred_at,note,reason,reverses_id,reversed_by_id,idempotency_operation,idempotency_key,request_hash,created_at) VALUES($1,$2,$3,NULLIF($4,'')::uuid,$5,$6,$7,$8,NULLIF($9,'')::uuid,NULLIF($10,'')::uuid,$11,$12,$13,$14)`, t.ID, t.UserID, t.Type, t.CategoryID, t.Amount, t.OccurredAt, t.Note, t.Reason, t.ReversesID, t.ReversedByID, t.IdempotencyOperation, t.IdempotencyKey, t.RequestHash, t.CreatedAt)
		if err != nil {
			return mapError(err)
		}
		for _, e := range t.Entries {
			if _, err = s.db(txctx).Exec(txctx, `INSERT INTO transaction_entries(id,transaction_id,account_id,direction,amount) VALUES($1,$2,$3,$4,$5)`, e.ID, t.ID, e.AccountID, e.Direction, e.Amount); err != nil {
				return mapError(err)
			}
		}
		return nil
	}
	var err error
	if s.inTransaction(ctx) {
		err = create(ctx)
	} else {
		err = s.WithinTransaction(ctx, create)
	}
	if err != nil {
		return domain.Transaction{}, err
	}
	return t, nil
}
func (s *Store) ReverseTransaction(ctx context.Context, originalID string, reversal domain.Transaction) (domain.Transaction, error) {
	reverse := func(txctx context.Context) error {
		if _, err := s.CreateTransaction(txctx, reversal); err != nil {
			return err
		}
		tag, err := s.db(txctx).Exec(txctx, `UPDATE financial_transactions
			SET reversed_by_id=$3
			WHERE id=$1 AND user_id=$2 AND reversed_by_id IS NULL AND type <> 'reversal'`, originalID, reversal.UserID, reversal.ID)
		if err != nil {
			return mapError(err)
		}
		if tag.RowsAffected() == 0 {
			return domain.ErrConflict
		}
		return nil
	}
	var err error
	if s.inTransaction(ctx) {
		err = reverse(ctx)
	} else {
		err = s.WithinTransaction(ctx, reverse)
	}
	if err != nil {
		return domain.Transaction{}, err
	}
	return reversal, nil
}
func (s *Store) getTransactionBy(ctx context.Context, clause string, args ...any) (domain.Transaction, error) {
	q := `SELECT id,user_id,type,COALESCE(category_id::text,''),amount,occurred_at,note,reason,COALESCE(reverses_id::text,''),COALESCE(reversed_by_id::text,''),idempotency_operation,idempotency_key,request_hash,created_at FROM financial_transactions WHERE ` + clause
	var t domain.Transaction
	err := s.db(ctx).QueryRow(ctx, q, args...).Scan(&t.ID, &t.UserID, &t.Type, &t.CategoryID, &t.Amount, &t.OccurredAt, &t.Note, &t.Reason, &t.ReversesID, &t.ReversedByID, &t.IdempotencyOperation, &t.IdempotencyKey, &t.RequestHash, &t.CreatedAt)
	if err != nil {
		return t, mapError(err)
	}
	rows, err := s.db(ctx).Query(ctx, `SELECT id,transaction_id,account_id,direction,amount FROM transaction_entries WHERE transaction_id=$1 ORDER BY id`, t.ID)
	if err != nil {
		return t, err
	}
	defer rows.Close()
	for rows.Next() {
		var e domain.TransactionEntry
		if err = rows.Scan(&e.ID, &e.TransactionID, &e.AccountID, &e.Direction, &e.Amount); err != nil {
			return t, err
		}
		t.Entries = append(t.Entries, e)
	}
	return t, rows.Err()
}
func (s *Store) GetTransaction(ctx context.Context, u, id string) (domain.Transaction, error) {
	return s.getTransactionBy(ctx, `id=$1 AND user_id=$2`, id, u)
}
func (s *Store) GetTransactionByIdempotency(ctx context.Context, u, op, key string) (domain.Transaction, error) {
	return s.getTransactionBy(ctx, `user_id=$1 AND idempotency_operation=$2 AND idempotency_key=$3`, u, op, key)
}
func (s *Store) ListTransactions(ctx context.Context, u string, p domain.Page) ([]domain.Transaction, string, error) {
	p = p.Normalized()
	rows, err := s.db(ctx).Query(ctx, `SELECT id FROM financial_transactions WHERE user_id=$1 AND ($2='' OR (occurred_at,id)<(SELECT occurred_at,id FROM financial_transactions WHERE id=$2::uuid AND user_id=$1)) ORDER BY occurred_at DESC,id DESC LIMIT $3`, u, p.Cursor, p.Limit+1)
	if err != nil {
		return nil, "", mapError(err)
	}
	defer rows.Close()
	ids := []string{}
	for rows.Next() {
		var id string
		if err = rows.Scan(&id); err != nil {
			return nil, "", err
		}
		ids = append(ids, id)
	}
	next := ""
	if len(ids) > p.Limit {
		next = ids[p.Limit-1]
		ids = ids[:p.Limit]
	}
	out := make([]domain.Transaction, 0, len(ids))
	for _, id := range ids {
		t, e := s.GetTransaction(ctx, u, id)
		if e != nil {
			return nil, "", e
		}
		out = append(out, t)
	}
	return out, next, nil
}
func (s *Store) SpentByCategory(ctx context.Context, u string, start, end time.Time) (map[string]domain.Money, error) {
	rows, err := s.db(ctx).Query(ctx, `SELECT category_id::text,COALESCE(SUM(amount),0) FROM financial_transactions WHERE user_id=$1 AND type='expense' AND reversed_by_id IS NULL AND occurred_at >= $2 AND occurred_at < $3 GROUP BY category_id`, u, start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]domain.Money{}
	for rows.Next() {
		var k string
		var v domain.Money
		if err = rows.Scan(&k, &v); err != nil {
			return nil, err
		}
		out[k] = v
	}
	return out, rows.Err()
}
func (s *Store) CashFlowTotals(ctx context.Context, u string, start, end time.Time) (domain.Money, domain.Money, error) {
	var income, expenses domain.Money
	err := s.db(ctx).QueryRow(ctx, `SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0),COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) FROM financial_transactions WHERE user_id=$1 AND type IN ('income','expense') AND reversed_by_id IS NULL AND occurred_at >= $2 AND occurred_at < $3`, u, start, end).Scan(&income, &expenses)
	return income, expenses, mapError(err)
}
func (s *Store) CashFlowTrend(ctx context.Context, u string, start, end time.Time, groupBy string) ([]domain.TrendPoint, error) {
	rows, err := s.db(ctx).Query(ctx, `SELECT date_trunc($4,occurred_at) AS bucket,COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0),COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) FROM financial_transactions WHERE user_id=$1 AND type IN ('income','expense') AND reversed_by_id IS NULL AND occurred_at >= $2 AND occurred_at < $3 GROUP BY 1 ORDER BY 1`, u, start, end, groupBy)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.TrendPoint{}
	for rows.Next() {
		var p domain.TrendPoint
		if err = rows.Scan(&p.BucketStart, &p.Income, &p.Expenses); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// Budgets
func (s *Store) CreateBudget(ctx context.Context, b domain.BudgetPeriod) (domain.BudgetPeriod, error) {
	create := func(txctx context.Context) error {
		_, err := s.db(txctx).Exec(txctx, `INSERT INTO budget_periods(id,user_id,start_date,end_date,expected_income,savings_commitment,minimum_buffer,status,source,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, b.ID, b.UserID, b.StartDate, b.EndDate, b.ExpectedIncome, b.SavingsCommitment, b.MinimumBuffer, b.Status, b.Source, b.CreatedAt, b.UpdatedAt)
		if err != nil {
			return mapError(err)
		}
		for _, a := range b.Allocations {
			if _, err = s.db(txctx).Exec(txctx, `INSERT INTO budget_allocations(id,budget_period_id,category_id,amount) VALUES($1,$2,$3,$4)`, a.ID, b.ID, a.CategoryID, a.Amount); err != nil {
				return mapError(err)
			}
		}
		return nil
	}
	if s.inTransaction(ctx) {
		return b, create(ctx)
	}
	return b, s.WithinTransaction(ctx, create)
}
func (s *Store) getBudget(ctx context.Context, clause string, args ...any) (domain.BudgetPeriod, error) {
	var b domain.BudgetPeriod
	err := s.db(ctx).QueryRow(ctx, `SELECT id,user_id,start_date,end_date,expected_income,savings_commitment,minimum_buffer,status,source,created_at,updated_at FROM budget_periods WHERE `+clause, args...).Scan(&b.ID, &b.UserID, &b.StartDate, &b.EndDate, &b.ExpectedIncome, &b.SavingsCommitment, &b.MinimumBuffer, &b.Status, &b.Source, &b.CreatedAt, &b.UpdatedAt)
	if err != nil {
		return b, mapError(err)
	}
	rows, err := s.db(ctx).Query(ctx, `SELECT id,budget_period_id,category_id,amount FROM budget_allocations WHERE budget_period_id=$1 ORDER BY category_id`, b.ID)
	if err != nil {
		return b, err
	}
	defer rows.Close()
	for rows.Next() {
		var a domain.BudgetAllocation
		if err = rows.Scan(&a.ID, &a.BudgetPeriodID, &a.CategoryID, &a.Amount); err != nil {
			return b, err
		}
		b.Allocations = append(b.Allocations, a)
	}
	return b, rows.Err()
}
func (s *Store) GetBudget(ctx context.Context, u, id string) (domain.BudgetPeriod, error) {
	return s.getBudget(ctx, `id=$1 AND user_id=$2`, id, u)
}
func (s *Store) GetActiveBudget(ctx context.Context, u string, at time.Time) (domain.BudgetPeriod, error) {
	return s.getBudget(ctx, `user_id=$1 AND status='active' AND start_date <= $2::date AND end_date >= $2::date ORDER BY created_at DESC LIMIT 1`, u, at)
}
func (s *Store) ActivateBudget(ctx context.Context, u, id string, at time.Time) (domain.BudgetPeriod, error) {
	tag, err := s.db(ctx).Exec(ctx, `UPDATE budget_periods SET status='active',updated_at=$3 WHERE id=$1 AND user_id=$2 AND status='draft'`, id, u, at)
	if err != nil {
		return domain.BudgetPeriod{}, mapError(err)
	}
	if tag.RowsAffected() == 0 {
		return domain.BudgetPeriod{}, domain.ErrConflict
	}
	return s.GetBudget(ctx, u, id)
}
func (s *Store) ReplaceBudgetAllocations(ctx context.Context, u, id string, allocs []domain.BudgetAllocation, at time.Time) (domain.BudgetPeriod, error) {
	replace := func(txctx context.Context) error {
		b, err := s.GetBudget(txctx, u, id)
		if err != nil {
			return err
		}
		if b.Status != domain.BudgetDraft {
			return domain.ErrConflict
		}
		if _, err = s.db(txctx).Exec(txctx, `DELETE FROM budget_allocations WHERE budget_period_id=$1`, id); err != nil {
			return err
		}
		for _, a := range allocs {
			if _, err = s.db(txctx).Exec(txctx, `INSERT INTO budget_allocations(id,budget_period_id,category_id,amount) VALUES($1,$2,$3,$4)`, a.ID, id, a.CategoryID, a.Amount); err != nil {
				return mapError(err)
			}
		}
		_, err = s.db(txctx).Exec(txctx, `UPDATE budget_periods SET updated_at=$3 WHERE id=$1 AND user_id=$2`, id, u, at)
		return mapError(err)
	}
	var err error
	if s.inTransaction(ctx) {
		err = replace(ctx)
	} else {
		err = s.WithinTransaction(ctx, replace)
	}
	if err != nil {
		return domain.BudgetPeriod{}, err
	}
	return s.GetBudget(ctx, u, id)
}
func (s *Store) ListBudgets(ctx context.Context, u string) ([]domain.BudgetPeriod, error) {
	rows, err := s.db(ctx).Query(ctx, `SELECT id FROM budget_periods WHERE user_id=$1 ORDER BY start_date DESC, created_at DESC`, u)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()
	ids := []string{}
	for rows.Next() {
		var id string
		if err = rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	out := make([]domain.BudgetPeriod, 0, len(ids))
	for _, id := range ids {
		b, e := s.GetBudget(ctx, u, id)
		if e != nil {
			return nil, e
		}
		out = append(out, b)
	}
	return out, nil
}

// Bills
func (s *Store) CreateBill(ctx context.Context, b domain.RecurringBill) (domain.RecurringBill, error) {
	_, err := s.db(ctx).Exec(ctx, `INSERT INTO recurring_bills(id,user_id,name,amount,due_day,frequency,category_id,account_id,reminder_days,active,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, b.ID, b.UserID, b.Name, b.Amount, b.DueDay, b.Frequency, b.CategoryID, b.AccountID, b.ReminderDays, b.Active, b.CreatedAt, b.UpdatedAt)
	return b, mapError(err)
}
func scanBill(row pgx.Row) (domain.RecurringBill, error) {
	var b domain.RecurringBill
	err := row.Scan(&b.ID, &b.UserID, &b.Name, &b.Amount, &b.DueDay, &b.Frequency, &b.CategoryID, &b.AccountID, &b.ReminderDays, &b.Active, &b.CreatedAt, &b.UpdatedAt)
	return b, mapError(err)
}
func (s *Store) GetBill(ctx context.Context, u, id string) (domain.RecurringBill, error) {
	return scanBill(s.db(ctx).QueryRow(ctx, `SELECT id,user_id,name,amount,due_day,frequency,category_id,account_id,reminder_days,active,created_at,updated_at FROM recurring_bills WHERE id=$1 AND user_id=$2`, id, u))
}
func (s *Store) ListBills(ctx context.Context, u string, active bool) ([]domain.RecurringBill, error) {
	rows, err := s.db(ctx).Query(ctx, `SELECT id,user_id,name,amount,due_day,frequency,category_id,account_id,reminder_days,active,created_at,updated_at FROM recurring_bills WHERE user_id=$1 AND ($2=false OR active=true) ORDER BY name`, u, active)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.RecurringBill{}
	for rows.Next() {
		b, e := scanBill(rows)
		if e != nil {
			return nil, e
		}
		out = append(out, b)
	}
	return out, rows.Err()
}
func (s *Store) UpdateBill(ctx context.Context, b domain.RecurringBill) (domain.RecurringBill, error) {
	_, err := s.db(ctx).Exec(ctx, `UPDATE recurring_bills SET name=$3,amount=$4,due_day=$5,frequency=$6,category_id=$7,account_id=$8,reminder_days=$9,active=$10,updated_at=$11 WHERE id=$1 AND user_id=$2`, b.ID, b.UserID, b.Name, b.Amount, b.DueDay, b.Frequency, b.CategoryID, b.AccountID, b.ReminderDays, b.Active, b.UpdatedAt)
	return b, mapError(err)
}
func (s *Store) UpcomingBillsTotal(ctx context.Context, u string, from, to time.Time) (domain.Money, error) {
	bills, err := s.ListBills(ctx, u, true)
	if err != nil {
		return 0, err
	}
	var total domain.Money
	for _, b := range bills {
		if billDueInRange(b, from, to) {
			total += b.Amount
		}
	}
	return total, nil
}
func (s *Store) NextDueBill(ctx context.Context, u string, from, until time.Time) (domain.RecurringBill, time.Time, error) {
	bills, err := s.ListBills(ctx, u, true)
	if err != nil {
		return domain.RecurringBill{}, time.Time{}, err
	}
	var best domain.RecurringBill
	var bestDue time.Time
	found := false
	for _, b := range bills {
		due, ok := nextBillOccurrence(b, from, until)
		if !ok {
			continue
		}
		if !found || due.Before(bestDue) {
			best, bestDue, found = b, due, true
		}
	}
	if !found {
		return domain.RecurringBill{}, time.Time{}, domain.ErrNotFound
	}
	return best, bestDue, nil
}
func billDueInRange(b domain.RecurringBill, from, to time.Time) bool {
	_, ok := nextBillOccurrence(b, from, to)
	return ok
}
func nextBillOccurrence(b domain.RecurringBill, from, to time.Time) (time.Time, bool) {
	switch b.Frequency {
	case domain.BillWeekly:
		if to.Before(from) {
			return time.Time{}, false
		}
		return from, true
	case domain.BillYearly, domain.BillMonthly:
		for cursor := time.Date(from.Year(), from.Month(), 1, 0, 0, 0, 0, from.Location()); !cursor.After(to); cursor = cursor.AddDate(0, 1, 0) {
			last := time.Date(cursor.Year(), cursor.Month()+1, 0, 0, 0, 0, 0, cursor.Location()).Day()
			d := b.DueDay
			if d > last {
				d = last
			}
			due := time.Date(cursor.Year(), cursor.Month(), d, 0, 0, 0, 0, cursor.Location())
			if !due.Before(from) && !due.After(to) {
				return due, true
			}
		}
	}
	return time.Time{}, false
}

// Goals
func (s *Store) CreateGoal(ctx context.Context, g domain.SavingGoal) (domain.SavingGoal, error) {
	_, err := s.db(ctx).Exec(ctx, `INSERT INTO saving_goals(id,user_id,name,target_amount,target_date,monthly_commitment,priority,status,created_at,updated_at) VALUES($1,$2,$3,$4,NULLIF($5::text,'')::date,$6,$7,$8,$9,$10)`, g.ID, g.UserID, g.Name, g.TargetAmount, nullableDate(g.TargetDate), g.MonthlyCommitment, g.Priority, g.Status, g.CreatedAt, g.UpdatedAt)
	return g, mapError(err)
}
func nullableDate(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.Format("2006-01-02")
}
func scanGoal(row pgx.Row) (domain.SavingGoal, error) {
	var g domain.SavingGoal
	var target *time.Time
	err := row.Scan(&g.ID, &g.UserID, &g.Name, &g.TargetAmount, &target, &g.MonthlyCommitment, &g.Priority, &g.Status, &g.CreatedAt, &g.UpdatedAt)
	if target != nil {
		g.TargetDate = *target
	}
	return g, mapError(err)
}
func (s *Store) GetGoal(ctx context.Context, u, id string) (domain.SavingGoal, error) {
	return scanGoal(s.db(ctx).QueryRow(ctx, `SELECT id,user_id,name,target_amount,target_date,monthly_commitment,priority,status,created_at,updated_at FROM saving_goals WHERE id=$1 AND user_id=$2`, id, u))
}
func (s *Store) ListGoals(ctx context.Context, u string, active bool) ([]domain.SavingGoal, error) {
	rows, err := s.db(ctx).Query(ctx, `SELECT id,user_id,name,target_amount,target_date,monthly_commitment,priority,status,created_at,updated_at FROM saving_goals WHERE user_id=$1 AND ($2=false OR status='active') ORDER BY priority DESC,created_at`, u, active)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.SavingGoal{}
	for rows.Next() {
		g, e := scanGoal(rows)
		if e != nil {
			return nil, e
		}
		out = append(out, g)
	}
	return out, rows.Err()
}
func (s *Store) UpdateGoal(ctx context.Context, g domain.SavingGoal) (domain.SavingGoal, error) {
	_, err := s.db(ctx).Exec(ctx, `UPDATE saving_goals SET name=$3,target_amount=$4,target_date=NULLIF($5::text,'')::date,monthly_commitment=$6,priority=$7,status=$8,updated_at=$9 WHERE id=$1 AND user_id=$2`, g.ID, g.UserID, g.Name, g.TargetAmount, nullableDate(g.TargetDate), g.MonthlyCommitment, g.Priority, g.Status, g.UpdatedAt)
	return g, mapError(err)
}
func (s *Store) AddGoalContribution(ctx context.Context, c domain.GoalContribution) (domain.GoalContribution, error) {
	_, err := s.db(ctx).Exec(ctx, `INSERT INTO saving_goal_contributions(id,goal_id,user_id,account_id,amount,occurred_at,transaction_id,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, c.ID, c.GoalID, c.UserID, c.AccountID, c.Amount, c.OccurredAt, c.TransactionID, c.CreatedAt)
	return c, mapError(err)
}
func (s *Store) GetGoalContributionByTransactionID(ctx context.Context, userID, transactionID string) (domain.GoalContribution, error) {
	var c domain.GoalContribution
	err := s.db(ctx).QueryRow(ctx, `SELECT id,goal_id,user_id,account_id,amount,occurred_at,transaction_id,created_at FROM saving_goal_contributions WHERE user_id=$1 AND transaction_id=$2`, userID, transactionID).Scan(&c.ID, &c.GoalID, &c.UserID, &c.AccountID, &c.Amount, &c.OccurredAt, &c.TransactionID, &c.CreatedAt)
	return c, mapError(err)
}
func (s *Store) GoalContributedTotal(ctx context.Context, u, g string) (domain.Money, error) {
	var v domain.Money
	err := s.db(ctx).QueryRow(ctx, `SELECT COALESCE(SUM(amount),0) FROM saving_goal_contributions WHERE user_id=$1 AND goal_id=$2`, u, g).Scan(&v)
	return v, mapError(err)
}
func (s *Store) RemainingGoalCommitment(ctx context.Context, u string, at time.Time) (domain.Money, error) {
	var v domain.Money
	err := s.db(ctx).QueryRow(ctx, `SELECT COALESCE(SUM(GREATEST(g.monthly_commitment-COALESCE(c.contributed,0),0)),0)
		FROM saving_goals g
		LEFT JOIN (
			SELECT goal_id,SUM(amount) contributed FROM saving_goal_contributions
			WHERE user_id=$1 AND occurred_at >= date_trunc('month',$2::timestamptz)
			AND occurred_at < date_trunc('month',$2::timestamptz)+interval '1 month'
			GROUP BY goal_id
		) c ON c.goal_id=g.id
		WHERE g.user_id=$1 AND g.status='active'`, u, at).Scan(&v)
	return v, mapError(err)
}

// Audit
func (s *Store) AppendAudit(ctx context.Context, a domain.AuditEvent) error {
	meta, err := json.Marshal(a.Metadata)
	if err != nil {
		return err
	}
	_, err = s.db(ctx).Exec(ctx, `INSERT INTO audit_logs(id,actor_type,actor_id,action,target_type,target_id,request_id,reason,metadata,occurred_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, a.ID, a.ActorType, a.ActorID, a.Action, a.TargetType, a.TargetID, a.RequestID, a.Reason, meta, a.OccurredAt)
	return mapError(err)
}
