import { AxiosHeaders } from 'axios'
import { shouldAttemptRefresh, buildRetryConfig } from './refreshInterceptor'

describe('shouldAttemptRefresh', () => {
  it('returns true for a 401 status that has not already been retried', () => {
    expect(shouldAttemptRefresh(401, false)).toBe(true)
  })

  it('returns false for a 401 status that has already been retried once', () => {
    expect(shouldAttemptRefresh(401, true)).toBe(false)
  })

  it('returns false for a non-401 status', () => {
    expect(shouldAttemptRefresh(500, false)).toBe(false)
  })

  it('returns false when there is no status (network error, no response)', () => {
    expect(shouldAttemptRefresh(undefined, false)).toBe(false)
  })
})

describe('buildRetryConfig', () => {
  it('sets the Authorization header with the new access token', () => {
    const config = { url: '/v1/me', method: 'get', headers: new AxiosHeaders() }

    const retryConfig = buildRetryConfig(config, 'new-access-token-xyz')

    expect(AxiosHeaders.from(retryConfig.headers as any).get('Authorization')).toBe(
      'Bearer new-access-token-xyz',
    )
  })

  it('marks the config as retried', () => {
    const config = { url: '/v1/budgets', method: 'get', headers: new AxiosHeaders() }

    const retryConfig = buildRetryConfig(config, 'new-token')

    expect(retryConfig._retry).toBe(true)
  })

  it('preserves the request body from the original config', () => {
    const payload = { transaction_id: 'txn_123', amount: 10000 }
    const config = {
      url: '/v1/transactions',
      method: 'post',
      headers: new AxiosHeaders(),
      data: payload,
    }

    const retryConfig = buildRetryConfig(config, 'refreshed-token')

    expect(retryConfig.data).toEqual(payload)
  })
})
