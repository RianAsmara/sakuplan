package application

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/sakuplan/api/internal/domain"
	"github.com/sakuplan/api/internal/ports"
)

type TransactionService struct {
	txs        domain.TransactionRepository
	accounts   domain.AccountRepository
	categories domain.CategoryRepository
	uow        ports.UnitOfWork
	clock      ports.Clock
	ids        ports.IDGenerator
}

func NewTransactionService(txs domain.TransactionRepository, accounts domain.AccountRepository, categories domain.CategoryRepository, uow ports.UnitOfWork, clock ports.Clock, ids ports.IDGenerator) *TransactionService {
	return &TransactionService{txs: txs, accounts: accounts, categories: categories, uow: uow, clock: clock, ids: ids}
}

type CreateTransactionInput struct {
	AccountID      string                 `json:"account_id"`
	DestinationID  string                 `json:"destination_account_id,omitempty"`
	CategoryID     string                 `json:"category_id,omitempty"`
	Amount         domain.Money           `json:"amount"`
	OccurredAt     time.Time              `json:"occurred_at"`
	Note           string                 `json:"note,omitempty"`
	Reason         string                 `json:"reason,omitempty"`
	Type           domain.TransactionType `json:"type"`
	IdempotencyKey string                 `json:"-"`
}

func (s *TransactionService) Create(ctx context.Context, userID string, in CreateTransactionInput) (domain.Transaction, error) {
	in.IdempotencyKey = strings.TrimSpace(in.IdempotencyKey)
	in.Note = strings.TrimSpace(in.Note)
	in.Reason = strings.TrimSpace(in.Reason)
	if in.Amount <= 0 || in.AccountID == "" || len(in.Note) > 500 || len(in.Reason) > 500 || !validIdempotencyKey(in.IdempotencyKey) {
		return domain.Transaction{}, domain.ErrInvalidInput
	}
	if in.OccurredAt.IsZero() {
		in.OccurredAt = s.clock.Now()
	}
	operation := "transaction.create." + string(in.Type)
	hash, err := canonicalHash(in)
	if err != nil {
		return domain.Transaction{}, err
	}
	if existing, err := s.txs.GetByIdempotency(ctx, userID, operation, in.IdempotencyKey); err == nil {
		if existing.RequestHash != hash {
			return domain.Transaction{}, domain.ErrIdempotencyConflict
		}
		return existing, nil
	} else if !errors.Is(err, domain.ErrNotFound) {
		return domain.Transaction{}, err
	}

	var created domain.Transaction
	err = s.uow.WithinTransaction(ctx, func(txctx context.Context) error {
		source, err := s.accounts.Get(txctx, userID, in.AccountID)
		if err != nil {
			return err
		}
		if source.ArchivedAt != nil {
			return domain.ErrConflict
		}
		tx := domain.Transaction{ID: s.ids.New(), UserID: userID, Type: in.Type, CategoryID: in.CategoryID, Amount: in.Amount, OccurredAt: in.OccurredAt, Note: strings.TrimSpace(in.Note), Reason: strings.TrimSpace(in.Reason), IdempotencyKey: in.IdempotencyKey, IdempotencyOperation: operation, RequestHash: hash, CreatedAt: s.clock.Now()}
		switch in.Type {
		case domain.TransactionIncome:
			if err := s.validateCategory(txctx, userID, in.CategoryID, domain.CategoryIncome); err != nil {
				return err
			}
			tx.Entries = []domain.TransactionEntry{{ID: s.ids.New(), TransactionID: tx.ID, AccountID: source.ID, Direction: domain.EntryCredit, Amount: in.Amount}}
		case domain.TransactionExpense:
			if err := s.validateCategory(txctx, userID, in.CategoryID, domain.CategoryExpense); err != nil {
				return err
			}
			tx.Entries = []domain.TransactionEntry{{ID: s.ids.New(), TransactionID: tx.ID, AccountID: source.ID, Direction: domain.EntryDebit, Amount: in.Amount}}
		case domain.TransactionTransfer:
			if in.DestinationID == "" || in.DestinationID == in.AccountID {
				return domain.ErrSameAccountTransfer
			}
			destination, err := s.accounts.Get(txctx, userID, in.DestinationID)
			if err != nil {
				return err
			}
			if destination.ArchivedAt != nil || destination.Currency != source.Currency {
				return domain.ErrConflict
			}
			tx.Entries = []domain.TransactionEntry{
				{ID: s.ids.New(), TransactionID: tx.ID, AccountID: source.ID, Direction: domain.EntryDebit, Amount: in.Amount},
				{ID: s.ids.New(), TransactionID: tx.ID, AccountID: destination.ID, Direction: domain.EntryCredit, Amount: in.Amount},
			}
		case domain.TransactionAdjustment:
			if tx.Reason == "" {
				return fmt.Errorf("%w: adjustment reason required", domain.ErrInvalidInput)
			}
			direction := domain.EntryCredit
			if strings.HasPrefix(tx.Reason, "debit:") {
				direction = domain.EntryDebit
			}
			tx.Entries = []domain.TransactionEntry{{ID: s.ids.New(), TransactionID: tx.ID, AccountID: source.ID, Direction: direction, Amount: in.Amount}}
		default:
			return domain.ErrInvalidInput
		}
		created, err = s.txs.Create(txctx, tx)
		return err
	})
	return created, err
}

func (s *TransactionService) List(ctx context.Context, userID string, page domain.Page) ([]domain.Transaction, string, error) {
	return s.txs.List(ctx, userID, page.Normalized())
}

func (s *TransactionService) Get(ctx context.Context, userID, id string) (domain.Transaction, error) {
	return s.txs.Get(ctx, userID, id)
}

func (s *TransactionService) validateCategory(ctx context.Context, userID, id string, expected domain.CategoryKind) error {
	if id == "" {
		return domain.ErrInvalidInput
	}
	cat, err := s.categories.Get(ctx, userID, id)
	if err != nil {
		return err
	}
	if cat.Kind != expected || cat.ArchivedAt != nil {
		return domain.ErrInvalidInput
	}
	return nil
}

func validIdempotencyKey(key string) bool {
	n := len(key)
	return n >= 8 && n <= 128
}

func canonicalHash(v any) (string, error) {
	b, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:]), nil
}

type ReverseTransactionInput struct {
	Reason         string `json:"reason"`
	IdempotencyKey string `json:"-"`
}

func (s *TransactionService) Reverse(ctx context.Context, userID, transactionID string, in ReverseTransactionInput) (domain.Transaction, error) {
	in.Reason = strings.TrimSpace(in.Reason)
	in.IdempotencyKey = strings.TrimSpace(in.IdempotencyKey)
	if transactionID == "" || in.Reason == "" || len(in.Reason) > 500 || !validIdempotencyKey(in.IdempotencyKey) {
		return domain.Transaction{}, domain.ErrInvalidInput
	}
	operation := "transaction.reverse"
	hash, err := canonicalHash(struct {
		TransactionID string `json:"transaction_id"`
		Reason        string `json:"reason"`
	}{TransactionID: transactionID, Reason: in.Reason})
	if err != nil {
		return domain.Transaction{}, err
	}
	if existing, err := s.txs.GetByIdempotency(ctx, userID, operation, in.IdempotencyKey); err == nil {
		if existing.RequestHash != hash {
			return domain.Transaction{}, domain.ErrIdempotencyConflict
		}
		return existing, nil
	} else if !errors.Is(err, domain.ErrNotFound) {
		return domain.Transaction{}, err
	}

	var created domain.Transaction
	err = s.uow.WithinTransaction(ctx, func(txctx context.Context) error {
		original, err := s.txs.Get(txctx, userID, transactionID)
		if err != nil {
			return err
		}
		if original.Type == domain.TransactionReversal || original.ReversedByID != "" {
			return domain.ErrConflict
		}
		now := s.clock.Now()
		reversal := domain.Transaction{
			ID:                   s.ids.New(),
			UserID:               userID,
			Type:                 domain.TransactionReversal,
			CategoryID:           original.CategoryID,
			Amount:               original.Amount,
			OccurredAt:           now,
			Reason:               in.Reason,
			ReversesID:           original.ID,
			IdempotencyKey:       in.IdempotencyKey,
			IdempotencyOperation: operation,
			RequestHash:          hash,
			CreatedAt:            now,
		}
		for _, entry := range original.Entries {
			direction := domain.EntryDebit
			if entry.Direction == domain.EntryDebit {
				direction = domain.EntryCredit
			}
			reversal.Entries = append(reversal.Entries, domain.TransactionEntry{
				ID:            s.ids.New(),
				TransactionID: reversal.ID,
				AccountID:     entry.AccountID,
				Direction:     direction,
				Amount:        entry.Amount,
			})
		}
		created, err = s.txs.Reverse(txctx, original.ID, reversal)
		return err
	})
	return created, err
}
