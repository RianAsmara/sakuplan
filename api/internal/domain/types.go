package domain

import (
	"errors"
	"fmt"
	"strings"
	"time"
)

type Money int64

func NewMoney(v int64) (Money, error) {
	if v < 0 {
		return 0, ErrInvalidAmount
	}
	return Money(v), nil
}

func (m Money) Int64() int64      { return int64(m) }
func (m Money) Add(v Money) Money { return m + v }
func (m Money) Sub(v Money) Money { return m - v }

var (
	ErrInvalidInput        = errors.New("invalid input")
	ErrInvalidAmount       = errors.New("amount must be greater than zero")
	ErrNotFound            = errors.New("not found")
	ErrConflict            = errors.New("conflict")
	ErrUnauthorized        = errors.New("unauthorized")
	ErrForbidden           = errors.New("forbidden")
	ErrInvalidCredentials  = errors.New("invalid credentials")
	ErrInactiveUser        = errors.New("user is not active")
	ErrIdempotencyConflict = errors.New("idempotency key reused with different payload")
	ErrBudgetOverallocated = errors.New("budget allocations exceed available income")
	ErrSameAccountTransfer = errors.New("source and destination accounts must differ")
)

type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

type ValidationError struct {
	Fields []FieldError
}

func (e ValidationError) Error() string { return "validation failed" }

func NormalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func ValidateDateRange(start, end time.Time) error {
	if start.IsZero() || end.IsZero() || end.Before(start) {
		return fmt.Errorf("%w: invalid date range", ErrInvalidInput)
	}
	return nil
}

type Page struct {
	Limit  int
	Cursor string
}

func (p Page) Normalized() Page {
	if p.Limit <= 0 {
		p.Limit = 50
	}
	if p.Limit > 200 {
		p.Limit = 200
	}
	return p
}
