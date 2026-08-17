import { formatRupiah, parseRupiahInput } from './money'

describe('formatRupiah', () => {
  it('formats a positive amount with thousands separators', () => {
    expect(formatRupiah(1234567)).toBe('Rp1.234.567')
  })

  it('formats a negative amount with a leading minus before Rp', () => {
    expect(formatRupiah(-5000)).toBe('-Rp5.000')
  })

  it('formats zero', () => {
    expect(formatRupiah(0)).toBe('Rp0')
  })

  it('rounds fractional input to the nearest whole unit', () => {
    expect(formatRupiah(1000.6)).toBe('Rp1.001')
  })

  it('formats a value with a middle group of all zeros', () => {
    expect(formatRupiah(100000000)).toBe('Rp100.000.000')
  })

  it('formats an exact multiple-of-3-digits value without a leading separator', () => {
    expect(formatRupiah(100)).toBe('Rp100')
  })
})

describe('parseRupiahInput', () => {
  it('parses a thousands-separated string to minor units', () => {
    expect(parseRupiahInput('150.000')).toBe(150000)
  })

  it('ignores a leading Rp prefix and spaces', () => {
    expect(parseRupiahInput('Rp 1.234.567')).toBe(1234567)
  })

  it('returns 0 for an empty string', () => {
    expect(parseRupiahInput('')).toBe(0)
  })

  it('returns 0 for a string with no digits', () => {
    expect(parseRupiahInput('abc')).toBe(0)
  })
})
