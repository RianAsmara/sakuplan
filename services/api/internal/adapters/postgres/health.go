package postgres

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type HealthChecker struct {
	pool *pgxpool.Pool
}

func NewHealthChecker(pool *pgxpool.Pool) *HealthChecker {
	return &HealthChecker{pool: pool}
}

func (h *HealthChecker) Ping(ctx context.Context) error {
	return h.pool.Ping(ctx)
}
