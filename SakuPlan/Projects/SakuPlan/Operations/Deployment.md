---
title: SakuPlan Deployment
project: SakuPlan
type: operations
status: planned
tags:
  - project/sakuplan
  - operations/deployment
source: repository
last_synced: 2026-07-29
---

# Deployment

**Status: no production deployment exists.** This note records the documented intent only.

## What's documented

- PRD §21: containers preferred, managed PostgreSQL preferred for production.
- `docs/ARCHITECTURE.md` §6: "Production may migrate JWT signing to asymmetric keys or managed KMS without changing application interfaces" — i.e. HS256 is an explicit MVP choice, not a permanent one.
- `NFR-003`: modular monolith must support horizontal API replicas; no correctness-critical state may live only in process memory — consistent with the current design (PostgreSQL is the sole source of truth, no in-memory caches found).
- README mentions a Dockerfile as part of the delivered scaffold ("Docker Compose, Dockerfile, Taskfile, Make wrapper, and GitHub Actions workflow") — a Dockerfile for the API service is referenced but was not independently re-verified path-by-path in this synchronization pass.

## What's confirmed absent

No Kubernetes manifests, no cloud-provider IaC, no CD pipeline (CI workflow only runs lint/verify, does not deploy), no TLS termination configuration in-repo (expected to be handled by infrastructure outside this codebase).

## Related notes

- [[Local Development]]
- [[Configuration]]
- [[CI and Quality Gates]]
- [[SakuPlan]]
