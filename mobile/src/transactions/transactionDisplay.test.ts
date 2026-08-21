import { formatSignedRupiah, transactionTypeMeta } from './transactionDisplay'

describe('transactionTypeMeta', () => {
  it('labels income terjaga with a positive sign', () => {
    expect(transactionTypeMeta('income')).toEqual({ label: 'Pemasukan', color: '$terjaga', sign: 1 })
  })

  it('labels expense tinta with a negative sign', () => {
    expect(transactionTypeMeta('expense')).toEqual({ label: 'Pengeluaran', color: '$tinta', sign: -1 })
  })

  it('labels transfer neutral with no sign', () => {
    expect(transactionTypeMeta('transfer')).toEqual({ label: 'Transfer', color: '$kulit', sign: 0 })
  })

  it('labels adjustment neutral with no sign', () => {
    expect(transactionTypeMeta('adjustment')).toEqual({ label: 'Penyesuaian', color: '$kulit', sign: 0 })
  })

  it('labels reversal peringatan with no sign', () => {
    expect(transactionTypeMeta('reversal')).toEqual({ label: 'Pembatalan', color: '$peringatan', sign: 0 })
  })
})

describe('formatSignedRupiah', () => {
  it('prefixes expense amounts with a minus', () => {
    expect(formatSignedRupiah('expense', 50000)).toBe('-Rp50.000')
  })

  it('prefixes income amounts with a plus', () => {
    expect(formatSignedRupiah('income', 50000)).toBe('+Rp50.000')
  })

  it('leaves transfer/adjustment amounts unsigned', () => {
    expect(formatSignedRupiah('transfer', 50000)).toBe('Rp50.000')
  })
})
