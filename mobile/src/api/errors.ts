import { isAxiosError } from 'axios'

// Thrown by mutation hooks in place of a bare Error so components can
// branch on HTTP status (e.g. 409 idempotency/overlap conflicts) via
// `error instanceof ApiError && error.status === 409`.
export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// Extracts the HTTP status from a caught axios error, falling back to
// `fallbackStatus` for non-axios errors or responses with no status
// (network failures, timeouts).
export function statusFromError(error: unknown, fallbackStatus = 500): number {
  return isAxiosError(error) ? (error.response?.status ?? fallbackStatus) : fallbackStatus
}
