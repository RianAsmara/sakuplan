---
title: SakuPlan CI and Quality Gates
project: SakuPlan
type: quality
status: active
tags:
  - project/sakuplan
  - quality/ci
source: repository
last_synced: 2026-07-29
---

# CI and Quality Gates

Source: `.github/workflows/backend.yml`.

## Workflow: `Backend`

Triggers: `push` and `pull_request`, filtered by `paths:` (`api/**`, `.github/workflows/backend.yml`, `Taskfile.yml`) — no branch filter. `permissions: contents: read`.

### Job: `lint`
`golangci/golangci-lint-action@v9`, `version: v2.12`, `working-directory: api`, Go `1.26.5` via `actions/setup-go@v6`.

### Job: `verify`
Working directory `api`, Go `1.26.5`. Steps in order:
1. `go mod download`
2. Format check: `test -z "$(find . -name '*.go' -type f -print0 | xargs -0 gofmt -l)"`
3. `go vet ./...`
4. `go test -count=1 ./...` (unit + adapter tests)
5. `go test -race -count=1 ./internal/...`
6. `go test -tags=integration -count=1 ./tests/integration/...` (Testcontainers, needs Docker — GitHub-hosted runners provide it)
7. `CGO_ENABLED=0 go build -trimpath ./cmd/api`
8. `go run golang.org/x/vuln/cmd/govulncheck@latest ./...`

**No OpenAPI-spec validation step exists in CI** — confirmed only one workflow file exists (`backend.yml`), no spectral/openapi-lint job.

## Local equivalent (`Taskfile.yml`)

`task verify` runs `fmt:check`, `vet`, `test`, `test:race`, `build` (does **not** include `test:integration`, `lint`, or `govulncheck` — those are separate tasks: `task test:integration`, `task lint`, and the manual `govulncheck` command). CLAUDE.md's repository-commands list mirrors this: `bootstrap`, `infra:up`, `migrate:up`, `run`, `verify`, `test:integration`.

## Last known-good run (`docs/PROGRESS.md`, 2026-07-24)

| Command | Result |
|---|---|
| `task bootstrap` | PASS |
| `task infra:up` | PASS |
| `task migrate:up` | PASS (migration version 1) |
| `task verify` | Initially **FAILED** on `go vet` (`fiber.Config.DisableStartupMessage` moved to `fiber.ListenConfig` in pinned `fiber/v3 v3.4.0`), then PASS after the source fix — see [[Dependency Injection]] |
| `task test:integration` | PASS (9.54s, real Postgres via Testcontainers) |
| `task lint` | **FAILS** — 27 pre-existing findings, none fixed in that pass — see [[Security Controls]] |
| `govulncheck ./...` | PASS — 0 reachable vulnerabilities |
| `task coverage` | Generated — see [[Test Coverage]] |

**This is a recorded snapshot, not a live result.** The README's "Verification" section lists `task lint` as a normal step without noting it currently fails — following the README's happy path today would hit an unexpected lint failure unless the 27 findings have since been addressed. Re-run to confirm current state.

## Related notes

- [[Testing Strategy]]
- [[Test Coverage]]
- [[Security Controls]]
- [[Implementation Status]]
- [[SakuPlan]]
