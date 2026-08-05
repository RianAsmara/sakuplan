import { ApiError } from './errors'

describe('ApiError', () => {
  it('carries the HTTP status code alongside the message', () => {
    const err = new ApiError('failed_to_create_transaction', 409)
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe('failed_to_create_transaction')
    expect(err.status).toBe(409)
  })
})
