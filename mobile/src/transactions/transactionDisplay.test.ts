import { formatSignedRupiah, transactionTypeMeta } from './transactionDisplay'

describe('transactionTypeMeta', () => {
  it('labels income green with a positive sign', () => {
    expect(transactionTypeMeta('income')).toEqual({ label: 'Pemasukan', color: '$primary', sign: 1 })
  })

  it('labels expense red with a negative sign', () => {
    expect(transactionTypeMeta('expense')).toEqual({ label: 'Pengeluaran', color: '$danger', sign: -1 })
  })

  it('labels transfer neutral with no sign', () => {
    expect(transactionTypeMeta('transfer')).toEqual({ label: 'Transfer', color: '$kulit', sign: 0 })
  })

  it('labels adjustment neutral with no sign', () => {
    expect(transactionTypeMeta('adjustment')).toEqual({ label: 'Penyesuaian', color: '$accent', sign: 0 })
  })

  it('labels reversal red with no sign', () => {
    expect(transactionTypeMeta('reversal')).toEqual({ label: 'Pembatalan', color: '$danger', sign: 0 })
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
