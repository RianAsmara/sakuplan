---
title: SakuPlan Observability
project: SakuPlan
type: engineering
status: active
tags:
  - project/sakuplan
  - engineering/observability
source: repository
last_synced: 2026-07-29
---

# Observability

Source: `internal/adapters/httpapi/server.go` (`requestContext`, `errorHandler`), `internal/bootstrap/app.go` (`newLogger`). Requirement: `NFR-005`.

## Implemented ✅

- **Structured logging** via `log/slog`. `newLogger(cfg)`: `slog.NewTextHandler(os.Stdout, ...)` when `APP_ENV=development`, else `slog.NewJSONHandler(os.Stdout, ...)`. Level is always `slog.LevelInfo` in both branches.
- **Request ID propagation**: `requestContext` middleware honors an incoming `X-Request-ID` header or generates one via `ports.IDGenerator` (UUIDv4); stores it in Fiber `Locals`; echoes it back in the response header.
- **Per-request access log**: one structured `"http_request"` line per request (method, path, status, duration_ms, request_id), emitted after the handler (and error handler, if any) has run.
- **Error logging**: 5xx responses are separately logged via `slog.Error("request_failed", "request_id", ..., "error", err)` — the raw error never reaches the client body, only server logs and only for `≥500` statuses.
- **Health endpoints**: `/healthz`, `/livez` (process liveness, no dependency check) and `/readyz` (pings the Postgres pool via `ports.HealthChecker`).

## Not implemented 🚧

- **Metrics** (request rate/latency/error rate, DB pool stats, refresh-token reuse rate, job retries, recommendation failures) — no Prometheus or any metrics library integrated.
- **Distributed tracing** — `go.mod` has OpenTelemetry packages only as **transitive/indirect** dependencies; nothing in `internal/` imports or initializes an OTel tracer/exporter.
- **Trace ID propagation** — only a request ID exists, no separate trace ID / span concept.

This matches the P0 gap analysis verdict: NFR-005 is "Partial — JSON logs + request ID present... no Prometheus metrics."

## Related notes

- [[System Architecture]]
- [[Security Controls]]
- [[Remaining Work]]
- [[SakuPlan]]
