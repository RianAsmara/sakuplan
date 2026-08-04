import { shouldAttemptRefresh, buildRetryRequest } from './refreshInterceptor'

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

describe('buildRetryRequest', () => {
  it('sets the Authorization header with the new access token', () => {
    const originalRequest = new Request('https://api.example.com/v1/me', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    const clonedRequest = originalRequest.clone()
    const newAccessToken = 'new-access-token-xyz'

    const retryRequest = buildRetryRequest(clonedRequest, newAccessToken)

    expect(retryRequest.headers.get('Authorization')).toBe(`Bearer ${newAccessToken}`)
  })

  it('sets the X-Retry-After-Refresh header to mark the retry', () => {
    const originalRequest = new Request('https://api.example.com/v1/budgets', {
      method: 'GET',
    })
    const clonedRequest = originalRequest.clone()

    const retryRequest = buildRetryRequest(clonedRequest, 'new-token')

    expect(retryRequest.headers.get('X-Retry-After-Refresh')).toBe('1')
  })

  it('preserves the request body from a cloned POST request with JSON payload', async () => {
    // Simulate a POST request with a JSON body (e.g., creating a transaction)
    const payload = { transaction_id: 'txn_123', amount: 10000 }
    const originalRequest = new Request('https://api.example.com/v1/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    // Clone before the original body gets consumed
    const clonedRequest = originalRequest.clone()

    // Build retry request from the clone
    const retryRequest = buildRetryRequest(clonedRequest, 'refreshed-token')

    // Verify the cloned body is still readable
    const retryBody = await retryRequest.json()
    expect(retryBody).toEqual(payload)
  })

  it('constructs a retry request that can be fetched without throwing on body consumption', async () => {
    // This tests the exact scenario that failed before the fix:
    // constructing a new Request from a Request whose body has been consumed throws.
    // By cloning before fetch consumes it, buildRetryRequest can safely reconstruct.

    const payload = { user_id: 'user_456', action: 'update_budget' }
    const originalRequest = new Request('https://api.example.com/v1/budgets/budget_789', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    // Clone the request before fetch would consume it (this is what onRequest does)
    const clonedRequest = originalRequest.clone()

    // Simulate what fetch does to the original request
    await originalRequest.json()
    expect(originalRequest.bodyUsed).toBe(true)

    // Clone should still be fresh and unconsumed
    expect(clonedRequest.bodyUsed).toBe(false)

    // buildRetryRequest should successfully construct from the unconsume clone
    const retryRequest = buildRetryRequest(clonedRequest, 'new-token')

    // Verify the retry request has the new token and the original body is preserved
    expect(retryRequest.headers.get('Authorization')).toBe('Bearer new-token')
    const retryBody = await retryRequest.json()
    expect(retryBody).toEqual(payload)
  })
})
