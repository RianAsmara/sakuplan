import { formatRupiah } from './money'

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
})
