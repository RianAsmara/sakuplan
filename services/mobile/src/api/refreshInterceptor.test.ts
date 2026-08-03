import { shouldAttemptRefresh } from './refreshInterceptor'

describe('shouldAttemptRefresh', () => {
  it('returns true for a 401 response that has not already been retried', () => {
    const response = new Response(null, { status: 401 })
    expect(shouldAttemptRefresh(response, false)).toBe(true)
  })

  it('returns false for a 401 response that has already been retried once', () => {
    const response = new Response(null, { status: 401 })
    expect(shouldAttemptRefresh(response, true)).toBe(false)
  })

  it('returns false for a non-401 response', () => {
    const response = new Response(null, { status: 500 })
    expect(shouldAttemptRefresh(response, false)).toBe(false)
  })
})
