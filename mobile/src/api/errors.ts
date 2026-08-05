// Thrown by mutation hooks in place of a bare Error so components can
// branch on HTTP status (e.g. 409 idempotency/overlap conflicts) via
// `error instanceof ApiError && error.status === 409` — openapi-fetch's
// `{ data, error, response }` triple already exposes `response.status`,
// this class just carries it through react-query's `mutation.error`.
export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
