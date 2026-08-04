package ports

import (
	"context"
	"time"

	"github.com/sakuplan/api/internal/domain"
)

type Clock interface {
	Now() time.Time
}

type IDGenerator interface {
	New() string
}

type PasswordHasher interface {
	Hash(password string) (string, error)
	Verify(encoded, password string) error
}

type AccessClaims struct {
	UserID string
	Role   domain.UserRole
}

type AccessTokenManager interface {
	Issue(userID string, role domain.UserRole, now time.Time) (string, time.Time, error)
	Parse(token string, now time.Time) (AccessClaims, error)
}

type RefreshTokenManager interface {
	Generate() (plain, hash string, err error)
	Hash(plain string) string
}

type UnitOfWork interface {
	WithinTransaction(context.Context, func(context.Context) error) error
}

type HealthChecker interface {
	Ping(context.Context) error
}
