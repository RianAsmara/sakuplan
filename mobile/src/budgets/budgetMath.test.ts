import { computeUnallocated, sumAllocations } from './budgetMath'

describe('sumAllocations', () => {
  it('sums all values in the allocation map', () => {
    expect(sumAllocations({ a: 100000, b: 250000 })).toBe(350000)
  })

  it('returns 0 for an empty map', () => {
    expect(sumAllocations({})).toBe(0)
  })
})

describe('computeUnallocated', () => {
  it('subtracts savings, buffer, and allocations from expected income', () => {
    expect(computeUnallocated(5000000, 500000, 300000, { food: 1000000, transport: 500000 })).toBe(2700000)
  })

  it('goes negative when allocations exceed what is available', () => {
    expect(computeUnallocated(1000000, 0, 0, { food: 1500000 })).toBe(-500000)
  })
})
