import axios, { AxiosError, AxiosHeaders, create as createAxiosClient } from 'axios'
import { installAuthInterceptors, shouldAttemptRefresh, buildRetryConfig } from './refreshInterceptor'
import { useAuthStore } from '../auth/store'
import { getRefreshToken } from '../auth/secureTokens'

jest.mock('../auth/secureTokens')

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

    expect(AxiosHeaders.from(retryConfig.headers).get('Authorization')).toBe(
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

describe('installAuthInterceptors', () => {
  const baseUrl = 'http://example.test'

  beforeEach(() => {
    jest.clearAllMocks()
    useAuthStore.setState({ accessToken: 'old-token', user: null, isHydrating: false })
  })

  it('refreshes once and retries the original request on a 401', async () => {
    ;(getRefreshToken as jest.Mock).mockResolvedValue('refresh-token-1')
    const refreshSpy = jest.spyOn(axios, 'post').mockResolvedValue({
      data: { access_token: 'new-token', refresh_token: 'refresh-token-2', user: { id: 'u1' } },
    } as never)

    let calls = 0
    const client = createAxiosClient({
      baseURL: baseUrl,
      adapter: async (config) => {
        calls += 1
        if (calls === 1) {
          const err = new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
            status: 401,
            data: {},
            statusText: 'Unauthorized',
            headers: {},
            config,
          })
          throw err
        }
        return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config }
      },
    })
    installAuthInterceptors(client, baseUrl)

    const response = await client.get('/v1/me')

    expect(response.data).toEqual({ ok: true })
    expect(calls).toBe(2)
    expect(refreshSpy).toHaveBeenCalledTimes(1)
    expect(refreshSpy).toHaveBeenCalledWith(`${baseUrl}/v1/auth/refresh`, {
      refresh_token: 'refresh-token-1',
    })
  })

  it('does not attempt a second refresh when the retried request also gets a 401', async () => {
    ;(getRefreshToken as jest.Mock).mockResolvedValue('refresh-token-1')
    const refreshSpy = jest.spyOn(axios, 'post').mockResolvedValue({
      data: { access_token: 'new-token', refresh_token: 'refresh-token-2', user: { id: 'u1' } },
    } as never)

    let calls = 0
    const client = createAxiosClient({
      baseURL: baseUrl,
      adapter: async (config) => {
        calls += 1
        const err = new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
          status: 401,
          data: {},
          statusText: 'Unauthorized',
          headers: {},
          config,
        })
        throw err
      },
    })
    installAuthInterceptors(client, baseUrl)

    await expect(client.get('/v1/me')).rejects.toMatchObject({
      response: { status: 401 },
    })

    expect(calls).toBe(2)
    expect(refreshSpy).toHaveBeenCalledTimes(1)
  })
})
