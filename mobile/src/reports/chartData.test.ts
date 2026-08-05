import { toBudgetVsActualBarData, toCategoryBarData, toTrendLines } from './chartData'

describe('toTrendLines', () => {
  it('splits trend points into income and expense line-chart series with short Indonesian date labels', () => {
    const trend = [
      { bucket_start: '2026-08-01T00:00:00Z', income: 100000, expenses: 40000, net: 60000 },
      { bucket_start: '2026-08-02T00:00:00Z', income: 0, expenses: 20000, net: -20000 },
    ]
    const result = toTrendLines(trend)
    expect(result.income).toEqual([
      { value: 100000, label: '1 Agu' },
      { value: 0, label: '2 Agu' },
    ])
    expect(result.expenses).toEqual([
      { value: 40000, label: '1 Agu' },
      { value: 20000, label: '2 Agu' },
    ])
  })
})

describe('toCategoryBarData', () => {
  it('sorts descending by amount and caps to the limit', () => {
    const categories = [
      { category_id: 'a', name: 'Makanan', amount: 200000 },
      { category_id: 'b', name: 'Transport', amount: 500000 },
      { category_id: 'c', name: 'Hiburan', amount: 100000 },
    ]
    const result = toCategoryBarData(categories, '#0E6B58', 2)
    expect(result).toEqual([
      { value: 500000, label: 'Transport', frontColor: '#0E6B58' },
      { value: 200000, label: 'Makanan', frontColor: '#0E6B58' },
    ])
  })
})

describe('toBudgetVsActualBarData', () => {
  it('interleaves a budgeted bar and a color-coded actual bar per category', () => {
    const lines = [
      { category_id: 'a', name: 'Makanan', budgeted: 500000, actual: 400000, variance: 100000 },
      { category_id: 'b', name: 'Transport', budgeted: 300000, actual: 350000, variance: -50000 },
    ]
    const result = toBudgetVsActualBarData(lines, {
      budgeted: '#0E6B58',
      actualOver: '#B23B33',
      actualUnder: '#C9A227',
    })
    expect(result).toEqual([
      { value: 500000, label: 'Makanan', frontColor: '#0E6B58', spacing: 2 },
      { value: 400000, frontColor: '#C9A227', spacing: 20 },
      { value: 300000, label: 'Transport', frontColor: '#0E6B58', spacing: 2 },
      { value: 350000, frontColor: '#B23B33', spacing: 0 },
    ])
  })
})
