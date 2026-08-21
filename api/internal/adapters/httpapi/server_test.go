package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/sakuplan/api/internal/application"
	"github.com/sakuplan/api/internal/domain"
	"github.com/sakuplan/api/internal/ports"
	"github.com/sakuplan/api/internal/testkit"
)

type testAccess struct{}

func (testAccess) Issue(userID string, role domain.UserRole, now time.Time) (string, time.Time, error) {
	return "access:" + userID, now.Add(15 * time.Minute), nil
}

func (testAccess) Parse(raw string, _ time.Time) (ports.AccessClaims, error) {
	userID, ok := strings.CutPrefix(raw, "access:")
	if !ok || userID == "" {
		return ports.AccessClaims{}, domain.ErrUnauthorized
	}
	return ports.AccessClaims{UserID: userID, Role: domain.RoleUser}, nil
}

type testFixtures struct {
	Users        *testkit.Users
	Accounts     *testkit.Accounts
	Categories   *testkit.Categories
	Transactions *testkit.Transactions
	Budgets      *testkit.Budgets
	Bills        *testkit.Bills
	Goals        *testkit.Goals
}

func newTestServer() (*Server, *testFixtures) {
	clock := testkit.Clock{Time: time.Date(2026, 7, 24, 4, 0, 0, 0, time.UTC)}
	ids := &testkit.IDs{}
	users := testkit.NewUsers()
	sessions := testkit.NewSessions()
	accounts := testkit.NewAccounts()
	categories := testkit.NewCategories()
	transactions := testkit.NewTransactions(accounts)
	budgets := testkit.NewBudgets()
	bills := &testkit.Bills{NextErr: domain.ErrNotFound}
	goals := testkit.NewGoals()
	refresh := &testkit.Refresh{}
	access := testAccess{}

	audits := &testkit.Audits{}
	auth := application.NewAuthService(users, sessions, audits, testkit.Hasher{}, access, refresh, testkit.UOW{}, clock, ids, 30*24*time.Hour)
	profileService := application.NewUserService(users, audits, clock, ids)
	accountService := application.NewAccountService(accounts, clock, ids)
	categoryService := application.NewCategoryService(categories, clock, ids)
	transactionService := application.NewTransactionService(transactions, accounts, categories, testkit.UOW{}, clock, ids)
	budgetService := application.NewBudgetService(budgets, categories, clock, ids)
	billService := application.NewBillService(bills, accounts, categories, transactions, testkit.UOW{}, clock, ids)
	goalService := application.NewGoalService(goals, accounts, transactions, testkit.UOW{}, clock, ids)
	planningService := application.NewPlanningService(accounts, budgets, bills, goals, clock)
	recommendationService := application.NewRecommendationService()
	reportingService := application.NewReportingService(accounts, budgets, bills, goals, categories, transactions, planningService, clock)

	server := NewServer(Services{
		Auth:            auth,
		Profiles:        profileService,
		Accounts:        accountService,
		Categories:      categoryService,
		Transactions:    transactionService,
		Budgets:         budgetService,
		Bills:           billService,
		Goals:           goalService,
		Planning:        planningService,
		Recommendations: recommendationService,
		Reporting:       reportingService,
	}, access, ids, clock, nil, slog.New(slog.NewTextHandler(io.Discard, nil)))
	return server, &testFixtures{Users: users, Accounts: accounts, Categories: categories, Transactions: transactions, Budgets: budgets, Bills: bills, Goals: goals}
}

func requestJSON(t *testing.T, app *fiber.App, method, path, token string, body any) (*http.Response, []byte) {
	t.Helper()
	return requestJSONWithHeaders(t, app, method, path, token, body, nil)
}

func requestJSONWithHeaders(t *testing.T, app *fiber.App, method, path, token string, body any, headers map[string]string) (*http.Response, []byte) {
	t.Helper()
	var payload io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			t.Fatal(err)
		}
		payload = bytes.NewReader(encoded)
	}
	req, err := http.NewRequestWithContext(context.Background(), method, path, payload)
	if err != nil {
		t.Fatal(err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatal(err)
	}
	_ = resp.Body.Close()
	return resp, responseBody
}

func TestHealthz(t *testing.T) {
	server, _ := newTestServer()
	resp, body := requestJSON(t, server.App(), http.MethodGet, "/healthz", "", nil)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d body=%s", resp.StatusCode, body)
	}
	if got := resp.Header.Get("X-Request-ID"); got == "" {
		t.Fatal("expected X-Request-ID")
	}
}

func TestRegisterAndCreateAccount(t *testing.T) {
	server, _ := newTestServer()
	resp, body := requestJSON(t, server.App(), http.MethodPost, "/v1/auth/register", "", map[string]any{
		"email":                    "rian@example.com",
		"password":                 "strong-password",
		"display_name":             "Rian",
		"accepted_terms_version":   "2026-08-02",
		"accepted_privacy_version": "2026-08-02",
	})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("register status=%d body=%s", resp.StatusCode, body)
	}
	var tokens struct {
		AccessToken string `json:"access_token"`
		User        struct {
			ID string `json:"id"`
		} `json:"user"`
	}
	if err := json.Unmarshal(body, &tokens); err != nil {
		t.Fatal(err)
	}
	if tokens.AccessToken == "" || tokens.User.ID == "" {
		t.Fatalf("unexpected response: %s", body)
	}

	resp, body = requestJSON(t, server.App(), http.MethodPost, "/v1/accounts", tokens.AccessToken, map[string]any{
		"name":            "Mandiri",
		"type":            "bank",
		"currency":        "IDR",
		"initial_balance": 1_000_000,
		"spendable":       true,
	})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("create account status=%d body=%s", resp.StatusCode, body)
	}
	var account accountResponse
	if err := json.Unmarshal(body, &account); err != nil {
		t.Fatal(err)
	}
	if account.Name != "Mandiri" || account.InitialBalance != 1_000_000 {
		t.Fatalf("unexpected account: %+v", account)
	}
}

func TestProtectedRouteRejectsMissingBearerToken(t *testing.T) {
	server, _ := newTestServer()
	resp, body := requestJSON(t, server.App(), http.MethodGet, "/v1/accounts", "", nil)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status=%d body=%s", resp.StatusCode, body)
	}
	var envelope struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		t.Fatal(err)
	}
	if envelope.Error.Code != "UNAUTHORIZED" {
		t.Fatalf("unexpected error: %s", body)
	}
}

func TestTransactionAndReversalHTTPFlow(t *testing.T) {
	server, _ := newTestServer()
	_, registerBody := requestJSON(t, server.App(), http.MethodPost, "/v1/auth/register", "", map[string]any{
		"email":                    "ledger@example.com",
		"password":                 "strong-password",
		"display_name":             "Ledger User",
		"accepted_terms_version":   "2026-08-02",
		"accepted_privacy_version": "2026-08-02",
	})
	var tokens struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(registerBody, &tokens); err != nil {
		t.Fatal(err)
	}

	_, accountBody := requestJSON(t, server.App(), http.MethodPost, "/v1/accounts", tokens.AccessToken, map[string]any{
		"name":            "Cash",
		"type":            "cash",
		"currency":        "IDR",
		"initial_balance": 500000,
		"spendable":       true,
	})
	var account accountResponse
	if err := json.Unmarshal(accountBody, &account); err != nil {
		t.Fatal(err)
	}

	_, categoryBody := requestJSON(t, server.App(), http.MethodPost, "/v1/categories", tokens.AccessToken, map[string]any{
		"name": "Food",
		"kind": "expense",
		"icon": "utensils",
	})
	var category categoryResponse
	if err := json.Unmarshal(categoryBody, &category); err != nil {
		t.Fatal(err)
	}

	resp, transactionBody := requestJSONWithHeaders(t, server.App(), http.MethodPost, "/v1/transactions", tokens.AccessToken, map[string]any{
		"type":        "expense",
		"account_id":  account.ID,
		"category_id": category.ID,
		"amount":      125000,
	}, map[string]string{"Idempotency-Key": "expense-http-001"})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("create transaction status=%d body=%s", resp.StatusCode, transactionBody)
	}
	var transaction transactionResponse
	if err := json.Unmarshal(transactionBody, &transaction); err != nil {
		t.Fatal(err)
	}

	resp, reversalBody := requestJSONWithHeaders(t, server.App(), http.MethodPost, "/v1/transactions/"+transaction.ID+"/reverse", tokens.AccessToken, map[string]any{
		"reason": "duplicate entry",
	}, map[string]string{"Idempotency-Key": "reverse-http-001"})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("reverse transaction status=%d body=%s", resp.StatusCode, reversalBody)
	}
	var reversal transactionResponse
	if err := json.Unmarshal(reversalBody, &reversal); err != nil {
		t.Fatal(err)
	}
	if reversal.Type != domain.TransactionReversal || reversal.ReversesID != transaction.ID {
		t.Fatalf("unexpected reversal: %+v", reversal)
	}

	resp, balanceBody := requestJSON(t, server.App(), http.MethodGet, "/v1/accounts/"+account.ID+"/balance", tokens.AccessToken, nil)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("balance status=%d body=%s", resp.StatusCode, balanceBody)
	}
	var balance struct {
		Balance domain.Money `json:"balance"`
	}
	if err := json.Unmarshal(balanceBody, &balance); err != nil {
		t.Fatal(err)
	}
	if balance.Balance != 500000 {
		t.Fatalf("expected restored balance, got %d", balance.Balance)
	}
}

func TestBillMarkPaidHTTPFlow(t *testing.T) {
	server, _ := newTestServer()
	_, registerBody := requestJSON(t, server.App(), http.MethodPost, "/v1/auth/register", "", map[string]any{
		"email":                    "bills@example.com",
		"password":                 "strong-password",
		"display_name":             "Bills User",
		"accepted_terms_version":   "2026-08-02",
		"accepted_privacy_version": "2026-08-02",
	})
	var tokens struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(registerBody, &tokens); err != nil {
		t.Fatal(err)
	}

	_, accountBody := requestJSON(t, server.App(), http.MethodPost, "/v1/accounts", tokens.AccessToken, map[string]any{
		"name": "Cash", "type": "cash", "currency": "IDR", "initial_balance": 500000, "spendable": true,
	})
	var account accountResponse
	if err := json.Unmarshal(accountBody, &account); err != nil {
		t.Fatal(err)
	}

	_, categoryBody := requestJSON(t, server.App(), http.MethodPost, "/v1/categories", tokens.AccessToken, map[string]any{
		"name": "Utilities", "kind": "expense",
	})
	var category categoryResponse
	if err := json.Unmarshal(categoryBody, &category); err != nil {
		t.Fatal(err)
	}

	_, billBody := requestJSON(t, server.App(), http.MethodPost, "/v1/bills", tokens.AccessToken, map[string]any{
		"name": "Iuran RT", "amount": 150000, "due_day": 5, "frequency": "monthly", "category_id": category.ID, "account_id": account.ID,
	})
	var bill billResponse
	if err := json.Unmarshal(billBody, &bill); err != nil {
		t.Fatal(err)
	}

	resp, occurrenceBody := requestJSONWithHeaders(t, server.App(), http.MethodPost, "/v1/bills/"+bill.ID+"/occurrences", tokens.AccessToken, map[string]any{
		"due_date": "2026-08-05T00:00:00Z",
	}, map[string]string{"Idempotency-Key": "bill-pay-http-001"})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("mark bill paid status=%d body=%s", resp.StatusCode, occurrenceBody)
	}
	var occurrence billOccurrenceResponse
	if err := json.Unmarshal(occurrenceBody, &occurrence); err != nil {
		t.Fatal(err)
	}
	if occurrence.BillID != bill.ID || occurrence.TransactionID == "" {
		t.Fatalf("unexpected occurrence: %+v", occurrence)
	}

	resp, balanceBody := requestJSON(t, server.App(), http.MethodGet, "/v1/accounts/"+account.ID+"/balance", tokens.AccessToken, nil)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("balance status=%d body=%s", resp.StatusCode, balanceBody)
	}
	var balance struct {
		Balance domain.Money `json:"balance"`
	}
	if err := json.Unmarshal(balanceBody, &balance); err != nil {
		t.Fatal(err)
	}
	if balance.Balance != 350000 {
		t.Fatalf("expected balance debited by the bill amount, got %d", balance.Balance)
	}

	resp, listBody := requestJSON(t, server.App(), http.MethodGet, "/v1/bills", tokens.AccessToken, nil)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("list bills status=%d body=%s", resp.StatusCode, listBody)
	}
	var list struct {
		Data []billResponse `json:"data"`
	}
	if err := json.Unmarshal(listBody, &list); err != nil {
		t.Fatal(err)
	}
	if len(list.Data) != 1 || list.Data[0].LastPaidDueDate == nil {
		t.Fatalf("expected listed bill to report last_paid_due_date, got %+v", list.Data)
	}
}

func TestUnknownRouteReturnsFramework404Envelope(t *testing.T) {
	server, _ := newTestServer()
	resp, body := requestJSON(t, server.App(), http.MethodGet, "/does-not-exist", "", nil)
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status=%d body=%s", resp.StatusCode, body)
	}
	var envelope struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		t.Fatal(err)
	}
	if envelope.Error.Code != "HTTP_ERROR" {
		t.Fatalf("unexpected envelope: %s", body)
	}
}

func TestUpdateProfileHTTPFlow(t *testing.T) {
	server, _ := newTestServer()
	_, body := requestJSON(t, server.App(), http.MethodPost, "/v1/auth/register", "", map[string]any{
		"email":                    "profile@example.com",
		"password":                 "strong-password",
		"display_name":             "Initial",
		"accepted_terms_version":   "2026-08-02",
		"accepted_privacy_version": "2026-08-02",
	})
	var tokens struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(body, &tokens); err != nil {
		t.Fatal(err)
	}

	resp, body := requestJSON(t, server.App(), http.MethodPut, "/v1/me", tokens.AccessToken, map[string]any{
		"display_name":   "Rian",
		"currency":       "IDR",
		"timezone":       "Asia/Jakarta",
		"payday":         25,
		"minimum_buffer": 500000,
		"ai_consent":     true,
	})
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d body=%s", resp.StatusCode, body)
	}
	var user userResponse
	if err := json.Unmarshal(body, &user); err != nil {
		t.Fatal(err)
	}
	if user.DisplayName != "Rian" || user.MinimumBuffer != 500000 || !user.AIConsent {
		t.Fatalf("unexpected profile: %+v", user)
	}
}
