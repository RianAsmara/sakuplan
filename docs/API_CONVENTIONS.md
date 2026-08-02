# API Conventions

## Base path

`/v1`

## Success envelope

```json
{
  "data": {},
  "meta": {}
}
```

`meta` is omitted when empty.

## Error envelope

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "request validation failed",
    "details": [],
    "request_id": "..."
  }
}
```

## Status mapping

- validation: 400
- unauthenticated: 401
- forbidden: 403
- not found: 404
- conflict/idempotency mismatch: 409
- rate limited: 429
- unexpected: 500

## Authentication

`Authorization: Bearer <access-token>`

## Idempotency

Designated monetary mutations require:

`Idempotency-Key: <client-generated-unique-value>`

Keys are scoped by user and operation.

## Dates and money

- Timestamps: RFC3339 UTC.
- Calendar dates: `YYYY-MM-DD`.
- Monetary amounts: JSON integer minor units.
- Floating point amounts are invalid.

## Pagination

Cursor-based:

```json
{
  "data": [],
  "meta": {
    "next_cursor": "..."
  }
}
```
