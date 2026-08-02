---
title: SakuPlan Migrations
project: SakuPlan
type: data
status: active
tags:
  - project/sakuplan
  - data/migrations
source: repository
last_synced: 2026-07-29
---

# Migrations

Source: `services/api/db/migrations/`, `Taskfile.yml` (`migrate:up`/`migrate:down` tasks).

## Tooling

- **Goose v3.27.3** (`github.com/pressly/goose/v3/cmd/goose`), invoked via `go run` (no separate install step).
- Command: `task migrate:up` → `cd services/api && go run github.com/pressly/goose/v3/cmd/goose@v3.27.3 -dir db/migrations postgres "$DATABASE_URL" up`.
- `task migrate:down` rolls back exactly one migration.
- `CLAUDE.md` / README rule: **never edit a released migration — add a new numbered one instead.**

## Current state

Exactly **one** migration file: `db/migrations/00001_core.sql` (goose-style `-- +goose Up` / `-- +goose Down` markers). It creates every table described in [[Database Model]], all enum types, the `citext` and `btree_gist` extensions, and seeds 9 default categories with fixed UUIDs (`00000000-0000-4000-8000-0000000000xx`). At last verification (`docs/PROGRESS.md`, 2026-07-24) the local database was at migration version 1.

## Related notes

- [[Database Model]]
- [[Database Operations]]
- [[SakuPlan]]
