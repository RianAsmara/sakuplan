# Security Baseline

## Authentication

- Argon2id passwords with configurable memory, iterations, and parallelism.
- Minimum password length 12 for MVP.
- JWT access tokens validate algorithm, issuer, audience, subject, expiry, and token type.
- Refresh tokens are random opaque values; only hashes are persisted.
- Rotation and family revocation are mandatory.

## Authorization

- Every end-user resource is scoped to authenticated `user_id`.
- Admin capabilities use permission checks, not broad `is_admin` shortcuts.
- Sensitive-data access requires reason and audit record.

## Financial integrity

- Integer monetary values.
- SQL transactions for multi-entry writes.
- Idempotency keys and canonical payload hashes.
- Unique constraints prevent duplicate effects.
- Account balances cannot be directly edited.

## API protection

- Request size limits.
- Stable validation errors.
- Security headers.
- Strict CORS allowlist in production.
- Rate limiting on authentication and sensitive paths.
- No stack traces returned to clients.

## Secrets and logs

- `.env` is ignored.
- Logs must redact authorization, cookies, passwords, tokens, and secrets.
- Audit records store filtered metadata.

## Dependency policy

- Pin direct dependencies.
- Run `govulncheck ./...` and Trivy in CI.
- High or critical findings require remediation or documented exception before release.

## AI

- AI is optional.
- Only minimized structured data is sent.
- AI output cannot mutate monetary records directly.
