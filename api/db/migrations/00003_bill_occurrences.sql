-- +goose Up
CREATE TABLE bill_occurrences (
    id uuid PRIMARY KEY,
    bill_id uuid NOT NULL REFERENCES recurring_bills(id),
    user_id uuid NOT NULL REFERENCES users(id),
    due_date date NOT NULL,
    amount bigint NOT NULL CHECK (amount > 0),
    transaction_id uuid NOT NULL UNIQUE REFERENCES financial_transactions(id),
    created_at timestamptz NOT NULL,
    UNIQUE(bill_id, due_date)
);
CREATE INDEX bill_occurrences_user_due_idx ON bill_occurrences(user_id, due_date);

-- +goose Down
DROP TABLE bill_occurrences;
