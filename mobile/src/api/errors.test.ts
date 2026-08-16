import { AxiosError, type AxiosResponse } from 'axios'
import { ApiError, statusFromError } from './errors'

describe('ApiError', () => {
  it('carries the HTTP status code alongside the message', () => {
    const err = new ApiError('failed_to_create_transaction', 409)
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe('failed_to_create_transaction')
    expect(err.status).toBe(409)
  })
})

describe('statusFromError', () => {
  it('returns the response status for an axios error with a response', () => {
    const response = { status: 409 } as AxiosResponse
    const error = new AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, undefined, response)

    expect(statusFromError(error)).toBe(409)
  })

  it('returns the fallback status for an axios error with no response', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK', undefined, undefined, undefined)

    expect(statusFromError(error)).toBe(500)
  })

  it('returns the fallback status for a non-axios error', () => {
    const error = new Error('boom')

    expect(statusFromError(error)).toBe(500)
  })

  it('returns an explicit fallbackStatus of 0 for an axios error with no response', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK', undefined, undefined, undefined)

    expect(statusFromError(error, 0)).toBe(0)
  })
})
