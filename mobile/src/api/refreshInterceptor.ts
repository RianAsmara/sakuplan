import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'
import { useAuthStore } from '../auth/store'
import { clearRefreshToken, getRefreshToken, saveRefreshToken } from '../auth/secureTokens'
import type { components } from './generated/types'

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

export function shouldAttemptRefresh(status: number | undefined, alreadyRetried: boolean): boolean {
  return status === 401 && !alreadyRetried
}

async function refreshSession(baseUrl: string): Promise<string | null> {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) return null

  try {
    const { data } = await axios.post<components['schemas']['TokenPair']>(
      `${baseUrl}/v1/auth/refresh`,
      { refresh_token: refreshToken },
    )
    await saveRefreshToken(data.refresh_token)
    useAuthStore.getState().setSession(data.access_token, data.user)
    return data.access_token
  } catch {
    // Treat any failure (invalid/expired token, network error, malformed
    // response, etc.) as a failed refresh - the caller clears the session
    // either way.
    return null
  }
}

export function buildRetryConfig(config: RetryableConfig, newAccessToken: string): RetryableConfig {
  const headers = AxiosHeaders.from(config.headers) as AxiosHeaders
  headers.set('Authorization', `Bearer ${newAccessToken}`)
  return { ...config, headers, _retry: true }
}

export function installAuthInterceptors(client: AxiosInstance, baseUrl: string): void {
  client.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`)
    }
    return config
  })

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as RetryableConfig | undefined
      const alreadyRetried = config?._retry === true
      if (!config || !shouldAttemptRefresh(error.response?.status, alreadyRetried)) {
        return Promise.reject(error)
      }

      const newAccessToken = await refreshSession(baseUrl)
      if (!newAccessToken) {
        await clearRefreshToken()
        useAuthStore.getState().clearSession()
        return Promise.reject(error)
      }

      return client(buildRetryConfig(config, newAccessToken))
    },
  )
}
