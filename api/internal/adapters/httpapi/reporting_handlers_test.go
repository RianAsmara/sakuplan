package httpapi

import (
	"encoding/json"
	"net/http"
	"testing"
)

func registerTestUser(t *testing.T, server *Server, email string) string {
	t.Helper()
	resp, body := requestJSON(t, server.App(), http.MethodPost, "/v1/auth/register", "", map[string]any{
		"email":                    email,
		"password":                 "strong-password",
		"display_name":             "Reporting User",
		"accepted_terms_version":   "2026-08-02",
		"accepted_privacy_version": "2026-08-02",
	})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("register status=%d body=%s", resp.StatusCode, body)
	}
	var tokens struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(body, &tokens); err != nil {
		t.Fatal(err)
	}
	return tokens.AccessToken
}

func TestDashboardRejectsMissingBearerToken(t *testing.T) {
	server, _ := newTestServer()
	resp, body := requestJSON(t, server.App(), http.MethodGet, "/v1/dashboard", "", nil)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status=%d body=%s", resp.StatusCode, body)
	}
}

func TestDashboardHTTPFlow(t *testing.T) {
	server, _ := newTestServer()
	token := registerTestUser(t, server, "dashboard@example.com")

	resp, accountBody := requestJSON(t, server.App(), http.MethodPost, "/v1/accounts", token, map[string]any{
		"name": "Cash", "type": "cash", "currency": "IDR", "initial_balance": 1_000_000, "spendable": true,
	})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("create account status=%d body=%s", resp.StatusCode, accountBody)
	}

	resp, body := requestJSON(t, server.App(), http.MethodGet, "/v1/dashboard", token, nil)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("dashboard status=%d body=%s", resp.StatusCode, body)
	}
	var got dashboardResponse
	if err := json.Unmarshal(body, &got); err != nil {
		t.Fatalf("unexpected body shape (expected a bare object, not a {data:} envelope): %v, body=%s", err, body)
	}
	if got.LiquidBalance != 1_000_000 {
		t.Fatalf("expected liquid balance 1000000, got %d", got.LiquidBalance)
	}
	if got.TopCategories == nil {
		t.Fatal("expected top_categories to be present (even if empty), got nil")
	}
}

func TestCashFlowReportInvalidGroupByRejected(t *testing.T) {
	server, _ := newTestServer()
	token := registerTestUser(t, server, "cashflow-invalid@example.com")

	resp, body := requestJSON(t, server.App(), http.MethodGet, "/v1/reports/cash-flow?group_by=month", token, nil)
	if resp.StatusCode != http.StatusBadRequest {
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
	if envelope.Error.Code != "INVALID_REQUEST" {
		t.Fatalf("unexpected error code: %s", body)
	}
}

func TestCashFlowReportDefaultRangeHTTPFlow(t *testing.T) {
	server, _ := newTestServer()
	token := registerTestUser(t, server, "cashflow@example.com")

	resp, body := requestJSON(t, server.App(), http.MethodGet, "/v1/reports/cash-flow", token, nil)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d body=%s", resp.StatusCode, body)
	}
	var got cashFlowReportResponse
	if err := json.Unmarshal(body, &got); err != nil {
		t.Fatal(err)
	}
	if got.GroupBy != "day" {
		t.Fatalf("expected default group_by=day, got %q", got.GroupBy)
	}
	if got.Start.IsZero() || got.End.IsZero() {
		t.Fatalf("expected a resolved default date range, got %+v", got)
	}
}

func TestCreateExportHTTPFlow(t *testing.T) {
	server, _ := newTestServer()
	token := registerTestUser(t, server, "export@example.com")

	resp, accountBody := requestJSON(t, server.App(), http.MethodPost, "/v1/accounts", token, map[string]any{
		"name": "Cash", "type": "cash", "currency": "IDR", "initial_balance": 250_000, "spendable": true,
	})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("create account status=%d body=%s", resp.StatusCode, accountBody)
	}

	resp, body := requestJSON(t, server.App(), http.MethodPost, "/v1/exports", token, nil)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("export status=%d body=%s", resp.StatusCode, body)
	}
	var got exportResponse
	if err := json.Unmarshal(body, &got); err != nil {
		t.Fatal(err)
	}
	if got.Profile.Email != "export@example.com" {
		t.Fatalf("expected exported profile, got %+v", got.Profile)
	}
	if len(got.Accounts) != 1 {
		t.Fatalf("expected 1 account in export, got %d", len(got.Accounts))
	}
	if got.GeneratedAt.IsZero() {
		t.Fatal("expected generated_at to be set")
	}
}
