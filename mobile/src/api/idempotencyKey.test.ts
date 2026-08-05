import { generateIdempotencyKey } from './idempotencyKey'

describe('generateIdempotencyKey', () => {
  it('generates a string within the 8-128 char bound required by the API', () => {
    const key = generateIdempotencyKey()
    expect(key.length).toBeGreaterThanOrEqual(8)
    expect(key.length).toBeLessThanOrEqual(128)
  })

  it('generates a different key on every call', () => {
    const keys = new Set(Array.from({ length: 20 }, () => generateIdempotencyKey()))
    expect(keys.size).toBe(20)
  })
})
