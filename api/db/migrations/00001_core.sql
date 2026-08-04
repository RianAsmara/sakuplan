-- +goose Up
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE user_status AS ENUM ('active','suspended','deletion_pending','deleted');
CREATE TYPE user_role AS ENUM ('user','super_admin','operations_admin','support_agent','auditor');
CREATE TYPE account_type AS ENUM ('cash','bank','ewallet','savings','other');
CREATE TYPE category_kind AS ENUM ('income','expense');
CREATE TYPE transaction_type AS ENUM ('income','expense','transfer','adjustment','reversal');
CREATE TYPE entry_direction AS ENUM ('credit','debit');
CREATE TYPE budget_status AS ENUM ('draft','active','closed');
CREATE TYPE budget_source AS ENUM ('manual','rule_based','ai_assisted');
CREATE TYPE bill_frequency AS ENUM ('weekly','monthly','yearly');
CREATE TYPE goal_status AS ENUM ('active','completed','archived');

CREATE TABLE users (
    id uuid PRIMARY KEY,
    email citext NOT NULL UNIQUE,
    display_name text NOT NULL,
    password_hash text NOT NULL,
    status user_status NOT NULL DEFAULT 'active',
    role user_role NOT NULL DEFAULT 'user',
    currency char(3) NOT NULL DEFAULT 'IDR',
    timezone text NOT NULL DEFAULT 'Asia/Jakarta',
    payday smallint NOT NULL DEFAULT 25 CHECK (payday BETWEEN 1 AND 31),
    minimum_buffer bigint NOT NULL DEFAULT 0 CHECK (minimum_buffer >= 0),
    ai_consent boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
);

CREATE TABLE refresh_sessions (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id),
    family_id uuid NOT NULL,
    token_hash char(64) NOT NULL UNIQUE,
    replaced_by_id uuid NULL REFERENCES refresh_sessions(id),
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz NULL,
    user_agent text NOT NULL DEFAULT '',
    ip_address inet NULL,
    created_at timestamptz NOT NULL
);
CREATE INDEX refresh_sessions_user_idx ON refresh_sessions(user_id, created_at DESC);
CREATE INDEX refresh_sessions_family_idx ON refresh_sessions(family_id);

CREATE TABLE financial_accounts (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id),
    name text NOT NULL,
    type account_type NOT NULL,
    currency char(3) NOT NULL,
    initial_balance bigint NOT NULL CHECK (initial_balance >= 0),
    spendable boolean NOT NULL DEFAULT true,
    archived_at timestamptz NULL,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
);
CREATE UNIQUE INDEX financial_accounts_active_name_uq ON financial_accounts(user_id, lower(name)) WHERE archived_at IS NULL;
CREATE INDEX financial_accounts_user_idx ON financial_accounts(user_id, created_at);

CREATE TABLE categories (
    id uuid PRIMARY KEY,
    user_id uuid NULL REFERENCES users(id),
    name text NOT NULL,
    kind category_kind NOT NULL,
    icon text NOT NULL DEFAULT '',
    is_default boolean NOT NULL DEFAULT false,
    archived_at timestamptz NULL,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    CHECK ((is_default AND user_id IS NULL) OR (NOT is_default AND user_id IS NOT NULL))
);
CREATE UNIQUE INDEX categories_default_name_uq ON categories(kind, lower(name)) WHERE is_default AND archived_at IS NULL;
CREATE UNIQUE INDEX categories_user_name_uq ON categories(user_id, kind, lower(name)) WHERE user_id IS NOT NULL AND archived_at IS NULL;

CREATE TABLE financial_transactions (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id),
    type transaction_type NOT NULL,
    category_id uuid NULL REFERENCES categories(id),
    amount bigint NOT NULL CHECK (amount > 0),
    occurred_at timestamptz NOT NULL,
    note text NOT NULL DEFAULT '',
    reason text NOT NULL DEFAULT '',
    reverses_id uuid NULL REFERENCES financial_transactions(id),
    reversed_by_id uuid NULL REFERENCES financial_transactions(id),
    idempotency_operation text NOT NULL,
    idempotency_key text NOT NULL,
    request_hash char(64) NOT NULL,
    created_at timestamptz NOT NULL,
    UNIQUE(user_id, idempotency_operation, idempotency_key)
);
CREATE INDEX financial_transactions_user_time_idx ON financial_transactions(user_id, occurred_at DESC, id DESC);
CREATE INDEX financial_transactions_category_idx ON financial_transactions(user_id, category_id, occurred_at);

CREATE TABLE transaction_entries (
    id uuid PRIMARY KEY,
    transaction_id uuid NOT NULL REFERENCES financial_transactions(id) ON DELETE CASCADE,
    account_id uuid NOT NULL REFERENCES financial_accounts(id),
    direction entry_direction NOT NULL,
    amount bigint NOT NULL CHECK (amount > 0)
);
CREATE INDEX transaction_entries_account_idx ON transaction_entries(account_id, transaction_id);

CREATE TABLE budget_periods (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id),
    start_date date NOT NULL,
    end_date date NOT NULL,
    expected_income bigint NOT NULL CHECK (expected_income >= 0),
    savings_commitment bigint NOT NULL CHECK (savings_commitment >= 0),
    minimum_buffer bigint NOT NULL CHECK (minimum_buffer >= 0),
    status budget_status NOT NULL,
    source budget_source NOT NULL,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    CHECK (end_date >= start_date)
);
CREATE INDEX budget_periods_user_dates_idx ON budget_periods(user_id, start_date, end_date);
ALTER TABLE budget_periods ADD CONSTRAINT budget_periods_no_overlapping_active
EXCLUDE USING gist (user_id WITH =, daterange(start_date, end_date, '[]') WITH &&)
WHERE (status = 'active');

CREATE TABLE budget_allocations (
    id uuid PRIMARY KEY,
    budget_period_id uuid NOT NULL REFERENCES budget_periods(id) ON DELETE CASCADE,
    category_id uuid NOT NULL REFERENCES categories(id),
    amount bigint NOT NULL CHECK (amount >= 0),
    UNIQUE(budget_period_id, category_id)
);

CREATE TABLE recurring_bills (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id),
    name text NOT NULL,
    amount bigint NOT NULL CHECK (amount > 0),
    due_day smallint NOT NULL CHECK (due_day BETWEEN 1 AND 31),
    frequency bill_frequency NOT NULL,
    category_id uuid NOT NULL REFERENCES categories(id),
    account_id uuid NOT NULL REFERENCES financial_accounts(id),
    reminder_days smallint NOT NULL DEFAULT 3 CHECK (reminder_days BETWEEN 0 AND 90),
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
);
CREATE INDEX recurring_bills_user_idx ON recurring_bills(user_id, active);

CREATE TABLE saving_goals (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id),
    name text NOT NULL,
    target_amount bigint NOT NULL CHECK (target_amount > 0),
    target_date date NULL,
    monthly_commitment bigint NOT NULL DEFAULT 0 CHECK (monthly_commitment >= 0),
    priority smallint NOT NULL DEFAULT 0,
    status goal_status NOT NULL,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
);
CREATE UNIQUE INDEX saving_goals_active_name_uq ON saving_goals(user_id, lower(name)) WHERE status <> 'archived';

CREATE TABLE saving_goal_contributions (
    id uuid PRIMARY KEY,
    goal_id uuid NOT NULL REFERENCES saving_goals(id),
    user_id uuid NOT NULL REFERENCES users(id),
    account_id uuid NOT NULL REFERENCES financial_accounts(id),
    amount bigint NOT NULL CHECK (amount > 0),
    occurred_at timestamptz NOT NULL,
    transaction_id uuid NOT NULL UNIQUE REFERENCES financial_transactions(id),
    created_at timestamptz NOT NULL
);
CREATE INDEX saving_goal_contributions_goal_idx ON saving_goal_contributions(goal_id, occurred_at);

CREATE TABLE audit_logs (
    id uuid PRIMARY KEY,
    actor_type text NOT NULL,
    actor_id text NOT NULL,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id text NOT NULL,
    request_id text NOT NULL DEFAULT '',
    reason text NOT NULL DEFAULT '',
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    occurred_at timestamptz NOT NULL
);
CREATE INDEX audit_logs_actor_idx ON audit_logs(actor_type, actor_id, occurred_at DESC);
CREATE INDEX audit_logs_target_idx ON audit_logs(target_type, target_id, occurred_at DESC);

INSERT INTO categories (id,user_id,name,kind,icon,is_default,created_at,updated_at) VALUES
('00000000-0000-4000-8000-000000000001',NULL,'Gaji','income','wallet',true,now(),now()),
('00000000-0000-4000-8000-000000000002',NULL,'Bonus','income','gift',true,now(),now()),
('00000000-0000-4000-8000-000000000101',NULL,'Makanan dan Minuman','expense','utensils',true,now(),now()),
('00000000-0000-4000-8000-000000000102',NULL,'Transportasi','expense','car',true,now(),now()),
('00000000-0000-4000-8000-000000000103',NULL,'Tagihan','expense','receipt',true,now(),now()),
('00000000-0000-4000-8000-000000000104',NULL,'Tempat Tinggal','expense','home',true,now(),now()),
('00000000-0000-4000-8000-000000000105',NULL,'Kesehatan','expense','heart',true,now(),now()),
('00000000-0000-4000-8000-000000000106',NULL,'Pendidikan','expense','book',true,now(),now()),
('00000000-0000-4000-8000-000000000107',NULL,'Hiburan','expense','gamepad',true,now(),now());

-- +goose Down
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS saving_goal_contributions;
DROP TABLE IF EXISTS saving_goals;
DROP TABLE IF EXISTS recurring_bills;
DROP TABLE IF EXISTS budget_allocations;
DROP TABLE IF EXISTS budget_periods;
DROP TABLE IF EXISTS transaction_entries;
DROP TABLE IF EXISTS financial_transactions;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS financial_accounts;
DROP TABLE IF EXISTS refresh_sessions;
DROP TABLE IF EXISTS users;
DROP TYPE IF EXISTS goal_status;
DROP TYPE IF EXISTS bill_frequency;
DROP TYPE IF EXISTS budget_source;
DROP TYPE IF EXISTS budget_status;
DROP TYPE IF EXISTS entry_direction;
DROP TYPE IF EXISTS transaction_type;
DROP TYPE IF EXISTS category_kind;
DROP TYPE IF EXISTS account_type;
DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS user_status;
