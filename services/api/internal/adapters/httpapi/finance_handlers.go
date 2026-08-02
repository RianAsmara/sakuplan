package httpapi

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/sakuplan/api/internal/application"
	"github.com/sakuplan/api/internal/domain"
)

type createAccountRequest struct {
	Name           string             `json:"name"`
	Type           domain.AccountType `json:"type"`
	Currency       string             `json:"currency"`
	InitialBalance domain.Money       `json:"initial_balance"`
	Spendable      bool               `json:"spendable"`
}

func (s *Server) createAccount(c fiber.Ctx) error {
	var req createAccountRequest
	if err := c.Bind().Body(&req); err != nil {
		return domain.ErrInvalidInput
	}
	v, err := s.svc.Accounts.Create(c, userID(c), application.CreateAccountInput{Name: req.Name, Type: req.Type, Currency: req.Currency, InitialBalance: req.InitialBalance, Spendable: req.Spendable})
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(mapAccount(v))
}
func (s *Server) listAccounts(c fiber.Ctx) error {
	items, err := s.svc.Accounts.List(c, userID(c), boolQuery(c, "include_archived"))
	if err != nil {
		return err
	}
	out := make([]accountResponse, 0, len(items))
	for _, v := range items {
		out = append(out, mapAccount(v))
	}
	return c.JSON(fiber.Map{"data": out})
}
func (s *Server) getAccount(c fiber.Ctx) error {
	v, err := s.svc.Accounts.Get(c, userID(c), c.Params("id"))
	if err != nil {
		return err
	}
	return c.JSON(mapAccount(v))
}
func (s *Server) getAccountBalance(c fiber.Ctx) error {
	v, err := s.svc.Accounts.Balance(c, userID(c), c.Params("id"))
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"account_id": c.Params("id"), "balance": v})
}
func (s *Server) archiveAccount(c fiber.Ctx) error {
	if err := s.svc.Accounts.Archive(c, userID(c), c.Params("id")); err != nil {
		return err
	}
	return c.SendStatus(fiber.StatusNoContent)
}

type createCategoryRequest struct {
	Name string              `json:"name"`
	Kind domain.CategoryKind `json:"kind"`
	Icon string              `json:"icon"`
}

func (s *Server) createCategory(c fiber.Ctx) error {
	var req createCategoryRequest
	if err := c.Bind().Body(&req); err != nil {
		return domain.ErrInvalidInput
	}
	v, err := s.svc.Categories.Create(c, userID(c), req.Name, req.Kind, req.Icon)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(mapCategory(v))
}
func (s *Server) listCategories(c fiber.Ctx) error {
	items, err := s.svc.Categories.List(c, userID(c), domain.CategoryKind(c.Query("kind")), boolQuery(c, "include_archived"))
	if err != nil {
		return err
	}
	out := make([]categoryResponse, 0, len(items))
	for _, v := range items {
		out = append(out, mapCategory(v))
	}
	return c.JSON(fiber.Map{"data": out})
}
func (s *Server) archiveCategory(c fiber.Ctx) error {
	if err := s.svc.Categories.Archive(c, userID(c), c.Params("id")); err != nil {
		return err
	}
	return c.SendStatus(fiber.StatusNoContent)
}

type createTransactionRequest struct {
	AccountID     string                 `json:"account_id"`
	DestinationID string                 `json:"destination_account_id"`
	CategoryID    string                 `json:"category_id"`
	Amount        domain.Money           `json:"amount"`
	OccurredAt    time.Time              `json:"occurred_at"`
	Note          string                 `json:"note"`
	Reason        string                 `json:"reason"`
	Type          domain.TransactionType `json:"type"`
}

func (s *Server) createTransaction(c fiber.Ctx) error {
	var req createTransactionRequest
	if err := c.Bind().Body(&req); err != nil {
		return domain.ErrInvalidInput
	}
	v, err := s.svc.Transactions.Create(c, userID(c), application.CreateTransactionInput{AccountID: req.AccountID, DestinationID: req.DestinationID, CategoryID: req.CategoryID, Amount: req.Amount, OccurredAt: req.OccurredAt, Note: req.Note, Reason: req.Reason, Type: req.Type, IdempotencyKey: c.Get("Idempotency-Key")})
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(mapTransaction(v))
}
func (s *Server) listTransactions(c fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	items, next, err := s.svc.Transactions.List(c, userID(c), domain.Page{Limit: limit, Cursor: c.Query("cursor")})
	if err != nil {
		return err
	}
	out := make([]transactionResponse, 0, len(items))
	for _, v := range items {
		out = append(out, mapTransaction(v))
	}
	return c.JSON(fiber.Map{"data": out, "next_cursor": next})
}
func (s *Server) getTransaction(c fiber.Ctx) error {
	v, err := s.svc.Transactions.Get(c, userID(c), c.Params("id"))
	if err != nil {
		return err
	}
	return c.JSON(mapTransaction(v))
}

type reverseTransactionRequest struct {
	Reason string `json:"reason"`
}

func (s *Server) reverseTransaction(c fiber.Ctx) error {
	var req reverseTransactionRequest
	if err := c.Bind().Body(&req); err != nil {
		return domain.ErrInvalidInput
	}
	v, err := s.svc.Transactions.Reverse(c, userID(c), c.Params("id"), application.ReverseTransactionInput{
		Reason:         req.Reason,
		IdempotencyKey: c.Get("Idempotency-Key"),
	})
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(mapTransaction(v))
}
