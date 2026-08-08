import { nextBillOccurrence } from './nextBillOccurrence'

describe('nextBillOccurrence', () => {
  it('returns this month\'s occurrence when the due day is still ahead', () => {
    const now = new Date(2026, 7, 4) // 4 Aug 2026
    expect(nextBillOccurrence(10, now)).toEqual(new Date(2026, 7, 10))
  })

  it('rolls over to next month when the due day already passed', () => {
    const now = new Date(2026, 7, 20) // 20 Aug 2026
    expect(nextBillOccurrence(10, now)).toEqual(new Date(2026, 8, 10))
  })

  it('treats today as the occurrence, not overdue', () => {
    const now = new Date(2026, 7, 4)
    expect(nextBillOccurrence(4, now)).toEqual(new Date(2026, 7, 4))
  })

  it('clamps a day-of-month beyond a short month\'s length', () => {
    const now = new Date(2026, 1, 1) // 1 Feb 2026 (28 days, not a leap year)
    expect(nextBillOccurrence(31, now)).toEqual(new Date(2026, 1, 28))
  })

  it('rolls a December-clamped occurrence into January of the next year', () => {
    const now = new Date(2026, 11, 15) // 15 Dec 2026
    expect(nextBillOccurrence(10, now)).toEqual(new Date(2027, 0, 10))
  })
})
